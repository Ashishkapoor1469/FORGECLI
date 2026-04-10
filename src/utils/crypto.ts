import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const SECRET_PASSPHRASE = 'FORGE_CLI_ADMIN_KEY_2026_x9k3m';
const ALGORITHM = 'aes-256-cbc';

function getKey(): Buffer {
  return scryptSync(SECRET_PASSPHRASE, 'forge-salt', 32);
}


export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const [ivHex, encryptedHex] = ciphertext.split(':');
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid encrypted data format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}
