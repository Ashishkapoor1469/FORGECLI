export class FileQueue {
  private fileLocks = new Map<string, Promise<any>>();


  async enqueue<T>(resourcePath: string, operation: () => Promise<T>): Promise<T> {
    const currentWait = this.fileLocks.get(resourcePath) || Promise.resolve();

    const newWait = currentWait.then(() => operation()).catch((err) => {
      // Catch error so the chain doesn't break for future operations
      throw err;
    });


    const safeWait = newWait.catch(() => {});
    this.fileLocks.set(resourcePath, safeWait);

    return newWait;
  }
}

export const globalFileQueue = new FileQueue();
