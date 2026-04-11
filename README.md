# ⚡ Forge — AI Multi-Agent CLI System

```
  ███████╗ ██████╗ ██████╗  ██████╗ ███████╗
  ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
  █████╗  ██║   ██║██████╔╝██║  ███╗█████╗  
  ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  
  ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
  ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

**Forge** is a production-grade multi-agent AI coding system that runs directly inside your terminal. Inspired by Claude Code, it orchestrates intelligent agents to plan, schedule, and execute software development tasks — generating real files in your workspace.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [CLI Commands](#cli-commands)
- [How It Works](#how-it-works)
  - [Intent Routing](#intent-routing)
  - [The Build Pipeline](#the-build-pipeline)
  - [Self-Correction Loop (Reviewer + Editor)](#self-correction-loop-reviewer--editor)
  - [Workspace Context Awareness](#workspace-context-awareness)
  - [Command Detection & Auto-Execution](#command-detection--auto-execution)
  - [Chat Mode](#chat-mode)
- [Terminal Layout](#terminal-layout)
- [Providers & Models](#providers--models)
  - [Ollama (Local)](#ollama-local)
  - [OpenRouter (Cloud)](#openrouter-cloud)
  - [Saved Models](#saved-models)
  - [Switching Providers](#switching-providers)
- [Security & Encryption](#security--encryption)
- [Memory System](#memory-system)
- [Anime Gacha System](#anime-gacha-system)
  - [/anime Command](#anime-command)
  - [/buddy Command](#buddy-command)
- [Admin Vault](#admin-vault)
- [File Output](#file-output)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

---

## Features

| Feature | Description |
|---|---|
| 🧠 **Multi-Agent Orchestration** | Planner, Task Manager, Worker, Reviewer, and Editor agents coordinate automatically |
| 🔀 **Intent Router** | Detects if you want to chat or build — no manual mode switching |
| ⚡ **Parallel Wave Execution** | Tasks are grouped and executed concurrently where possible |
| 🔍 **Self-Correction Loop** | Reviewer agent audits generated code; Editor agent patches issues automatically |
| 🗂️ **Workspace Context Awareness** | Reads existing project files before planning to enable intelligent edits |
| 🛡️ **AES-256 Encrypted Storage** | Memory and gacha state are encrypted at rest with file-level locking |
| 🔐 **Admin Vault** | Password-protected admin panel for managing encrypted data |
| 💬 **Streaming Chat** | Token-by-token streaming with 85/15 split-pane terminal layout |
| 🗂️ **Persistent Memory** | Sessions logged to encrypted `.forge/memory.dat` with automatic trimming |
| 🔌 **Dual Provider Support** | Works with local Ollama models OR cloud OpenRouter models |
| 💾 **Saved Models** | Remembers previously used models for quick switching |
| 📁 **Real File Generation** | Creates actual folders and source files in your `workspace/` directory |
| 🚀 **Project Scaffolding** | `/create` command for Vanilla HTML, React (Bun), Vite, Next.js, and Express |
| ⚡ **Auto Command Execution** | AI-suggested commands can be run automatically with user approval |
| 📂 **Workspace Switching** | `/cd` command to switch active project context |
| 🎮 **Anime Gacha System** | Daily loot boxes to unlock Anime character companions |
| 🦊 **Dynamic Buddy Personas** | Your buddy companion alters the LLM's chat personality |
| 🎨 **Animated ASCII Mascots** | Persistent animated mascot in the right pane of a split terminal |

---

## Architecture

```
User Input
    │
    ▼
┌─────────────────────┐
│   INTENT ROUTER     │  ── "chat" ──► Stream response directly (85/15 split pane)
└─────────────────────┘
    │ "build"
    ▼
┌─────────────────────┐
│      PLANNER        │  ── Generates a TaskGraph (JSON) with dependencies
└─────────────────────┘     + Workspace context (existing files) injected
    │
    ▼
┌─────────────────────┐
│    TASK MANAGER     │  ── Topological sort → Dynamic dependency-based scheduling
└─────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  DYNAMIC EXECUTOR (Coordinator)     │
│  Tasks run as soon as deps resolve  │
│  Concurrent LLM calls per wave      │
└─────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────┐
│   WORKER AGENTS              │
│   - Detect code vs commands  │
│   - Edit existing files      │
│   - Write code to workspace  │
│   - Show commands to user    │
└──────────────────────────────┘
    │
    ▼
