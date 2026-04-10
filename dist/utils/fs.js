"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDirectoryTree = getDirectoryTree;
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * Returns a recursive array of relative file paths from a given root folder.
 * Ignores node_modules, .git, and common build folders.
 */
function getDirectoryTree(dirPath, rootDir = dirPath) {
    if (!(0, fs_1.existsSync)(dirPath))
        return [];
    const ignoreList = ['node_modules', '.git', 'dist', 'build', '.next', '.svelte-kit'];
    let results = [];
    const list = (0, fs_1.readdirSync)(dirPath);
    for (const file of list) {
        if (ignoreList.includes(file))
            continue;
        const fullPath = (0, path_1.join)(dirPath, file);
        const stat = (0, fs_1.statSync)(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getDirectoryTree(fullPath, rootDir));
        }
        else {
            results.push((0, path_1.relative)(rootDir, fullPath).replace(/\\/g, '/'));
        }
    }
    return results;
}
