import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { encrypt, decrypt } from './crypto.js';

export class SecretManager {
  private secretPath: string;

  constructor() {
    this.secretPath = join(process.cwd(), '.forge', 'secrets.enc');
  }

  setSecret(project: string, key: string, value: string) {
    const data = this.load();
    if (!data[project]) data[project] = {};
    data[project][key] = value;
    this.save(data);
  }

  getSecret(project: string, key: string): string | null {
    const data = this.load();
    return data[project] ? data[project][key] || null : null;
  }

  // Gets a masked context string for LLM prompts
  getMaskedContext(project: string): string {
    const data = this.load();
    if (!data[project]) return '';
    const keys = Object.keys(data[project]);
    if (keys.length === 0) return '';
    return `[SECRETS DETECTED: ENV requires ${keys.join(', ')}]`;
  }

  private load(): Record<string, Record<string, string>> {
     if (!existsSync(this.secretPath)) return {};
     try {
       return JSON.parse(decrypt(readFileSync(this.secretPath, 'utf-8')));
     } catch {
       return {};
     }
  }

  private save(data: Record<string, Record<string, string>>) {
      writeFileSync(this.secretPath, encrypt(JSON.stringify(data)), 'utf-8');
  }
}
