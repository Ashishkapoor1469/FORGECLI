import { TaskGraph, Task } from '../types.js';

export interface ValidationResult {
  valid: Task[];
  rejected: Task[];
  warnings: string[];
}


// Validate a task graph before execution.
// Checks for:
// - Missing fileOutput
// - Empty descriptions
// - Invalid dependency references
// -Circular dependencies
// -File output conflicts (multiple tasks targeting same file)

export function validateTaskGraph(graph: TaskGraph): ValidationResult {
  const valid: Task[] = [];
  const rejected: Task[] = [];
  const warnings: string[] = [];
  const validIds = new Set(graph.tasks.map(t => t.id));

  for (const task of graph.tasks) {
    let isValid = true;

    // Check: must have a non-empty fileOutput
    if (!task.fileOutput || task.fileOutput.trim() === '') {
      warnings.push(`[REJECT] ${task.id}: Missing fileOutput — tasks must produce a file.`);
      isValid = false;
    }

    // Check: must have a non-empty description
    if (!task.description || task.description.trim() === '') {
      warnings.push(`[REJECT] ${task.id}: Empty description — task is too vague.`);
      isValid = false;
    }

    // Check: all dependencies must reference existing task IDs
    if (task.dependencies && task.dependencies.length > 0) {
      const invalidDeps = task.dependencies.filter(dep => !validIds.has(dep));
      if (invalidDeps.length > 0) {
        warnings.push(`[WARN] ${task.id}: References non-existent dependencies: ${invalidDeps.join(', ')}. They will be removed.`);
        // Auto-fix: remove invalid deps instead of rejecting the whole task
        task.dependencies = task.dependencies.filter(dep => validIds.has(dep));
      }
    }

    if (isValid) {
      valid.push(task);
    } else {
      rejected.push(task);
    }
  }

  // Check: circular dependencies among valid tasks
  const circularTasks = detectCircularDeps(valid);
  if (circularTasks.length > 0) {
    warnings.push(`[WARN] Circular dependency detected involving: ${circularTasks.join(', ')}. Breaking cycles by removing last dependency.`);
    breakCircularDeps(valid, circularTasks);
  }

  // Check: file output conflicts
  const fileMap = new Map<string, string[]>();
  for (const task of valid) {
    if (task.fileOutput) {
      const normalized = task.fileOutput.toLowerCase().replace(/\\/g, '/');
      if (!fileMap.has(normalized)) fileMap.set(normalized, []);
      fileMap.get(normalized)!.push(task.id);
    }
  }

  for (const [file, taskIds] of fileMap) {
    if (taskIds.length > 1) {
      warnings.push(`[WARN] File conflict: ${file} is targeted by tasks: ${taskIds.join(', ')}. They will execute sequentially.`);
    }
  }

  return { valid, rejected, warnings };
}

/**
 * Detect circular dependencies using DFS cycle detection.
 * Returns task IDs involved in cycles.
 */
function detectCircularDeps(tasks: Task[]): string[] {
  const adjList = new Map<string, string[]>();
  for (const task of tasks) {
    adjList.set(task.id, task.dependencies || []);
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cyclicNodes: string[] = [];

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = adjList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          cyclicNodes.push(nodeId);
          return true;
        }
      } else if (recStack.has(neighbor)) {
        cyclicNodes.push(nodeId);
        cyclicNodes.push(neighbor);
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      dfs(task.id);
    }
  }

  return [...new Set(cyclicNodes)];
}

/**
 * Break circular dependencies by removing the last dependency from cyclic tasks.
 */
function breakCircularDeps(tasks: Task[], cyclicIds: string[]): void {
  const cyclicSet = new Set(cyclicIds);

  for (const task of tasks) {
    if (cyclicSet.has(task.id) && task.dependencies.length > 0) {
      // Remove the dependency that creates the cycle
      const lastDep = task.dependencies[task.dependencies.length - 1];
      if (cyclicSet.has(lastDep)) {
        task.dependencies = task.dependencies.filter(d => d !== lastDep);
      }
    }
  }
}
