"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = require("crypto");
// Secret passphrase baked into the CLI — only the code knows this
const SECRET_PASSPHRASE = 'FORGE_CLI_ADMIN_KEY_2026_x9k3m';
const ALGORITHM = 'aes-256-cbc';
/** Derive a consistent 32-byte key from the passphrase */
function getKey() {
    return (0, crypto_1.scryptSync)(SECRET_PASSPHRASE, 'forge-salt', 32);
}
/**
 * Encrypt a plaintext string → returns a hex string (iv:encrypted)
 * Only the CLI with the matching SECRET_PASSPHRASE can decrypt this.
 */
function encrypt(plaintext) {
    const key = getKey();
    const iv = (0, crypto_1.randomBytes)(16);
    const cipher = (0, crypto_1.createCipheriv)(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    // Store IV alongside the ciphertext so we can decrypt later
    return iv.toString('hex') + ':' + encrypted;
}
/**
 * Decrypt a hex string (iv:encrypted) → returns plaintext
 * Throws if tampered with or wrong key.
 */
function decrypt(ciphertext) {
    const key = getKey();
    const [ivHex, encryptedHex] = ciphertext.split(':');
    if (!ivHex || !encryptedHex) {
        throw new Error('Invalid encrypted data format');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
}
