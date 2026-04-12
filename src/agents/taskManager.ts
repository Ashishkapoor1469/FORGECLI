import { TaskGraph, WaveTask, Task } from '../types.js';

interface DagNode {
  task: Task;
  inDegree: number;
  dependents: string[];
  depth: number;
  priorityScore: number;
}

export class TaskManager {
  private workerCounter = 1;

  getNextBatches(
    graph: TaskGraph,
    completedIds: Set<string>,
    failedIds: Set<string>,
    inProgressIds: Set<string>
  ): { safeBatch: WaveTask[], conflictBatch: WaveTask[], newlyFailed: string[], deferredConflicts: string[] } {
    
    const safeBatch: WaveTask[] = [];
    const conflictBatch: WaveTask[] = [];
    const newlyFailed: string[] = [];
    const deferredConflicts: string[] = [];

    // STEP 1: DAG SETUP & Priorities
    const nodes = new Map<string, DagNode>();
    
    // Initialize nodes
    for (const t of graph.tasks) {
      // Calculate priority
      let priorityScore = 1; // LOW
      if (t.complexity === 'high') priorityScore = 2; // MEDIUM default for high complexity
      
      const fileOut = t.fileOutput ? t.fileOutput.toLowerCase() : '';
      if (fileOut.endsWith('package.json') || fileOut.endsWith('index.ts') || fileOut.endsWith('main.ts') || fileOut.endsWith('vite.config.ts')) {
        priorityScore = 3; // HIGH
      } else if (fileOut.includes('components') || fileOut.includes('ui') || fileOut.endsWith('.css') || fileOut.endsWith('.html')) {
        priorityScore = 1; // LOW
      } else {
        priorityScore = 2; // MEDIUM
      }

      nodes.set(t.id, {
        task: t,
        inDegree: 0,
        dependents: [],
        depth: 0,
        priorityScore,
      });
    }

    // Build edges & dependents
    for (const t of graph.tasks) {
      if (t.dependencies) {
        for (const dep of t.dependencies) {
          const parentNode = nodes.get(dep);
          if (parentNode) {
            parentNode.dependents.push(t.id);
            const childNode = nodes.get(t.id);
            if (childNode) {
               childNode.inDegree++;
            }
          }
        }
      }
    }

    // Calculate topological depth
    // Track nodes by calculating depths layer by layer from root
    let queueObj = Array.from(nodes.values()).filter(n => n.inDegree === 0);
    while (queueObj.length > 0) {
      const node = queueObj.shift()!;
      for (const depId of node.dependents) {
        const depNode = nodes.get(depId)!;
        depNode.depth = Math.max(depNode.depth, node.depth + 1);
        queueObj.push(depNode);
      }
    }

    // First pass: collect all candidate completion checks
    const candidates: Task[] = [];
    for (const t of graph.tasks) {
      if (completedIds.has(t.id) || failedIds.has(t.id) || inProgressIds.has(t.id)) {
        continue;
      }

      // Check if any dependency has failed
      const hasFailedDep = t.dependencies.some(dep => failedIds.has(dep));
      if (hasFailedDep) {
        newlyFailed.push(t.id);
        continue;
      }

      const depsMet = t.dependencies.every(dep => completedIds.has(dep));
      if (depsMet) {
        candidates.push(t);
      }
    }

    // Sort valid candidates to form a Deterministic READY_QUEUE
    // Sort by:
    // 1. Priority (High -> Low)
    // 2. Depth (Low -> High - meaning roots run first)
    // 3. Deterministic Task ID
    candidates.sort((a, b) => {
      const nodeA = nodes.get(a.id)!;
      const nodeB = nodes.get(b.id)!;
      
      if (nodeB.priorityScore !== nodeA.priorityScore) {
        return nodeB.priorityScore - nodeA.priorityScore;
      }
      if (nodeA.depth !== nodeB.depth) {
         return nodeA.depth - nodeB.depth;
      }
      return a.id.localeCompare(b.id);
    });

    // STEP 2 & 5: Resource Map and Batching
    const fileOutputClaimed = new Set<string>();

    for (const t of graph.tasks) {
      if (inProgressIds.has(t.id) && t.fileOutput) {
        fileOutputClaimed.add(t.fileOutput.toLowerCase().replace(/\\/g, '/'));
      }
    }

    const fileMapReadyQueue = new Map<string, string[]>();
    for (const t of candidates) {
       if (t.fileOutput) {
          const file = t.fileOutput.toLowerCase().replace(/\\/g, '/');
          if (!fileMapReadyQueue.has(file)) fileMapReadyQueue.set(file, []);
          fileMapReadyQueue.get(file)!.push(t.id);
       }
    }

    for (const t of candidates) {
      const normalizedFile = t.fileOutput
        ? t.fileOutput.toLowerCase().replace(/\\/g, '/')
        : null;

      if (normalizedFile && fileOutputClaimed.has(normalizedFile)) {
        deferredConflicts.push(t.id);
        continue;
      }

      const waveTask: WaveTask = {
        task_id: t.id,
        agent: `Worker-${this.workerCounter++}`,
        priority: nodes.get(t.id)!.priorityScore === 3 ? 'high' : 'low'
      };

      if (normalizedFile) {
        fileOutputClaimed.add(normalizedFile);
        
        // If the file is only needed by this ONE task in the candidate queue, it is SAFE.
        // If it's targeted by MULTIPLE tasks in the candidates, it's CONFLICT -> schedule 1st sequentially.
        const tasksForFile = fileMapReadyQueue.get(normalizedFile)!;
        if (tasksForFile.length > 1) {
           conflictBatch.push(waveTask);
        } else {
           safeBatch.push(waveTask);
        }
      } else {
         safeBatch.push(waveTask);
      }
    }

    return { safeBatch, conflictBatch, newlyFailed, deferredConflicts };
  }
}
