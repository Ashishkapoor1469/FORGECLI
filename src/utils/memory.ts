import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { encrypt, decrypt } from './crypto.js';

export interface MemoryEntry {
  timestamp: string;
  request: string;
  graph: any;
  results: any;
}

// Compact representation of a build session for resume detection
export interface ResumableSession {
  index: number;
  projectName: string;
  totalTasks: number;
  completedTasks: string[];
  failedTasks: string[];
  pendingTasks: string[];
  timestamp: string;
  originalRequest: string;
  taskRegistry: Record<string, any>;
}

// Filtered context for LLM prompts — lightweight, no raw code or logs
export interface FilteredContext {
  projectName: string;
  fileStructure: string[];
  techStack: string[];
  completedFeatures: string[];
  failedFeatures: string[];
}

export class MemoryManager {
  private filePath: string;
  private maxEntries: number;

  constructor(filePath = '.forge/memory.dat', maxEntries = 100) {
    this.filePath = join(process.cwd(), filePath);
    this.maxEntries = maxEntries;
    // Ensure the hidden .forge directory exists
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  getMemories(): MemoryEntry[] {
    if (!existsSync(this.filePath)) {
      return [];
    }
    try {
      const encrypted = readFileSync(this.filePath, 'utf-8');
      if (!encrypted.trim()) return [];
      const json = decrypt(encrypted);
      return JSON.parse(json);
    } catch {
      return [];
    }
  }

  // Temporarily unlock file for writing (admin bypass)
  private unlock() {
    if (existsSync(this.filePath)) {
      chmodSync(this.filePath, 0o666);
    }
  }

  // Lock file back to read-only
  private lock() {
    if (existsSync(this.filePath)) {
      chmodSync(this.filePath, 0o444);
    }
  }

  saveMemory(entry: MemoryEntry) {
    let memories = this.getMemories();
    memories.push(entry);

    // Trim old entries if exceeding max to prevent unbounded growth
    if (memories.length > this.maxEntries) {
      memories = memories.slice(memories.length - this.maxEntries);
    }

    this.unlock();
    const encrypted = encrypt(JSON.stringify(memories));
    writeFileSync(this.filePath, encrypted, 'utf-8');
    this.lock();
  }

  clearMemories() {
    this.unlock();
    const encrypted = encrypt(JSON.stringify([]));
    writeFileSync(this.filePath, encrypted, 'utf-8');
    this.lock();
  }

  getMemorySummary(): string {
    const memory = this.getMemories();
    if (memory.length === 0) return 'No previous actions.';
    
    // Only use last 10 entries for context to avoid LLM prompt overload
    const recent = memory.slice(-10);

    return recent.map((m, idx) => {
      const realIdx = memory.length - recent.length + idx + 1;
      let outcome = '';
      if (m.graph === null) {
        // Chat entry — show a short snippet
        const chat = m.results?.chatResponse || '';
        outcome = `Chat: "${chat.substring(0, 100)}..."`;
      } else {
        // Build entry — show project name and task count
        const projName = m.graph?.projectName || 'unknown';
        const taskCount = m.graph?.tasks?.length || 0;
        outcome = `Build: ${projName} (${taskCount} tasks)`;
      }
      return `[${realIdx}] ${m.request} → ${outcome}`;
    }).join('\n');
  }

  // SMART MEMORY FILTERING — extract only essential context for LLM prompts.
  // Returns a compact filtered context that avoids raw logs, full code, and repeated outputs.
  
  getFilteredContext(): FilteredContext[] {
    const memory = this.getMemories();
    if (memory.length === 0) return [];

    // Only process build entries (skip chat) and limit to recent 5
    const builds = memory
      .filter(m => m.graph !== null && m.graph?.tasks?.length > 0)
      .slice(-5);

    return builds.map(m => {
      const graph = m.graph;
      const results = m.results || {};

      // Extract project name
      const projectName = graph.projectName || 'unknown';

      // Extract file structure from task outputs
      const fileStructure = (graph.tasks || [])
        .map((t: any) => t.fileOutput)
        .filter((f: any) => !!f);

      // Infer tech stack from file extensions
      const techStack = this.inferTechStack(fileStructure);

      // Separate completed vs failed features
      const completedFeatures: string[] = [];
      const failedFeatures: string[] = [];

      for (const task of (graph.tasks || [])) {
        const reg = results[task.id];
        if (reg && reg.status === 'completed') {
          completedFeatures.push(task.description?.substring(0, 80) || task.id);
        } else if (reg && reg.status === 'failed') {
          failedFeatures.push(task.description?.substring(0, 80) || task.id);
        }
      }

      return { projectName, fileStructure, techStack, completedFeatures, failedFeatures };
    });
  }

  // Get a compact filtered context string for LLM injection.
  // Summarizes if memory is large. Never exceeds ~2000 chars.
  
  getFilteredContextString(): string {
    const contexts = this.getFilteredContext();
    if (contexts.length === 0) return 'No previous build history.';

    const parts = contexts.map(ctx => {
      const lines: string[] = [];
      lines.push(`Project: ${ctx.projectName}`);
      if (ctx.techStack.length > 0) lines.push(`Tech: ${ctx.techStack.join(', ')}`);
      if (ctx.fileStructure.length > 0) {
        lines.push(`Files: ${ctx.fileStructure.slice(0, 10).join(', ')}${ctx.fileStructure.length > 10 ? ` (+${ctx.fileStructure.length - 10} more)` : ''}`);
      }
      if (ctx.completedFeatures.length > 0) {
        lines.push(`Done: ${ctx.completedFeatures.slice(0, 5).join('; ')}`);
      }
      if (ctx.failedFeatures.length > 0) {
        lines.push(`Failed: ${ctx.failedFeatures.join('; ')}`);
      }
      return lines.join('\n');
    });

    let result = parts.join('\n---\n');

    // Cap at ~2000 chars to prevent prompt bloat
    if (result.length > 2000) {
      result = result.substring(0, 1950) + '\n[...truncated]';
    }

    return result;
  }

  // RESUME BUILDS — find the most recent incomplete build session for a project.
  
  findResumableSession(projectName?: string): ResumableSession | null {
    const memory = this.getMemories();

    // Search from most recent backwards
    for (let i = memory.length - 1; i >= 0; i--) {
      const entry = memory[i];
      if (!entry.graph || !entry.graph.tasks || entry.graph.tasks.length === 0) continue;

      const entryProject = entry.graph.projectName || '';

      // If a project name is specified, only match that project
      if (projectName && entryProject !== projectName) continue;

      const tasks = entry.graph.tasks;
      const results = entry.results || {};

      const completedTasks: string[] = [];
      const failedTasks: string[] = [];
      const pendingTasks: string[] = [];

      for (const task of tasks) {
        const reg = results[task.id];
        if (reg && reg.status === 'completed') {
          completedTasks.push(task.id);
        } else if (reg && reg.status === 'failed') {
          failedTasks.push(task.id);
        } else {
          pendingTasks.push(task.id);
        }
      }

      // Only resumable if there are pending or failed tasks
      if (failedTasks.length > 0 || pendingTasks.length > 0) {
        return {
          index: i,
          projectName: entryProject,
          totalTasks: tasks.length,
          completedTasks,
          failedTasks,
          pendingTasks,
          timestamp: entry.timestamp,
          originalRequest: entry.request,
          taskRegistry: results,
        };
      }
    }

    return null;
  }

  // Infer tech stack from file extensions and names.
  
  private inferTechStack(files: string[]): string[] {
    const stack = new Set<string>();

    for (const f of files) {
      const lower = f.toLowerCase();
      if (lower.endsWith('.tsx') || lower.endsWith('.jsx')) stack.add('React');
      if (lower.endsWith('.ts') || lower.includes('tsconfig')) stack.add('TypeScript');
      if (lower.endsWith('.vue')) stack.add('Vue');
      if (lower.endsWith('.svelte')) stack.add('Svelte');
      if (lower.includes('express') || lower.includes('server')) stack.add('Express');
      if (lower.includes('next.config')) stack.add('Next.js');
      if (lower.includes('tailwind')) stack.add('Tailwind');
      if (lower.endsWith('.html')) stack.add('HTML');
      if (lower.endsWith('.css') || lower.endsWith('.scss')) stack.add('CSS');
      if (lower.endsWith('.js')) stack.add('JavaScript');
      if (lower === 'package.json') stack.add('Node.js');
    }

    return Array.from(stack);
  }

  getFileSize(): string {
    if (!existsSync(this.filePath)) return '0 KB';
    const stats = statSync(this.filePath);
    const kb = (stats.size / 1024).toFixed(1);
    return `${kb} KB`;
  }
}
