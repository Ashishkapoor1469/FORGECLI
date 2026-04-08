import { TaskGraph, WaveTask, Task } from '../types.js';

export class TaskManager {
  getRunnableTasks(
    graph: TaskGraph,
    completedIds: Set<string>,
    failedIds: Set<string>,
    inProgressIds: Set<string>
  ): { runnable: WaveTask[], newlyFailed: string[] } {
    const runnable: WaveTask[] = [];
    const newlyFailed: string[] = [];
    let workerCounter = inProgressIds.size + 1;

    for (const t of graph.tasks) {
      if (completedIds.has(t.id) || failedIds.has(t.id) || inProgressIds.has(t.id)) {
        continue; // Already processed or in progress
      }

      // If any dependency has failed, this task cannot run
      const hasFailedDep = t.dependencies.some(dep => failedIds.has(dep));
      if (hasFailedDep) {
        newlyFailed.push(t.id);
        continue;
      }

      // Check if all dependencies are completed
      const depsMet = t.dependencies.every(dep => completedIds.has(dep));
      if (depsMet) {
        runnable.push({
          task_id: t.id,
          agent: `Worker-${workerCounter++}`,
          priority: t.complexity === 'high' ? 'high' : 'low'
        });
      }
    }

    return { runnable, newlyFailed };
  }
}
