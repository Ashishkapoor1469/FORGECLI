import * as crypto from 'crypto';
import * as fs from 'fs';
import { join } from 'path';

export interface ComponentRecord {
  id: string;
  projectName: string;
  filePath: string;
  description: string;
  createdAt: string;
}

export class ComponentRegistry {
  private getSecretKey(): Buffer {
    let raw = process.env.ADMIN_PASSWORD || "forge-default-session-machine-key-123";
    // Must be 32 bytes for aes-256-cbc
    return crypto.createHash('sha256').update(raw).digest();
  }

  private getRegistryPath(projectName: string): string {
    const dir = join(process.cwd(), "workspace", projectName, ".forge");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return join(dir, "components.enc");
  }

  public getDecryptedRegistry(projectName: string): ComponentRecord[] {
    const filepath = this.getRegistryPath(projectName);
    if (!fs.existsSync(filepath)) return [];

    try {
      const encryptedData = fs.readFileSync(filepath, 'utf8');
      const parts = encryptedData.split(':');
      if (parts.length !== 2) return [];

      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = Buffer.from(parts[1], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.getSecretKey(), iv);
      
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return JSON.parse(decrypted.toString('utf8'));
    } catch (err) {
      // If decryption fails (e.g. password changed), fail safe
      return [];
    }
  }

  public registerComponent(projectName: string, record: Partial<ComponentRecord>) {
    const registry = this.getDecryptedRegistry(projectName);
    
    // Upsert logic based on filePath
    const existingIndex = registry.findIndex(r => r.filePath === record.filePath);
    const fullRecord: ComponentRecord = {
      id: record.id || crypto.randomUUID(),
      projectName,
      filePath: record.filePath || "unknown",
      description: record.description || "No description provided.",
      createdAt: new Date().toISOString()
    };

    if (existingIndex > -1) {
      registry[existingIndex] = fullRecord;
    } else {
      registry.push(fullRecord);
    }

    const jsonStr = JSON.stringify(registry, null, 2);
    
    // Encrypt
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.getSecretKey(), iv);
    
    let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const output = iv.toString('hex') + ':' + encrypted;
    fs.writeFileSync(this.getRegistryPath(projectName), output, 'utf8');
  }
}
