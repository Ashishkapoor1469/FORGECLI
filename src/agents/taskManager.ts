import { TaskGraph, WaveSchedule, ExecutionWave, Task } from '../types.js';

export class TaskManager {
  scheduleWaves(graph: TaskGraph): WaveSchedule {
    const waves: ExecutionWave[] = [];
    const pendingTasks = [...graph.tasks];
    const completedTaskIds = new Set<string>();
    
    let currentWave = 1;

    while (pendingTasks.length > 0) {
      const runnableTasks: Task[] = [];
      const remainingTasks: Task[] = [];

      for (const t of pendingTasks) {
        const depsMet = t.dependencies.every(dep => completedTaskIds.has(dep));
        if (depsMet) {
          runnableTasks.push(t);
        } else {
          remainingTasks.push(t);
        }
      }

      if (runnableTasks.length === 0 && pendingTasks.length > 0) {
        throw new Error("Cyclic dependency detected in task graph, or missing dependency.");
      }

      waves.push({
        wave: currentWave,
        tasks: runnableTasks.map((t, idx) => ({
          task_id: t.id,
          agent: `Worker-${currentWave}-${idx + 1}`,
          priority: t.complexity === 'high' ? 'high' : 'low'
        }))
      });

      for (const t of runnableTasks) completedTaskIds.add(t.id);
      
      pendingTasks.length = 0;
      pendingTasks.push(...remainingTasks);
      currentWave++;
    }

    return { waves };
  }
}
