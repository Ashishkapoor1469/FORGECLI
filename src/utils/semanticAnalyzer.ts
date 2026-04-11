import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, relative, extname, basename } from 'path';

export interface ProjectSummary {
  techStack: string[];
  entryPoints: string[];
  routes: string[];
  components: string[];
  styles: string[];
  fileCount: number;
}

export interface RelevantFile {
  path: string;
  score: number;
  reason: string;
}

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '.svelte-kit', '.cache', 'coverage'];

const TECH_INDICATORS: Record<string, string[]> = {
  'React': ['react', 'react-dom', 'jsx', 'tsx'],
  'Vue': ['vue', '.vue'],
  'Svelte': ['svelte', '.svelte'],
  'Next.js': ['next', 'next.config'],
  'Express': ['express'],
  'TypeScript': ['typescript', 'tsconfig.json'],
  'Tailwind': ['tailwindcss', 'tailwind.config'],
  'Vite': ['vite', 'vite.config'],
};

const ENTRY_POINT_NAMES = [
  'index.ts', 'index.js', 'index.tsx', 'index.jsx',
  'main.ts', 'main.js', 'main.tsx', 'main.jsx',
  'app.ts', 'app.js', 'app.tsx', 'app.jsx',
  'server.ts', 'server.js',
];

/**
 * Recursively collect all file paths under a directory, respecting ignore rules.
 */
function collectFiles(dirPath: string, rootDir: string = dirPath): string[] {
  if (!existsSync(dirPath)) return [];

  let results: string[] = [];
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    if (IGNORE_DIRS.includes(entry)) continue;

    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      results = results.concat(collectFiles(fullPath, rootDir));
    } else {
      results.push(relative(rootDir, fullPath).replace(/\\/g, '/'));
    }
  }

  return results;
}

/**
 * Analyze a project's structure to understand its tech stack, entry points, and layout.
 */
export function analyzeProjectStructure(projectPath: string): ProjectSummary {
  const summary: ProjectSummary = {
    techStack: [],
    entryPoints: [],
    routes: [],
    components: [],
    styles: [],
    fileCount: 0,
  };

  if (!existsSync(projectPath)) return summary;

  const allFiles = collectFiles(projectPath);
  summary.fileCount = allFiles.length;

  // Detect tech stack from package.json
  const pkgPath = join(projectPath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };

      for (const [tech, indicators] of Object.entries(TECH_INDICATORS)) {
        for (const indicator of indicators) {
          if (allDeps[indicator] || allFiles.some(f => f.includes(indicator))) {
            if (!summary.techStack.includes(tech)) {
              summary.techStack.push(tech);
            }
          }
        }
      }
    } catch { /* ignore malformed package.json */ }
  }

  // Detect tech from file extensions
  const extSet = new Set(allFiles.map(f => extname(f).toLowerCase()));
  if (extSet.has('.tsx') || extSet.has('.ts')) {
    if (!summary.techStack.includes('TypeScript')) summary.techStack.push('TypeScript');
  }

  // Classify files
  for (const file of allFiles) {
    const base = basename(file).toLowerCase();
    const ext = extname(file).toLowerCase();

    // Entry points
    if (ENTRY_POINT_NAMES.includes(base)) {
      summary.entryPoints.push(file);
    }

    // Routes
    if (file.includes('route') || file.includes('router') || file.includes('/api/')) {
      summary.routes.push(file);
    }

    // Components
    if (file.includes('component') || ext === '.vue' || ext === '.svelte' ||
      (file.includes('src/') && (ext === '.tsx' || ext === '.jsx'))) {
      summary.components.push(file);
    }

    // Styles
    if (['.css', '.scss', '.sass', '.less', '.styl'].includes(ext)) {
      summary.styles.push(file);
    }
  }

  return summary;
}

/**
 * Given a task description, find the most relevant files in the project.
 * Uses keyword matching against filenames and file content.
 */
export function findRelevantFiles(projectPath: string, taskDescription: string): RelevantFile[] {
  if (!existsSync(projectPath)) return [];

  const allFiles = collectFiles(projectPath);
  const keywords = extractKeywords(taskDescription);
  const results: RelevantFile[] = [];

  for (const file of allFiles) {
    let score = 0;
    const reasons: string[] = [];

    // Score based on filename keyword match
    const lowerFile = file.toLowerCase();
    for (const keyword of keywords) {
      if (lowerFile.includes(keyword)) {
        score += 3;
        reasons.push(`filename matches "${keyword}"`);
      }
    }

    // Score based on file content keyword match (only for small text files)
    const fullPath = join(projectPath, file);
    const ext = extname(file).toLowerCase();
    const textExts = ['.ts', '.js', '.tsx', '.jsx', '.html', '.css', '.json', '.vue', '.svelte', '.md'];

    if (textExts.includes(ext)) {
      try {
        const stat = statSync(fullPath);
        if (stat.size < 50000) { // Skip very large files
          const content = readFileSync(fullPath, 'utf-8').toLowerCase();
          for (const keyword of keywords) {
            if (content.includes(keyword)) {
              score += 1;
              reasons.push(`content matches "${keyword}"`);
            }
          }
        }
      } catch { /* skip unreadable files */ }
    }

    if (score > 0) {
      results.push({
        path: file,
        score,
        reason: reasons.slice(0, 3).join(', '),
      });
    }
  }

  // Sort by score descending, return top 10
  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

// Get a compact project summary string suitable for LLM context.

export function getProjectSummaryString(projectPath: string): string {
  const summary = analyzeProjectStructure(projectPath);

  if (summary.fileCount === 0) return '';

  const parts: string[] = [];
  parts.push(`Files: ${summary.fileCount}`);

  if (summary.techStack.length > 0) {
    parts.push(`Tech: ${summary.techStack.join(', ')}`);
  }
  if (summary.entryPoints.length > 0) {
    parts.push(`Entry points: ${summary.entryPoints.join(', ')}`);
  }
  if (summary.routes.length > 0) {
    parts.push(`Routes: ${summary.routes.slice(0, 5).join(', ')}`);
  }
  if (summary.components.length > 0) {
    parts.push(`Components: ${summary.components.slice(0, 8).join(', ')}`);
  }
  if (summary.styles.length > 0) {
    parts.push(`Styles: ${summary.styles.join(', ')}`);
  }

  return parts.join('\n');
}


//Extract meaningful keywords from a task description for file matching.
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'must',
    'that', 'this', 'it', 'its', 'not', 'no', 'so', 'if', 'then',
    'create', 'add', 'make', 'build', 'use', 'set', 'get', 'update',
    'file', 'code', 'new', 'write', 'implement', 'using',
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}
