import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface MemoryEntry {
  timestamp: string;
  request: string;
  graph: any;
  results: any;
}

export class MemoryManager {
  private filePath: string;

  constructor(filePath = 'memory.json') {
    this.filePath = join(process.cwd(), filePath);
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
    const memories = this.getMemories();
    memories.push(entry);
    writeFileSync(this.filePath, JSON.stringify(memories, null, 2), 'utf-8');
  }

  getMemorySummary(): string {
    const memory = this.getMemories();
    if (memory.length === 0) return 'No previous actions.';
    
    return memory.map((m, idx) => 
      `\n--- Action ${idx + 1} ---\n` +
      `Request: ${m.request}\n` +
      `Outcomes: ${JSON.stringify(m.results).slice(0, 500)}...` // Trimmed safety
    ).join('\n');
  }
}
