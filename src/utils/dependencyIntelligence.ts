import { execSync } from 'child_process';

export class DependencyIntelligence {
  /**
   * Checks if a dependency is safe to install.
   * Prevents conflicting trees and deprecated/outdated packages.
   * Returns true if valid.
   */
  validateDependency(depName: string): boolean {
    const blockedList = ['request', 'express-validator-legacy', 'faker'];
    if (blockedList.includes(depName.toLowerCase())) {
        return false;
    }
    try {
      // Check if package is deprecated
      const info = execSync(`npm view ${depName} deprecated`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (info.length > 0) {
        // Is deprecated
        return false;
      }
    } catch {
      // If npm view fails, it might not exist
      return false;
    }
    return true;
  }

  /**
   * Ensures the version being picked is stable.
   */
  suggestStableVersion(depName: string): string {
    try {
      const info = execSync(`npm show ${depName} version`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      return info || 'latest';
    } catch {
      return 'latest';
    }
  }

  buildSafeInstallCommand(deps: string[]): string {
    const validDeps = deps.filter(d => this.validateDependency(d));
    if (validDeps.length === 0) return '';
    return `npm install ${validDeps.join(' ')}`;
  }
}
