"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskManager = void 0;
class TaskManager {
    getRunnableTasks(graph, completedIds, failedIds, inProgressIds) {
        const runnable = [];
        const newlyFailed = [];
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
exports.TaskManager = TaskManager;
