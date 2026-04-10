import { Planner } from './planner.js';
import { TaskManager } from './taskManager.js';
import { WorkerAgent } from './worker.js';
import { ReviewerAgent } from './reviewer.js';
import { EditorAgent } from './editor.js';
import { GlobalState, ProviderConfig, WaveTask, WorkerOutput } from '../types.js';
import { MemoryManager } from '../utils/memory.js';
import { rightAlignedLog } from '../utils/ui.js';
import * as prompt from '@clack/prompts';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { join } from 'path';

import { getDirectoryTree } from '../utils/fs.js';
import * as fs from 'fs';

export class Coordinator {
  private planner = new Planner();
  private taskManager = new TaskManager();
  private worker = new WorkerAgent();
  private reviewer = new ReviewerAgent();
  private editor = new EditorAgent();
  private memory = new MemoryManager();

  async processRequest(request: string, spinner: any, config: ProviderConfig): Promise<void> {
    // Reset state for each new request to avoid stale data
    const state: GlobalState = {
      taskRegistry: {},
      fileManifest: {}
    };

    spinner.message('[PLANNER] Generating task graph...');
    const memorySummary = this.memory.getMemorySummary();
    
    // Feature: Workspace Context Awareness
    let workspaceContext = "";
    if (config.activeProject) {
       const projectPath = join(process.cwd(), "workspace", config.activeProject);
       if (fs.existsSync(projectPath)) {
         const fileTree = getDirectoryTree(projectPath);
         workspaceContext = `EXISTING PROJECT ARCHITECTURE:\n${JSON.stringify(fileTree, null, 2)}\nIMPORTANT: Edit the existing files instead of creating new ones if they already exist to achieve the goal.\n`;
       }
    }

    const graph = await this.planner.createPlan(request, config, memorySummary, workspaceContext);
    
    if (config.activeProject) {
        graph.projectName = config.activeProject;
    }

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

        // If the file already exists, read it so the Worker edits it instead of overwriting it
        let existingCode: string | undefined = undefined;
        if (graph.projectName && tDef?.fileOutput) {
           const targetPath = join(process.cwd(), "workspace", graph.projectName, tDef.fileOutput);
           if (fs.existsSync(targetPath)) {
               existingCode = fs.readFileSync(targetPath, "utf-8");
               prompt.log.info(`  ${chalk.dim('↑')} ${task.task_id}: Reading existing file ${tDef.fileOutput}`);
           }
        }

        const executePromise = this.worker.execute(
          task, 
          desc, 
          context, 
          config, 
          request, // Global Objective
          graph.projectName, 
          tDef?.fileOutput, 
          directoryManifest, 
          existingCode, // Pass existing code for editing
          1, 
          3
        ).then(async result => {
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

          // Evaluate self-correction loop
          if (result.outputType === 'code' && result.artifacts && result.artifacts.length > 0) {
            prompt.log.info(`  ${chalk.dim('🔍')} ${result.task_id}: Reviewing generated code...`);
            let currentCode = result.result;
            let currentArtifactPath = result.artifacts[0];
            
            let retryCount = 0;
            const MAX_VERIFICATION_RETRIES = 2; // Keep loop short

            while (retryCount < MAX_VERIFICATION_RETRIES) {
              const reviewInstructions = await this.reviewer.evaluate(request, desc, currentCode, config);
              if (reviewInstructions.length === 0) {
                 prompt.log.success(`  ${chalk.green('✓')} ${result.task_id}: Code verified as correct.`);
                 break; // Passed checks
              }

              prompt.log.warn(`  ${chalk.yellow('⚠')} ${result.task_id}: Issues found (Attempt ${retryCount+1}/${MAX_VERIFICATION_RETRIES}). Editing...`);
              for (const instr of reviewInstructions) {
                 prompt.log.message(`    ${chalk.dim('Fix needed:')} ${instr.issue}`);
              }

              // Editor patches the array
              currentCode = await this.editor.patch(currentCode, reviewInstructions, config);

              // Save the patched code back to disk
              const fs = require('fs');
              fs.writeFileSync(currentArtifactPath, currentCode, 'utf-8');

              retryCount++;
            }
            if (retryCount >= MAX_VERIFICATION_RETRIES) {
              prompt.log.warn(`  ${chalk.yellow('⚠')} ${result.task_id}: Max verification retries reached for edits.`);
            }
          } else if (result.status === 'failed') {
            prompt.log.error(`  ${chalk.red('✗')} ${result.task_id}: ${result.errors?.join(', ') || 'Failed'}`);
          } else if (result.outputType === 'command') {
            prompt.log.info(`  ${chalk.yellow('⚡')} ${result.task_id}: Command detected (will show below)`);
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