┌──────────────────────────────┐
│   REVIEWER → EDITOR LOOP     │
│   - Reviewer audits code     │
│   - Editor patches issues    │
│   - Up to 2 correction passes│
└──────────────────────────────┘
    │
    ▼
┌─────────────────────┐
│   MEMORY MANAGER    │  ── AES-256 encrypted (auto-trimmed at 100 entries)
└─────────────────────┘
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **npm** or **Bun**
- **Ollama** (for local execution) — [Install here](https://ollama.com/)
- **OpenRouter API Key** (optional, for cloud execution)
- **Bun** (optional, for `/create` React scaffolding) — [Install here](https://bun.sh/)

### Installation

```bash
# Clone or navigate to the project directory
cd FORGECLI

# Install dependencies
npm install

# Create a .env file (required for OpenRouter)
cp .env.example .env
# Edit .env and add: OPENROUTER_API_KEY=your_key_here
```

### Running

```bash
# Start the CLI
npm run dev
```

---

## CLI Commands

You can type these commands at any prompt inside Forge:

| Command | Action |
|---|---|
| `/help` | **Show all available commands** with descriptions |
| `/model` | Switch LLM provider (Ollama / OpenRouter), select a model, or load a saved one |
| `/create` | **Scaffold a new project** — Vanilla HTML, React (Bun), Vite, Next.js, or Express |
| `/cd <folder>` | **Switch active workspace** to an existing project in `workspace/` |
| `/anime` | Open the daily loot box or view your character collection |
| `/buddy` | Set an active Anime character as your chat companion |
| `/clear` | Clear the terminal screen (full scrollback reset) |
| `/memory` | Show memory stats (entries count, build/chat breakdown) |
| `/admin` | **Access encrypted vault** (password required) |

### Natural Language
Any other input is automatically analyzed by the **Intent Router**:
- **Conversational** → Forge enters Chat Mode and streams a direct response.
- **Build/Create task** → Forge triggers the full multi-agent pipeline.

---

## How It Works

### Intent Routing

Every prompt is first passed to the **IntentRouter** (`src/agents/router.ts`). It sends a lightweight JSON request to the active LLM:

```json
{ "intent": "chat" | "build" }
```

- If `"chat"` → streams directly in the 85/15 split pane
- If `"build"` → hands off to the Coordinator pipeline
- On LLM error → defaults to `"chat"` as a safe fallback

### The Build Pipeline

**Step 1 — Planning**: The Planner (`src/agents/planner.ts`) reads your request plus your encrypted `memory.dat` history, and if an active project exists, the planner receives the **full existing file tree** for context-aware planning. It generates a strict `TaskGraph` JSON:

```json
{
  "projectName": "express-api-server",
  "tasks": [
    { "id": "task-1", "description": "Create package.json with Express dependency", "fileOutput": "package.json", "dependencies": [] },
    { "id": "task-2", "description": "Create main server entry point", "fileOutput": "src/index.js", "dependencies": ["task-1"] },
    { "id": "task-3", "description": "Write CSS styles", "fileOutput": "src/styles.css", "dependencies": [] }
  ]
}
```

> **Important**: The planner is instructed to NEVER generate shell command tasks. Every task must produce a real source file.

**Step 2 — Dynamic Scheduling**: The Task Manager (`src/agents/taskManager.ts`) uses dynamic dependency resolution — tasks are launched as soon as their dependencies complete, rather than waiting for an entire wave:
```
task-1, task-3 start immediately (no dependencies)
task-2 starts as soon as task-1 completes
```

**Step 3 — Execution**: Workers execute tasks concurrently. Each worker:
- Receives the task description + outputs of dependency tasks for context
- Receives the full **directory manifest** (all files being created) so HTML workers correctly link CSS/JS via relative paths
- **Reads existing files** from disk if they exist, enabling the LLM to edit rather than overwrite
- Physically writes the generated code to `workspace/[projectName]/[fileOutput]`
- Uses a **file queue** (`src/utils/fileQueue.ts`) to prevent race conditions during parallel writes

### Self-Correction Loop (Reviewer + Editor)

After each Worker produces code, the system runs a **Reviewer → Editor** quality loop:

1. **Reviewer Agent** (`src/agents/reviewer.ts`) — Reads the generated code with line numbers and checks for:
   - Placeholder text (e.g. `"TODO"`, `"Lorem Ipsum"`, `"Content goes here"`)
   - Missing logical implementations required by the task
   - Syntax errors or bad coding practices

2. **Editor Agent** (`src/agents/editor.ts`) — If the Reviewer finds issues, the Editor receives precise line-range fix instructions and generates **surgical patches** (start/end line replacements). Patches are applied in reverse order to avoid line-number shifting.

3. **Loop Limit** — The correction cycle runs up to **2 passes** to prevent infinite loops. If issues persist after 2 passes, the system logs a warning and moves on.

```
Worker produces code
    │
    ▼
Reviewer evaluates ──► No issues? ──► ✓ Verified
    │
    ▼ (issues found)
Editor patches code ──► Re-review (up to 2 passes)
```

### Workspace Context Awareness

When an **active project** is set (via `/create` or `/cd`), the Coordinator:

1. Reads the full directory tree of the existing project using `getDirectoryTree()` (from `src/utils/fs.ts`)
2. Injects the file list into the Planner's prompt with the instruction: *"Edit the existing files instead of creating new ones"*
3. For each task, if the target file already exists on disk, its current content is read and passed to the Worker so the LLM can produce an intelligent edit instead of a blind overwrite

This enables iterative development — you can say *"add authentication to my Express server"* and Forge will modify existing files rather than recreating them.

### Command Detection & Auto-Execution

Workers include a **command detection system** that prevents shell commands from being written to files:

- If the LLM generates output that looks like shell commands (e.g., `npm install express`, `mkdir src`), the worker detects this and marks the output as a **command** instead of code.
- Commands are **collected and displayed** to the user at the end of the build:

```
📋 Commands suggested by AI:
┌─────────────────────────────────────────
│  $ npm install express body-parser cors
│  $ npm run dev
└─────────────────────────────────────────
```

- The user is then prompted: **"Would you like to run these commands automatically?"**
- If confirmed, Forge executes them sequentially in the project directory using `execSync`.

### Chat Mode

When intent is `chat`, Forge streams responses token by token in an 85/15 split-pane layout:

```
┌──────────────────────────────────────────────────────────┐│
│ Hello! I'm your AI assistant. How can I help you today?  ││  /\_/\
│ I can help you with coding, debugging, or building       ││ ( o.o )
│ entire projects from scratch...                          ││  > ^ <
└──────────────────────────────────────────────────────────┘│
```

Chat responses are saved to encrypted `memory.dat` so the AI accumulates context over time.

---

## Terminal Layout

Forge uses an **85/15 split-pane layout**:

| Left Pane (85%) | Right Pane (15%) |
|---|---|
| Chat responses, build output, prompts | Animated ASCII mascot |

- The right pane displays a persistent **animated mascot** (Snowman, Dog, Robot, or your active Buddy) that cycles through animation frames at 500ms intervals
- The divider line is drawn using ANSI escape sequences for clean positioning
- The mascot is positioned at the bottom-right corner to avoid interfering with scrolling content

---

## Providers & Models

### Ollama (Local)

Run models 100% offline. Requires `ollama serve` to be running.

**Recommended models:**
```
qwen2.5-coder:1.5b    # Fast, small (~1GB)
qwen2.5-coder:7b      # Better quality coding
phi3:mini             # General conversations
qwen3:0.6b            # Ultra-light chat
gemma3:270m           # Tiny, blazing fast
```

**Install a model:**
```bash
ollama pull qwen2.5-coder:7b
ollama serve
```

### OpenRouter (Cloud)

Access frontier models. Requires a valid `OPENROUTER_API_KEY` in `.env`.

**Recommended models:**
```
openai/gpt-4o                     # Best general coding assistant
anthropic/claude-3.5-sonnet       # Excellent at planning
google/gemini-flash-1.5           # Fast and cheap
deepseek/deepseek-r1              # Reasoning model with think tokens
meta-llama/llama-3.1-70b-instruct # Open source powerhouse
```

### Saved Models

Forge **remembers every model you've used**. When you type `/model`, previously configured models appear at the top of the selection menu for instant switching:

```
◆ Select LLM Provider
│  ○  💾 openrouter (openai/gpt-4o)
│  ○  💾 ollama (qwen2.5-coder:7b)
│  ○  ❌ Delete a Saved Model
│  ○  Ollama (New)
│  ○  OpenRouter (New)
```

Saved models are persisted in `workspace/saved_models.json`.

### Switching Providers

Type `/model` at any time during your session to switch providers, select a saved model, or configure a new one.

> **Note:** Forge uses *one* provider exclusively per session. There is no automatic fallback mixing. This prevents unpredictable behavior from mixing local and cloud models.

---

## Security & Encryption

Forge encrypts all persistent user data at rest using **AES-256-CBC** encryption:

| Data | Storage Path | Format |
|---|---|---|
| Session memory | `.forge/memory.dat` | Encrypted binary |
| Gacha state | `.forge/gacha.dat` | Encrypted binary |

**How it works:**
- Encryption uses `aes-256-cbc` with a key derived via `scryptSync` (PBKDF)
- Each write generates a random **16-byte IV** prepended to the ciphertext
- Files are **locked to read-only** (`chmod 444`) after every write to prevent tampering
- Files are temporarily unlocked (`chmod 666`) only during write operations

> **Note:** The `.forge/` directory is automatically created on first run and should be added to `.gitignore`.

---

## Memory System

Every interaction is persisted to `.forge/memory.dat` (AES-256 encrypted):

```json
[
  {
    "timestamp": "2026-04-04T05:00:00Z",
    "request": "Build an express server",
    "graph": { "projectName": "express-api-server", "tasks": [...] },
    "results": { "task-1": { "status": "completed", "result": "..." } }
  }
]
```

**Memory management features:**
- Auto-trimmed at **100 entries** to prevent unbounded growth
- Only the **last 10 entries** are injected into LLM context prompts
- Build and chat entries are tracked separately
- Use `/memory` to see stats

The memory is injected into the **Planner's** system prompt, so it naturally builds on prior context:
> "In our previous session, you built an Express server. Now extending it with auth..."

---

## Anime Gacha System

### /anime Command

Type `/anime` to access the loot box system:

```
◆ Anime Lootbox Menu
│  ○  🎁 Open Daily Box
│  ○  📜 View Collection
│  ○  Cancel
```

**Open Daily Box:** Unlocks a random Anime character. **Strictly one box per 24 hours.** The timestamp is saved to `.forge/gacha.dat` (encrypted). If you try again too soon:

```
⚠  You must wait 22h 13m before opening another box!
```

**The Roster (28 characters):**
Naruto Uzumaki, Sasuke Uchiha, Kakashi Hatake, Goku, Vegeta, Gohan, Saitama, Genos, Eren Yeager, Levi Ackerman, Mikasa Ackerman, Satoru Gojo, Yuji Itadori, Megumi Fushiguro, Monkey D. Luffy, Roronoa Zoro, Sanji, Gon Freecss, Killua Zoldyck, Hisoka, Tanjiro Kamado, Nezuko Kamado, Zenitsu Agatsuma, Light Yagami, L Lawliet, Izuku Midoriya, Katsuki Bakugo, Shoto Todoroki

### /buddy Command

After unlocking characters, set one as your active chat companion:

```
◆ Select your Chat Buddy
│  ○  No Buddy (Default Mode)
│  ●  Levi Ackerman
│  ○  Gojo Satoru
```

Once a buddy is active, the chat system prompt transforms. Say `hi` and the AI will respond as them:
> *"Tch. Don't waste my time with greetings. What do you need?"* — **Levi Ackerman**

The active buddy also appears as the **animated mascot** in the right pane. State is persisted in encrypted `.forge/gacha.dat` across sessions.

---

## Admin Vault

Type `/admin` to access the password-protected admin panel:

```
◆ Enter Admin Password:
│  ********
```

The default password is `admin123` (configurable via `ADMIN_PASSWORD` environment variable).

**Admin Options:**

| Option | Description |
|---|---|
| Read Encrypted Memory | Decrypt and display all stored session memories |
| Clear Encrypted Memory | Permanently wipe all memories (re-encrypts empty state) |
| Read Encrypted Gacha State | Decrypt and display gacha progress |
| Reset Gacha State | Wipe all unlocked characters and reset the timer |

---

## File Output

All generated projects are saved inside the `workspace/` directory:

```
FORGECLI/
└── workspace/
    ├── express-api-server/
    │   ├── package.json
    │   └── src/
    │       └── index.js
    └── react-todo-app/
        ├── index.html
        └── src/
            ├── styles.css
            └── app.js
```

The AI is explicitly instructed to use relative paths when linking files:
```html
<link rel="stylesheet" href="./styles.css">
<script src="./scripts.js"></script>
```

---

## Project Structure

```
FORGECLI/
├── src/
│   ├── index.ts              # CLI entry point & REPL loop
│   ├── types.ts              # TypeScript interfaces (Task, ProviderConfig, etc.)
│   ├── agents/
│   │   ├── coordinator.ts    # Orchestrates the full pipeline + self-correction loop
│   │   ├── planner.ts        # Decomposes requests into TaskGraph
│   │   ├── taskManager.ts    # Dynamic dependency-based scheduling
│   │   ├── worker.ts         # Executes tasks, detects commands, writes files
│   │   ├── router.ts         # Intent detection + chat streaming
│   │   ├── reviewer.ts       # Code quality auditor (placeholder/syntax detection)
│   │   └── editor.ts         # Precision code patcher (line-level edits)
│   ├── llm/
│   │   ├── ollama.ts         # Ollama client (local models)
│   │   └── openrouter.ts     # OpenRouter client (cloud models, streaming)
│   └── utils/
│       ├── ui.ts             # ASCII mascots, split-pane layout, terminal utils
│       ├── memory.ts         # Encrypted persistent memory (.forge/memory.dat)
│       ├── gacha.ts          # Encrypted gacha system (.forge/gacha.dat)
│       ├── crypto.ts         # AES-256-CBC encryption/decryption
│       ├── fs.ts             # Directory tree reader (workspace context)
│       ├── fileQueue.ts      # Thread-safe file write queue
│       └── prompt.ts         # Autocomplete text input utility
├── .forge/                   # Encrypted data directory (auto-created)
│   ├── memory.dat            # AES-256 encrypted session memory
│   └── gacha.dat             # AES-256 encrypted gacha state
├── workspace/                # All generated projects land here
├── .env                      # API keys (OPENROUTER_API_KEY, ADMIN_PASSWORD)
├── .gitignore
├── package.json
├── tsconfig.json
├── LICENSE.md
├── CONTRIBUTING.md
└── SECURITY.md
```

---

## Configuration

### Environment Variables (`.env`)

```env
OPENROUTER_API_KEY=sk-or-...
ADMIN_PASSWORD=your_admin_password    # Optional, defaults to "admin123"
```

### TypeScript Config

The project uses `tsx` for hot-reload development and targets ESM modules:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

### NPM Scripts

```bash
npm run dev     # Start dev server with hot-reload
npm run build   # Compile TypeScript to JavaScript
npm start       # Run compiled output
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `fetch failed` on any prompt | Ensure `ollama serve` is running if using Ollama |
| `Invalid API Key` | Check your `OPENROUTER_API_KEY` in `.env` |
| `OPENROUTER_API_KEY missing` | Create a `.env` file with your key |
| Files written to wrong directory | Ensure you run `npm run dev` from the `FORGECLI/` directory |
| Intent always routes to BUILD | The 1.5b model sometimes fails — try a larger model via `/model` |
| Commands written to files | Fixed — commands are now detected and shown, not written |
| `/create` fails with Bun | Ensure Bun is installed: `curl -fsSL https://bun.sh/install \| bash` |
| Encrypted data corrupted | Use `/admin` → Clear/Reset to re-initialize encrypted state |
| Mascot rendering artifacts | Resize your terminal to at least 80 columns wide |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

See [LICENSE.md](LICENSE.md) for details.

---

*Built with Node.js, TypeScript, @clack/prompts, chalk, log-update, Ollama SDK, OpenAI SDK, and native Node.js crypto.*
