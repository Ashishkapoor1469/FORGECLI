# Contributing to Forge CLI ⚡

First off, thank you for considering contributing to Forge! It's people like you that make Forge such a powerful tool for developers.

## Development Setup

1. **Fork and Clone**: Fork the repository and clone it to your local machine.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Setup Environment**:
   ```bash
   cp .env.example .env
   # Add your OPENROUTER_API_KEY
   ```
4. **Run in Development Mode**:
   ```bash
   npm run dev
   ```

## Coding Standards

- **Language**: Always use **TypeScript**.
- **Module System**: Use **ESM (ECMAScript Modules)**. All imports must include the `.js` extension (e.g., `import { X } from './utils.js'`).
- **Asynchronous Code**: Prefer `async/await` over raw promises.
- **Styling**: We use **Chalk** for terminal coloring and **Clack/Prompts** for interactive elements.
- **Type Safety**: Ensure all new code passes the type check:
  ```bash
  npx tsc --noEmit
  ```

## Project Architecture

Forge is built on a modular "Multi-Agent" architecture. When contributing new features, identify which agent or utility the logic belongs to:

- `src/agents/planner.ts`: Logic for decomposing requests into tasks.
- `src/agents/worker.ts`: Logic for file generation and command detection.
- `src/agents/coordinator.ts`: The central orchestrator wiring all modules together.
- `src/utils/memory.ts`: Session storage and filtering.
- `src/utils/crypto.ts`: AES-256 encryption logic.

## Pull Request Process

1. **Create a Feature Branch**: `git checkout -b feature/your-awesome-feature`.
2. **Implement Changes**: Write clean, commented code.
3. **Verify Build**: Run `npx tsc --noEmit` to ensure no type errors.
4. **Update Documentation**: If you add new commands or features, update `README.md` and any relevant documentation.
5. **Submit PR**: Provide a clear description of the changes and what problem they solve.

## Task Graph Guidelines

If you are modifying the `Planner` agent, ensure that:
- Every task has a unique `id`.
- Every task includes a `fileOutput` (we are a file-generation CLI).
- Tasks are logically ordered via `dependencies`.
- Descriptions are clear and specific (required for Evolution Mode).

## Bug Reports & Feature Requests

Please use the GitHub Issue tracker to report bugs or suggest new features. For bugs, include:
- Your OS and Node.js version.
- The LLM provider (Ollama or OpenRouter) and the model used.
- A clear description of the steps to reproduce the issue.

---

*Happy Coding! Forge the future.*
