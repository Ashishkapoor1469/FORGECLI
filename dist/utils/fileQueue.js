"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalFileQueue = exports.FileQueue = void 0;
class FileQueue {
    fileLocks = new Map();
    async enqueue(resourcePath, operation) {
        const currentWait = this.fileLocks.get(resourcePath) || Promise.resolve();
        const newWait = currentWait.then(() => operation()).catch((err) => {
            // Catch error so the chain doesn't break for future operations
            throw err;
        });
        const safeWait = newWait.catch(() => { });
        this.fileLocks.set(resourcePath, safeWait);
        return newWait;
    }
}
exports.FileQueue = FileQueue;
exports.globalFileQueue = new FileQueue();
