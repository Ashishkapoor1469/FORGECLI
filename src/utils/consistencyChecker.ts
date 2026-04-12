import { readFileSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';

export interface ConsistencyIssue {
  file: string;
  line: number;
  reference: string;
  type: 'broken_link' | 'broken_import' | 'broken_script';
  suggestion: string;
}

export interface ConsistencyReport {
  issues: ConsistencyIssue[];
  checkedFiles: number;
  passedFiles: number;
}

// Check cross-file consistency for a built project.
//Validates that HTML link/script references and JS/TS imports point to real files.

export function checkCrossFileConsistency(
  manifest: string[],
  projectPath: string
): ConsistencyReport {
  const issues: ConsistencyIssue[] = [];
  let checkedFiles = 0;
  let passedFiles = 0;

  // Build a set of all known files (normalized)
  const knownFiles = new Set(
    manifest.map(f => f.toLowerCase().replace(/\\/g, '/'))
  );

  for (const file of manifest) {
    const ext = extname(file).toLowerCase();
    const fullPath = join(projectPath, file);

    if (!existsSync(fullPath)) continue;

    try {
      const content = readFileSync(fullPath, 'utf-8');
      const fileIssues: ConsistencyIssue[] = [];

      if (ext === '.html' || ext === '.htm') {
        fileIssues.push(...checkHtmlReferences(file, content, knownFiles));
      }

      if (['.js', '.ts', '.jsx', '.tsx', '.mjs'].includes(ext)) {
        fileIssues.push(...checkJsImports(file, content, knownFiles, projectPath));
      }

      checkedFiles++;
      if (fileIssues.length === 0) {
        passedFiles++;
      } else {
        issues.push(...fileIssues);
      }
    } catch { /* skip unreadable files */ }
  }

  return { issues, checkedFiles, passedFiles };
}

// Check HTML files for broken link/script references.
function checkHtmlReferences(
  file: string,
  content: string,
  knownFiles: Set<string>
): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const lines = content.split('\n');
  const fileDir = dirname(file);

  // Match <link href="..."> and <script src="...">
  const linkPattern = /<link[^>]+href=["']([^"']+)["']/gi;
  const scriptPattern = /<script[^>]+src=["']([^"']+)["']/gi;
  const imgPattern = /<img[^>]+src=["']([^"']+)["']/gi;

  const patterns: { pattern: RegExp; type: 'broken_link' | 'broken_script' }[] = [
    { pattern: linkPattern, type: 'broken_link' },
    { pattern: scriptPattern, type: 'broken_script' },
  ];

  for (const { pattern, type } of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const ref = match[1];

      // Skip external URLs, data URIs, and anchors
      if (ref.startsWith('http') || ref.startsWith('//') || ref.startsWith('data:') || ref.startsWith('#')) {
        continue;
      }

      // Resolve relative path
      const resolved = resolveRelativePath(fileDir, ref);
      if (!knownFiles.has(resolved.toLowerCase())) {
        // Find the line number
        const lineNum = findLineNumber(lines, match[0]);

        // Find closest match for suggestion
        const closest = findClosestFile(resolved, knownFiles);

        issues.push({
          file,
          line: lineNum,
          reference: ref,
          type,
          suggestion: closest
            ? `Did you mean "${closest}"?`
            : `File "${resolved}" not found in project.`,
        });
      }
    }
  }

  return issues;
}

// Check JS/TS files for broken import/require references.
function checkJsImports(
  file: string,
  content: string,
  knownFiles: Set<string>,
  projectPath: string
): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const lines = content.split('\n');
  const fileDir = dirname(file);

  // Match import ... from '...' and require('...')
  const importPattern = /(?:import\s+.*?\s+from\s+|require\s*\(\s*)['"]([^'"]+)['"]/g;

  let match;
  while ((match = importPattern.exec(content)) !== null) {
    const ref = match[1];

    // Skip node_modules / bare imports (no ./ or ../ prefix)
    if (!ref.startsWith('.')) continue;

    // Try to resolve with common extensions
    const resolved = resolveRelativePath(fileDir, ref);
    const extensions = ['', '.ts', '.js', '.tsx', '.jsx', '.mjs', '/index.ts', '/index.js', '/index.tsx', '/index.jsx'];

    let found = false;
    for (const ext of extensions) {
      if (knownFiles.has((resolved + ext).toLowerCase())) {
        found = true;
        break;
      }
    }

    if (!found) {
      const lineNum = findLineNumber(lines, match[0]);
      const closest = findClosestFile(resolved, knownFiles);

      issues.push({
        file,
        line: lineNum,
        reference: ref,
        type: 'broken_import',
        suggestion: closest
          ? `Did you mean "${closest}"?`
          : `Module "${ref}" could not be resolved.`,
      });
    }
  }

  return issues;
}

// Resolve a relative path from a directory context.
function resolveRelativePath(fromDir: string, ref: string): string {
  // Clean up ./ prefix
  const cleanRef = ref.replace(/^\.\//, '');

  // Normalize '.' to empty (root-level files)
  const normDir = (fromDir === '.') ? '' : fromDir;

  if (ref.startsWith('../')) {
    // Navigate up
    const parts = normDir.split('/');
    const refParts = ref.split('/');
    let upCount = 0;
    for (const part of refParts) {
      if (part === '..') upCount++;
      else break;
    }
    const base = parts.slice(0, -upCount).join('/');
    const rest = refParts.slice(upCount).join('/');
    return base ? `${base}/${rest}` : rest;
  }

  return normDir ? `${normDir}/${cleanRef}` : cleanRef;
}


// Find the line number containing a substring.
function findLineNumber(lines: string[], substring: string): number {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(substring.slice(0, 30))) {
      return i + 1;
    }
  }
  return 0;
}

// Find the closest matching file in the known set using simple edit distance on the basename.
function findClosestFile(target: string, knownFiles: Set<string>): string | null {
  const targetBase = target.split('/').pop()?.toLowerCase() || '';
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const known of knownFiles) {
    const knownBase = known.split('/').pop()?.toLowerCase() || '';

    // Simple character overlap score
    let score = 0;
    for (let i = 0; i < Math.min(targetBase.length, knownBase.length); i++) {
      if (targetBase[i] === knownBase[i]) score++;
    }

    // Bonus for containing the target
    if (knownBase.includes(targetBase) || targetBase.includes(knownBase)) {
      score += 5;
    }

    if (score > bestScore && score > 3) {
      bestScore = score;
      bestMatch = known;
    }
  }

  return bestMatch;
}
