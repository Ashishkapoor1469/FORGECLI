# Security Policy

Forge CLI takes security seriously. As a tool that generates code and executes system commands, we strive to maintain a secure environment for your development workflow.

## Reporting a Vulnerability

If you discover a security vulnerability within Forge, please report it via one of the following methods:

1. **Email**: [security@forge-cli.com](mailto:security@forge-cli.com) (Placeholder)
2. **GitHub Issues**: Open a new issue with the "security" label (for non-disclosing reports).

Please do not disclose security issues publicly until we have reached a resolution.

## Data Encryption

Forge protects your sensitive data (session memory and gacha state) using industry-standard encryption.

- **Algorithm**: AES-256-CBC.
- **Key Derivation**: Keys are derived from your system environment using `scryptSync` (PBKDF).
- **Initialization Vectors**: A unique 16-byte random IV is generated for every write operation and prepended to the ciphertext.
- **At-Rest Protection**: 
  - Data is stored in the `.forge/` directory in binary format.
  - Files are set to **read-only mode** (`chmod 444`) immediately after writing to prevent accidental modification or tampering.
  - Permissions are only elevated to `666` temporarily during active write operations.

## Environment & Secrets

Forge handles sensitive API keys (e.g., `OPENROUTER_API_KEY`) and administrative passwords via environment variables.

- **.env File**: Always keep your `.env` file in the project root. It is listed in `.gitignore` by default. Never commit this file to version control.
- **Admin Vault**: The `/admin` command is protected by a password defined in your environment (`ADMIN_PASSWORD`). The default value is `admin123`; we strongly recommend changing this for production use.

## Workspace Security

Forge operates within the `workspace/` directory and respects your filesystem.

- **Command Execution**: AI-suggested commands are **never** executed without explicit user confirmation.
- **File Overwrites**: In Evolution Mode, Forge reads existing files before editing to minimize data loss and ensure logic preservation.

## Supported Versions

Only the latest version of Forge CLI is supported for security updates.

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :x:                |
