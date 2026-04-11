import { Planner } from './planner.js';
import { TaskManager } from './taskManager.js';
import { WorkerAgent } from './worker.js';
import { ReviewerAgent } from './reviewer.js';
import { EditorAgent } from './editor.js';
import { GlobalState, ProviderConfig, WaveTask, WorkerOutput } from '../types.js';
import { MemoryManager } from '../utils/memory.js';
import { rightAlignedLog } from '../utils/ui.js';
import { validateTaskGraph } from './taskValidator.js';
import { getProjectSummaryString } from '../utils/semanticAnalyzer.js';
import { checkCrossFileConsistency } from '../utils/consistencyChecker.js';
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


    // STEP 1: SMART MEMORY FILTERING
 
    spinner.message('[MEMORY] Loading filtered context...');
    const filteredMemory = this.memory.getFilteredContextString();

    // STEP 2: RESUME & CONTINUE BUILDS

    const completedIds = new Set<string>();
    const failedIds = new Set<string>();
    let resumedSession = false;

    if (config.activeProject) {
      const resumable = this.memory.findResumableSession(config.activeProject);

      if (resumable && (resumable.failedTasks.length > 0 || resumable.pendingTasks.length > 0)) {
        spinner.stop('Previous incomplete build detected.');

        prompt.log.info(chalk.bold.yellow('📋 Previous Build Found'));
        console.log(`  Project: ${chalk.cyan(resumable.projectName)}`);
        console.log(`  Completed: ${chalk.green(resumable.completedTasks.length.toString())}/${resumable.totalTasks}`);
        if (resumable.failedTasks.length > 0) {
          console.log(`  Failed: ${chalk.red(resumable.failedTasks.join(', '))}`);
        }
        if (resumable.pendingTasks.length > 0) {
          console.log(`  Pending: ${chalk.yellow(resumable.pendingTasks.join(', '))}`);
        }
        console.log(`  From: ${chalk.dim(resumable.timestamp)}`);

        const shouldResume = await prompt.confirm({
          message: `Resume from last build? (Skip ${resumable.completedTasks.length} completed tasks)`,
          initialValue: true,
        });

        if (shouldResume && !prompt.isCancel(shouldResume)) {
          // Pre-populate completed tasks from the previous session
          for (const taskId of resumable.completedTasks) {
            completedIds.add(taskId);
            state.taskRegistry[taskId] = {
              status: 'completed',
              agent: resumable.taskRegistry[taskId]?.agent || 'resumed',
              retryCount: 0,
              result: resumable.taskRegistry[taskId]?.result || '',
            };
          }
          resumedSession = true;
          prompt.log.success(`Resuming — skipping ${completedIds.size} completed tasks.`);
          spinner.start('[PLANNER] Generating task graph...');
        } else {
          spinner.start('[PLANNER] Generating fresh task graph...');
        }
      } else {
        spinner.start('[PLANNER] Generating task graph...');
      }
    } else {
      spinner.start('[PLANNER] Generating task graph...');
    }

    // STEP 3: SEMANTIC CODE UNDERSTANDING

    let workspaceContext = "";
    let semanticSummary = "";

    if (config.activeProject) {
       const projectPath = join(process.cwd(), "workspace", config.activeProject);
       if (fs.existsSync(projectPath)) {
         const fileTree = getDirectoryTree(projectPath);
         workspaceContext = `EXISTING PROJECT ARCHITECTURE:\n${JSON.stringify(fileTree, null, 2)}\nIMPORTANT: Edit the existing files instead of creating new ones if they already exist to achieve the goal.\n`;

         // Semantic analysis for richer context
         semanticSummary = getProjectSummaryString(projectPath);
         if (semanticSummary) {
           workspaceContext += `\nPROJECT ANALYSIS:\n${semanticSummary}\n`;
         }
       }
    }

    // STEP 4: PLANNER — Generate task graph
    spinner.message('[PLANNER] Generating task graph...');
    const graph = await this.planner.createPlan(request, config, filteredMemory, workspaceContext);
    
    if (config.activeProject) {
        graph.projectName = config.activeProject;
    }

    spinner.stop('Task Graph generated.');

    if (graph.projectName) {
      prompt.log.info(`Project: ${chalk.cyan(graph.projectName)}`);
    }

    // STEP 5: TASK VALIDATION
    const validation = validateTaskGraph(graph);

    // Show warnings if any
    if (validation.warnings.length > 0) {
      prompt.log.warn(chalk.bold.yellow('⚠ Task Validation Warnings:'));
      for (const warning of validation.warnings) {
        console.log(`  ${chalk.yellow('•')} ${warning}`);
      }
    }

    // Remove rejected tasks from graph
    if (validation.rejected.length > 0) {
      prompt.log.error(`Rejected ${validation.rejected.length} invalid tasks:`);
      for (const task of validation.rejected) {
        console.log(`  ${chalk.red('✗')} ${task.id}: ${task.description || '(no description)'}`);
      }
      graph.tasks = validation.valid;
    }

    if (graph.tasks.length === 0) {
      prompt.log.error('No valid tasks to execute after validation.');
      return;
    }

    // STEP 6: SHOW PLAN + CONFIRMATION
    if (graph.tasks.length > 0) {
      prompt.log.info(chalk.dim('─── Task Plan ───'));
      for (const task of graph.tasks) {
        const deps = task.dependencies.length > 0 ? chalk.dim(` (depends: ${task.dependencies.join(', ')})`) : '';
        const file = task.fileOutput ? chalk.green(` → ${task.fileOutput}`) : '';
        const skipped = completedIds.has(task.id) ? chalk.dim(' [SKIP — already done]') : '';
        prompt.log.info(`  ${chalk.bold(task.id)}: ${task.description}${file}${deps}${skipped}`);
      }
    }

    // Show how many tasks will actually run
    const tasksToRun = graph.tasks.filter(t => !completedIds.has(t.id)).length;
    const confirmMsg = resumedSession
      ? `Execute ${tasksToRun} remaining tasks? (${completedIds.size} skipped)`
      : `Execute ${graph.tasks.length} tasks?`;

    const confirm = await prompt.confirm({
      message: confirmMsg,
      initialValue: true
    });

    if (!confirm || prompt.isCancel(confirm)) {
      prompt.cancel('Execution aborted by user.');
      return;
    }

    // STEP 7: EXECUTE WITH ADVANCED FEATURES
    spinner.start('[TASK MANAGER] Beginning dynamic execution...');
    
    // Calculate map of all files that will be created
    const directoryManifest = graph.tasks
      .map(t => t.fileOutput)
      .filter((file): file is string => !!file);

    // Collect commands to show user at the end
    const commandsToRun: string[] = [];

    const inProgress = new Map<string, Promise<WorkerOutput>>();

    // Track failures for the failure report
    const failureReport: { taskId: string; error: string; suggestion: string }[] = [];

    spinner.stop('Executing dynamically based on dependencies...');

    while (completedIds.size + failedIds.size < graph.tasks.length) {
      const { runnable, newlyFailed, deferredConflicts } = this.taskManager.getRunnableTasks(
        graph, 
        completedIds, 
        failedIds, 
        new Set(inProgress.keys())
      );
      
      // Log deferred conflicts
      for (const def of deferredConflicts) {
        prompt.log.info(`  ${chalk.dim('⏳')} ${def}: Deferred (file conflict — waiting for sequential access)`);
      }

      for (const f of newlyFailed) {
        failedIds.add(f);
        state.taskRegistry[f] = { 
          status: 'failed', 
          agent: 'system', 
          retryCount: 0, 
          result: '',
          lastError: 'Dependency failed',
        };
        prompt.log.error(`  ${chalk.red('✗')} ${f}: Skipped (Dependency failed)`);

        failureReport.push({
          taskId: f,
          error: 'Dependency failed',
          suggestion: 'Fix the upstream dependency task first.',
        });
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
            // ── FAILURE RECOVERY: Retry once with correction ──
            const errorMsg = result.errors?.join(', ') || 'Unknown error';
            prompt.log.warn(`  ${chalk.yellow('🔄')} ${result.task_id}: Failed — attempting recovery retry...`);

            try {
              const retryResult = await this.worker.execute(
                task,
                desc,
                context,
                config,
                request,
                graph.projectName,
                tDef?.fileOutput,
                directoryManifest,
                existingCode,
                2, // Retry attempt
                3,
                errorMsg // Pass error context
              );

              if (retryResult.status === 'completed') {
                // Recovery succeeded!
                state.taskRegistry[result.task_id] = {
                  status: 'completed',
                  agent: retryResult.agent,
                  retryCount: 1,
                  result: retryResult.result,
                };
                completedIds.add(result.task_id);
                prompt.log.success(`  ${chalk.green('✓')} ${result.task_id}: Recovery succeeded!`);
                result = retryResult; // Use recovered result for downstream
              } else {
                // Recovery also failed — log and continue
                failedIds.add(result.task_id);
                state.taskRegistry[result.task_id] = {
                  status: 'failed',
                  agent: result.agent,
                  retryCount: 1,
                  result: '',
                  lastError: errorMsg,
                };
                failureReport.push({
                  taskId: result.task_id,
                  error: errorMsg,
                  suggestion: this.suggestFix(errorMsg, desc),
                });
                prompt.log.error(`  ${chalk.red('✗')} ${result.task_id}: Recovery failed. Continuing other tasks.`);
              }
            } catch {
              // Recovery attempt threw — mark failed and continue
              failedIds.add(result.task_id);
              state.taskRegistry[result.task_id] = {
                status: 'failed',
                agent: result.agent,
                retryCount: 1,
                result: '',
                lastError: errorMsg,
              };
              failureReport.push({
                taskId: result.task_id,
                error: errorMsg,
                suggestion: this.suggestFix(errorMsg, desc),
              });
            }
          }

          if (result.outputType === 'command' && result.result.trim().length > 0) {
            commandsToRun.push(result.result.trim());
          }

          // Evaluate self-correction loop
          if (result.outputType === 'code' && result.status === 'completed' && result.artifacts && result.artifacts.length > 0) {
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
              const fsSync = require('fs');
              fsSync.writeFileSync(currentArtifactPath, currentCode, 'utf-8');

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
      if (inProgress.size > 0 && runnable.length === 0 && newlyFailed.length === 0 && deferredConflicts.length === 0) {
        await Promise.race(inProgress.values());
      } else if (inProgress.size === 0 && runnable.length === 0 && newlyFailed.length === 0 && deferredConflicts.length === 0) {
        prompt.log.error("Stalemate: Cannot resolve further tasks due to missing dependencies or cycles.");
        break;
      }
    }

    prompt.log.success(`Execution completed!`);

    // STEP 8a: OUTPUT CONSISTENCY CHECK
    if (graph.projectName) {
      const projectPath = join(process.cwd(), "workspace", graph.projectName);
      if (fs.existsSync(projectPath)) {
        const report = checkCrossFileConsistency(directoryManifest, projectPath);

        if (report.issues.length > 0) {
          console.log();
          prompt.log.warn(chalk.bold.yellow('🔗 Consistency Check — Broken References:'));
          for (const issue of report.issues) {
            console.log(`  ${chalk.red('•')} ${issue.file}:${issue.line} → ${chalk.dim(issue.reference)}`);
            console.log(`    ${chalk.dim(issue.suggestion)}`);
          }
          console.log(`  ${chalk.dim(`Checked ${report.checkedFiles} files, ${report.passedFiles} clean.`)}`);
        } else if (report.checkedFiles > 0) {
          prompt.log.success(`🔗 Consistency check passed (${report.checkedFiles} files, all references valid).`);
        }
      }
    }

    // STEP 8b: FAILURE REPORT
    if (failureReport.length > 0) {
      console.log();
      prompt.log.error(chalk.bold.red(`❌ Failure Report — ${failureReport.length} task(s) failed:`));
      console.log(chalk.dim('┌─────────────────────────────────────────'));
      for (const failure of failureReport) {
        console.log(`│  ${chalk.red.bold(failure.taskId)}`);
        console.log(`│    Error: ${chalk.dim(failure.error)}`);
        console.log(`│    Fix: ${chalk.cyan(failure.suggestion)}`);
      }
      console.log(chalk.dim('└─────────────────────────────────────────'));
    }

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

    // STEP 8c: SAVE FILTERED MEMORY
    this.memory.saveMemory({
      timestamp: new Date().toISOString(),
      request,
      graph,
      results: state.taskRegistry
    });
  }

 
    //Suggest a fix strategy based on the error message and task description.
   
  private suggestFix(error: string, taskDesc: string): string {
    const lowerError = error.toLowerCase();

    if (lowerError.includes('timeout') || lowerError.includes('econnrefused') || lowerError.includes('network')) {
      return 'Check API connectivity (is your LLM provider running?)';
    }
    if (lowerError.includes('rate limit') || lowerError.includes('429')) {
      return 'Rate limited — wait a few seconds and retry, or switch to a different model.';
    }
    if (lowerError.includes('json') || lowerError.includes('parse')) {
      return 'LLM returned malformed output. Try simplifying the task description.';
    }
    if (lowerError.includes('token') || lowerError.includes('context length')) {
      return 'Task is too complex — break it into smaller sub-tasks.';
    }
    if (lowerError.includes('permission') || lowerError.includes('access')) {
      return 'File permission error — check workspace write access.';
    }

    return `Try simplifying task "${taskDesc.substring(0, 40)}..." or using a more capable model.`;
  }
}
