import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

export interface MemoryEntry {
  timestamp: string;
  request: string;
  graph: any;
  results: any;
}

export class MemoryManager {
  private filePath: string;
  private maxEntries: number;

  constructor(filePath = 'memory.json', maxEntries = 100) {
    this.filePath = join(process.cwd(), filePath);
    this.maxEntries = maxEntries;
  }

  getMemories(): MemoryEntry[] {
    if (!existsSync(this.filePath)) {
      return [];
    }
    try {
      const data = readFileSync(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  saveMemory(entry: MemoryEntry) {
    let memories = this.getMemories();
    memories.push(entry);

    // Trim old entries if exceeding max to prevent unbounded growth
    if (memories.length > this.maxEntries) {
      memories = memories.slice(memories.length - this.maxEntries);
    }

    writeFileSync(this.filePath, JSON.stringify(memories, null, 2), 'utf-8');
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

  getFileSize(): string {
    if (!existsSync(this.filePath)) return '0 KB';
    const stats = statSync(this.filePath);
    const kb = (stats.size / 1024).toFixed(1);
    return `${kb} KB`;
  }
}
