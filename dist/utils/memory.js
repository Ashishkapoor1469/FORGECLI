"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryManager = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const crypto_js_1 = require("./crypto.js");
class MemoryManager {
    filePath;
    maxEntries;
    constructor(filePath = '.forge/memory.dat', maxEntries = 100) {
        this.filePath = (0, path_1.join)(process.cwd(), filePath);
        this.maxEntries = maxEntries;
        // Ensure the hidden .forge directory exists
        const dir = (0, path_1.dirname)(this.filePath);
        if (!(0, fs_1.existsSync)(dir))
            (0, fs_1.mkdirSync)(dir, { recursive: true });
    }
    getMemories() {
        if (!(0, fs_1.existsSync)(this.filePath)) {
            return [];
        }
        try {
            const encrypted = (0, fs_1.readFileSync)(this.filePath, 'utf-8');
            if (!encrypted.trim())
                return [];
            const json = (0, crypto_js_1.decrypt)(encrypted);
            return JSON.parse(json);
        }
        catch {
            return [];
        }
    }
    /** Temporarily unlock file for writing (admin bypass) */
    unlock() {
        if ((0, fs_1.existsSync)(this.filePath)) {
            (0, fs_1.chmodSync)(this.filePath, 0o666);
        }
    }
    /** Lock file back to read-only */
    lock() {
        if ((0, fs_1.existsSync)(this.filePath)) {
            (0, fs_1.chmodSync)(this.filePath, 0o444);
        }
    }
    saveMemory(entry) {
        let memories = this.getMemories();
        memories.push(entry);
        // Trim old entries if exceeding max to prevent unbounded growth
        if (memories.length > this.maxEntries) {
            memories = memories.slice(memories.length - this.maxEntries);
        }
        this.unlock();
        const encrypted = (0, crypto_js_1.encrypt)(JSON.stringify(memories));
        (0, fs_1.writeFileSync)(this.filePath, encrypted, 'utf-8');
        this.lock();
    }
    clearMemories() {
        this.unlock();
        const encrypted = (0, crypto_js_1.encrypt)(JSON.stringify([]));
        (0, fs_1.writeFileSync)(this.filePath, encrypted, 'utf-8');
        this.lock();
    }
    getMemorySummary() {
        const memory = this.getMemories();
        if (memory.length === 0)
            return 'No previous actions.';
        // Only use last 10 entries for context to avoid LLM prompt overload
        const recent = memory.slice(-10);
        return recent.map((m, idx) => {
            const realIdx = memory.length - recent.length + idx + 1;
            let outcome = '';
            if (m.graph === null) {
                // Chat entry — show a short snippet
                const chat = m.results?.chatResponse || '';
                outcome = `Chat: "${chat.substring(0, 100)}..."`;
            }
            else {
                // Build entry — show project name and task count
                const projName = m.graph?.projectName || 'unknown';
                const taskCount = m.graph?.tasks?.length || 0;
                outcome = `Build: ${projName} (${taskCount} tasks)`;
            }
            return `[${realIdx}] ${m.request} → ${outcome}`;
        }).join('\n');
    }
    getFileSize() {
        if (!(0, fs_1.existsSync)(this.filePath))
            return '0 KB';
        const stats = (0, fs_1.statSync)(this.filePath);
        const kb = (stats.size / 1024).toFixed(1);
        return `${kb} KB`;
    }
}
exports.MemoryManager = MemoryManager;
