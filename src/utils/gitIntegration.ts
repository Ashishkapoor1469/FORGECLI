import { execSync } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

export class GitIntegration {
  private projectPath: string;

  constructor(projectName: string) {
    this.projectPath = join(process.cwd(), 'workspace', projectName);
  }

  isInitialized(): boolean {
    return existsSync(join(this.projectPath, '.git'));
  }

  init() {
    if (!this.isInitialized()) {
      try {
        execSync('git init', { cwd: this.projectPath, stdio: 'ignore' });
        execSync('git add .', { cwd: this.projectPath, stdio: 'ignore' });
        execSync('git commit -m "Initial commit by Forge"', { cwd: this.projectPath, stdio: 'ignore' });
      } catch (e) {
        // Ignore silent failures if git is missing
      }
    }
  }

  commitTaskGraph(taskId: string, description: string) {
    if (this.isInitialized()) {
      try {
        execSync('git add .', { cwd: this.projectPath, stdio: 'ignore' });
        execSync(`git commit -m "Forge: Completed ${taskId} - ${description}"`, { cwd: this.projectPath, stdio: 'ignore' });
      } catch (e) {
        // Ignore if no changes to commit
      }
    }
  }

  rollback(taskId: string): boolean {
    if (this.isInitialized()) {
      try {
        // Very basic log parsing to find commit by task id
        const log = execSync('git log --oneline', { cwd: this.projectPath, encoding: 'utf-8' });
        const lines = log.split('\n');
        for (const line of lines) {
          if (line.includes(`Forge: Completed ${taskId}`)) {
            const hash = line.split(' ')[0];
            execSync(`git reset --hard ${hash}`, { cwd: this.projectPath, stdio: 'ignore' });
            return true;
          }
        }
      } catch (e) {
        return false;
      }
    }
    return false;
  }
}
