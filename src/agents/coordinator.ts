import { Planner } from './planner.js';
import { TaskManager } from './taskManager.js';
import { WorkerAgent } from './worker.js';
import { GlobalState, ProviderConfig, WaveTask, WorkerOutput } from '../types.js';
import { MemoryManager } from '../utils/memory.js';
import { rightAlignedLog } from '../utils/ui.js';
import * as prompt from '@clack/prompts';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { join } from 'path';

export class Coordinator {
  private planner = new Planner();
  private taskManager = new TaskManager();
  private worker = new WorkerAgent();
  private memory = new MemoryManager();

  async processRequest(request: string, spinner: any, config: ProviderConfig): Promise<void> {
    // Reset state for each new request to avoid stale data
    const state: GlobalState = {
      taskRegistry: {},
      fileManifest: {}
    };

    spinner.message('[PLANNER] Generating task graph...');
    const memorySummary = this.memory.getMemorySummary();
    const graph = await this.planner.createPlan(request, config, memorySummary);

    spinner.stop('Task Graph generated.');

    if (graph.projectName) {
      prompt.log.info(`Project: ${chalk.cyan(graph.projectName)}`);
    }

    // Show task overview
    if (graph.tasks.length > 0) {
      prompt.log.info(chalk.dim('─── Task Plan ───'));
      for (const task of graph.tasks) {
        const deps = task.dependencies.length > 0 ? chalk.dim(` (depends: ${task.dependencies.join(', ')})`) : '';
        const file = task.fileOutput ? chalk.green(` → ${task.fileOutput}`) : '';
        prompt.log.info(`  ${chalk.bold(task.id)}: ${task.description}${file}${deps}`);
      }
    }

    const confirm = await prompt.confirm({
      message: `Execute ${graph.tasks.length} tasks?`,
      initialValue: true
    });

    if (!confirm || prompt.isCancel(confirm)) {
      prompt.cancel('Execution aborted by user.');
      return;
    }

    spinner.start('[TASK MANAGER] Beginning dynamic execution...');
    
    // Calculate map of all files that will be created
    const directoryManifest = graph.tasks
      .map(t => t.fileOutput)
      .filter((file): file is string => !!file);

    // Collect commands to show user at the end
    const commandsToRun: string[] = [];

    const completedIds = new Set<string>();
    const failedIds = new Set<string>();
    const inProgress = new Map<string, Promise<WorkerOutput>>();

    spinner.stop('Executing dynamically based on dependencies...');

    while (completedIds.size + failedIds.size < graph.tasks.length) {
      const { runnable, newlyFailed } = this.taskManager.getRunnableTasks(
        graph, 
        completedIds, 
        failedIds, 
        new Set(inProgress.keys())
      );
      
      for (const f of newlyFailed) {
        failedIds.add(f);
        state.taskRegistry[f] = { 
          status: 'failed', 
          agent: 'system', 
          retryCount: 0, 
          result: '' 
        };
        prompt.log.error(`  ${chalk.red('✗')} ${f}: Skipped (Dependency failed)`);
      }

      for (const task of runnable) {
        const tDef = graph.tasks.find(t => t.id === task.task_id);
        const desc = tDef ? tDef.description : 'Execute ' + task.task_id;

        let logMsg = desc.substring(0, 50);
        if (tDef && tDef.fileOutput) {
          logMsg = `[WRITE] ${tDef.fileOutput}`;
        }

        rightAlignedLog(logMsg, `[${task.agent}]`);

        // Build context from dependencies
        const context: Record<string, any> = {};
        if (tDef && tDef.dependencies) {
          for (const dep of tDef.dependencies) {
            // deep copy to avoid mutations
            const depRes = state.taskRegistry[dep]?.result || 'No output.';
            context[dep] = JSON.parse(JSON.stringify(depRes));
          }
        }

        const executePromise = this.worker.execute(
          task, 
          desc, 
          context, 
          config, 
          graph.projectName, 
          tDef?.fileOutput, 
          directoryManifest, 
          1, 
          3
        ).then(result => {
          inProgress.delete(task.task_id);
          
          state.taskRegistry[result.task_id] = {
            status: result.status,
            agent: result.agent,
            retryCount: 0,
            result: result.result
          };

          if (result.status === 'completed') {
            completedIds.add(result.task_id);
          } else {
            failedIds.add(result.task_id);
          }

          if (result.outputType === 'command' && result.result.trim().length > 0) {
            commandsToRun.push(result.result.trim());
          }

          // Show per-task status asynchronously as they finish
          if (result.status === 'failed') {
            prompt.log.error(`  ${chalk.red('✗')} ${result.task_id}: ${result.errors?.join(', ') || 'Failed'}`);
          } else if (result.outputType === 'command') {
            prompt.log.info(`  ${chalk.yellow('⚡')} ${result.task_id}: Command detected (will show below)`);
          } else if (result.artifacts && result.artifacts.length > 0) {
            prompt.log.success(`  ${chalk.green('✓')} ${result.task_id}: ${result.artifacts[0]}`);
          } else {
            prompt.log.success(`  ${chalk.green('✓')} ${result.task_id}: Done`);
          }

          return result;
        });

        inProgress.set(task.task_id, executePromise);
      }

      // Wait if tasks are running but no new tasks can be scheduled yet
      if (inProgress.size > 0 && runnable.length === 0 && newlyFailed.length === 0) {
        await Promise.race(inProgress.values());
      } else if (inProgress.size === 0 && runnable.length === 0 && newlyFailed.length === 0) {
        prompt.log.error("Stalemate: Cannot resolve further tasks due to missing dependencies or cycles.");
        break;
      }
    }

    prompt.log.success(`Execution completed!`);

    // Show collected commands to user
    if (commandsToRun.length > 0) {
      console.log();
      prompt.log.warn(chalk.bold.yellow('📋 Commands suggested by AI:'));
      console.log(chalk.dim('┌─────────────────────────────────────────'));
      const activeProjectName = graph.projectName || 'project';
      for (const cmd of commandsToRun) {
        for (const line of cmd.split('\n')) {
          if (line.trim()) {
            console.log(`│  ${chalk.cyan('$')} ${chalk.bold(line.trim())}`);
          }
        }
      }
      console.log(chalk.dim('└─────────────────────────────────────────'));
      console.log();

      const runCommands = await prompt.confirm({
        message: 'Would you like to run these commands automatically?',
        initialValue: true,
      });

      if (runCommands && !prompt.isCancel(runCommands)) {
        const projectDir = graph.projectName ? join(process.cwd(), "workspace", graph.projectName) : process.cwd();
        for (const cmd of commandsToRun) {
          try {
            prompt.log.info(chalk.dim(`Executing: ${cmd}`));
            execSync(cmd, { cwd: projectDir, stdio: 'inherit' });
          } catch (e: any) {
            prompt.log.error(`Failed to execute command: ${cmd}`);
          }
        }
        prompt.log.success('All commands executed.');
      } else {
        prompt.log.info(chalk.dim('Skipped executing commands.'));
      }
    }

    // Save to memory
    this.memory.saveMemory({
      timestamp: new Date().toISOString(),
      request,
      graph,
      results: state.taskRegistry
    });
  }
}
