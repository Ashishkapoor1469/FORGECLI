import { Planner } from './planner.js';
import { TaskManager } from './taskManager.js';
import { WorkerAgent } from './worker.js';
import { GlobalState, ProviderConfig } from '../types.js';
import { MemoryManager } from '../utils/memory.js';
import { rightAlignedLog } from '../utils/ui.js';
import * as prompt from '@clack/prompts';
import chalk from 'chalk';

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

    spinner.start('[TASK MANAGER] Scheduling execution waves...');
    const schedule = this.taskManager.scheduleWaves(graph);
    spinner.stop(`${schedule.waves.length} wave(s) scheduled.`);

    // Calculate map of all files that will be created
    const directoryManifest = graph.tasks
      .map(t => t.fileOutput)
      .filter((file): file is string => !!file);

    // Collect commands to show user at the end
    const commandsToRun: string[] = [];

    let waveCount = 1;
    for (const wave of schedule.waves) {
      prompt.log.info(`${chalk.bold(`[WAVE ${waveCount}/${schedule.waves.length}]`)} Executing ${wave.tasks.length} task(s) in parallel...`);

      // Run LLM calls in parallel
      const executionPromises = wave.tasks.map(async task => {
        const tDef = graph.tasks.find(t => t.id === task.task_id);
        const desc = tDef ? tDef.description : 'Execute ' + task.task_id;

        let logMsg = desc.substring(0, 50);
        if (tDef && tDef.fileOutput) {
          logMsg = `[WRITE] ${tDef.fileOutput}`;
        }

        rightAlignedLog(logMsg, `[${task.agent}]`);

        const context: Record<string, any> = {};
        if (tDef && tDef.dependencies) {
          for (const dep of tDef.dependencies) {
            context[dep] = state.taskRegistry[dep]?.result || 'No output.';
          }
        }

        return this.worker.execute(task, desc, context, config, graph.projectName, tDef?.fileOutput, directoryManifest, request);
      });

      const results = await Promise.all(executionPromises);

      // Process results
      for (const result of results) {
        state.taskRegistry[result.task_id] = {
          status: result.status,
          agent: result.agent,
          retryCount: 0,
          result: result.result
        };

        // If it's a command, collect it to show user
        if (result.outputType === 'command' && result.result.trim().length > 0) {
          commandsToRun.push(result.result.trim());
        }

        // Show per-task status
        if (result.status === 'failed') {
          prompt.log.error(`  ${chalk.red('✗')} ${result.task_id}: ${result.errors.join(', ')}`);
        } else if (result.outputType === 'command') {
          prompt.log.info(`  ${chalk.yellow('⚡')} ${result.task_id}: Command detected (will show below)`);
        } else if (result.artifacts.length > 0) {
          prompt.log.success(`  ${chalk.green('✓')} ${result.task_id}: ${result.artifacts[0]}`);
        } else {
          prompt.log.success(`  ${chalk.green('✓')} ${result.task_id}: Done`);
        }
      }

      prompt.log.success(`Wave ${waveCount} completed!`);
      waveCount++;
    }

    // Show collected commands to user
    if (commandsToRun.length > 0) {
      console.log();
      prompt.log.warn(chalk.bold.yellow('📋 Commands to run manually:'));
      console.log(chalk.dim('┌─────────────────────────────────────────'));
      for (const cmd of commandsToRun) {
        for (const line of cmd.split('\n')) {
          if (line.trim()) {
            console.log(`│  ${chalk.cyan('$')} ${chalk.bold(line.trim())}`);
          }
        }
      }
      console.log(chalk.dim('└─────────────────────────────────────────'));
      console.log();
      prompt.log.info(chalk.dim('Copy and run these commands in your project directory.'));
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
