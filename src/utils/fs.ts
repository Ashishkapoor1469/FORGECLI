import { readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

export function getDirectoryTree(dirPath: string, rootDir: string = dirPath): string[] {
  if (!existsSync(dirPath)) return [];

  const ignoreList = ['node_modules', '.git', 'dist', 'build', '.next', '.svelte-kit'];
  let results: string[] = [];
  
  const list = readdirSync(dirPath);
  for (const file of list) {
    if (ignoreList.includes(file)) continue;

    const fullPath = join(dirPath, file);
    const stat = statSync(fullPath);

    if (stat && stat.isDirectory()) {
      results = results.concat(getDirectoryTree(fullPath, rootDir));
    } else {
      results.push(relative(rootDir, fullPath).replace(/\\/g, '/'));
    }
  }

  return results;
}
