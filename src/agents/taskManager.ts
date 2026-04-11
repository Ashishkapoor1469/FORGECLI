import { TaskGraph, WaveTask, Task } from '../types.js';

export class TaskManager {
  getRunnableTasks(
    graph: TaskGraph,
    completedIds: Set<string>,
    failedIds: Set<string>,
    inProgressIds: Set<string>
  ): { runnable: WaveTask[], newlyFailed: string[], deferredConflicts: string[] } {
    const runnable: WaveTask[] = [];
    const newlyFailed: string[] = [];
    const deferredConflicts: string[] = [];
    let workerCounter = inProgressIds.size + 1;

    // First pass: collect all candidate tasks
    const candidates: Task[] = [];

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
        candidates.push(t);
      }
    }

    // Second pass: CONFLICT-SAFE PARALLEL EXECUTION
    // Group candidates by fileOutput — if multiple tasks target the same file,
    // only allow the first one to run; defer the rest to avoid race conditions.
    const fileOutputClaimed = new Set<string>();

    // Also check files currently being written by in-progress tasks
    for (const t of graph.tasks) {
      if (inProgressIds.has(t.id) && t.fileOutput) {
        fileOutputClaimed.add(t.fileOutput.toLowerCase().replace(/\\/g, '/'));
      }
    }

    for (const t of candidates) {
      const normalizedFile = t.fileOutput
        ? t.fileOutput.toLowerCase().replace(/\\/g, '/')
        : null;

      if (normalizedFile && fileOutputClaimed.has(normalizedFile)) {
        // Another task (runnable or in-progress) is already targeting this file
        deferredConflicts.push(t.id);
        continue;
      }

      // Claim the file output
      if (normalizedFile) {
        fileOutputClaimed.add(normalizedFile);
      }

      runnable.push({
        task_id: t.id,
        agent: `Worker-${workerCounter++}`,
        priority: t.complexity === 'high' ? 'high' : 'low'
      });
    }

    return { runnable, newlyFailed, deferredConflicts };
  }
}
