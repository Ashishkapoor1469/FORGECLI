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
  
  private state: GlobalState = {
    taskRegistry: {},
    fileManifest: {}
  };

  async processRequest(request: string, spinner: any, config: ProviderConfig): Promise<void> {
    spinner.message('[PLANNER] Generating task graph...');
    const memorySummary = this.memory.getMemorySummary();
    const graph = await this.planner.createPlan(request, config, memorySummary);
    
    spinner.stop('Task Graph generated.');

    if (graph.projectName) {
      prompt.log.info(`Project Environment Discovered: ${chalk.cyan(graph.projectName)}`);
    }
    
    const confirm = await prompt.confirm({
      message: `Planner generated ${graph.tasks.length} tasks matching constraints. Do you want to review the plan or proceed?`,
      initialValue: true
    });

    if (!confirm) {
      prompt.cancel('Execution aborted by user.');
      process.exit(0);
    }

    spinner.start('[TASK MANAGER] Scheduling execution waves...');
    const schedule = await this.taskManager.scheduleWaves(graph);
    spinner.stop('Waves scheduled.');

    // Calculate map of all files that will be created
    const directoryManifest = graph.tasks
      .map(t => t.fileOutput)
      .filter((file): file is string => !!file);

    let waveCount = 1;
    for (const wave of schedule.waves) {
      prompt.log.info(`[WAVE ${waveCount}/${schedule.waves.length}] Executing ${wave.tasks.length} tasks concurrently...`);
      
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
               context[dep] = this.state.taskRegistry[dep]?.result || 'No output.';
           }
        }

        return this.worker.execute(task, desc, context, config, graph.projectName, tDef?.fileOutput, directoryManifest);
      });
      
      const results = await Promise.all(executionPromises);
      prompt.log.success(`Wave ${waveCount} completed!`);
      
      for (const result of results) {
        this.state.taskRegistry[result.task_id] = {
          status: result.status,
          agent: result.agent,
          retryCount: 0,
          result: result.result
        };
      }
      waveCount++;
    }

    this.memory.saveMemory({
      timestamp: new Date().toISOString(),
      request,
      graph,
      results: this.state.taskRegistry
    });
  }
}
