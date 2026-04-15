import * as crypto from 'crypto';

export class IncrementalCache {
  private cache: Record<string, string> = {};

  /**
   * Generates a deterministic hash for a task definition and its context dependencies.
   */
  hashTask(taskId: string, taskDesc: string, fileOutput: string, contextObj: any): string {
    const payload = JSON.stringify({
      taskId,
      taskDesc,
      fileOutput,
      contextObj
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  isCached(hash: string): boolean {
    return !!this.cache[hash];
  }

  setCache(hash: string, fileContent: string) {
    this.cache[hash] = fileContent;
  }

  getCache(hash: string): string | null {
    return this.cache[hash] || null;
  }
}
