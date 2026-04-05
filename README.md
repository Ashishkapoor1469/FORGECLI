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
  - [Command Detection](#command-detection)
  - [Chat Mode](#chat-mode)
- [Providers & Models](#providers--models)
  - [Ollama (Local)](#ollama-local)
  - [OpenRouter (Cloud)](#openrouter-cloud)
  - [Switching Providers](#switching-providers)
- [Memory System](#memory-system)
- [Anime Gacha System](#anime-gacha-system)
  - [/anime Command](#anime-command)
  - [/buddy Command](#buddy-command)
- [File Output](#file-output)
- [Project Structure](#project-structure)
- [Configuration](#configuration)

---

## Features

| Feature | Description |
|---|---|
| 🧠 **Multi-Agent Orchestration** | Planner, Task Manager, Worker agents coordinate automatically |
| 🔀 **Intent Router** | Detects if you want to chat or build — no manual mode switching |
| ⚡ **Parallel Wave Execution** | Tasks are grouped and executed concurrently where possible |
| 🛡️ **Command Detection** | Shell commands are detected and shown to the user — never written to files |
| 💬 **Streaming Chat** | Token-by-token streaming exactly like Claude's UI |
| 🗂️ **Persistent Memory** | All sessions are logged to `memory.json` with automatic trimming |
| 🔌 **Dual Provider Support** | Works with local Ollama models OR cloud OpenRouter models exclusively |
| 📁 **Real File Generation** | Creates actual folders and source files in your `workspace/` directory |
| 🚀 **Project Scaffolding** | `/create` command for React (Bun), Vite, Next.js, and Express |
| 🎮 **Anime Gacha System** | Daily loot boxes to unlock Anime character companions |
| 🦊 **Dynamic Buddy Personas** | Your buddy companion alters the LLM's chat personality |
| 🎨 **Dynamic ASCII Mascots** | Random mascot greets you each boot |
| 🌐 **Model Support** | Works with any Ollama-installed model and any OpenRouter model ID |

---

## Architecture

```
User Input
    │
    ▼
┌─────────────────────┐
│   INTENT ROUTER     │  ── "chat" ──► Stream response directly
└─────────────────────┘
    │ "build"
    ▼
┌─────────────────────┐
│      PLANNER        │  ── Generates a TaskGraph (JSON) with dependencies
└─────────────────────┘     (never generates command tasks — only file tasks)
    │
    ▼
┌─────────────────────┐
│    TASK MANAGER     │  ── Topological sort → Parallel Wave Schedule
└─────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  WAVE EXECUTOR (Coordinator)        │
│  Wave 1: [Task A] [Task B]  ──────► │  Concurrent LLM calls
│  Wave 2: [Task C]           ──────► │  Sequential per wave
└─────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────┐
│   WORKER AGENTS              │
│   - Detect code vs commands  │
│   - Write code to files      │
│   - Show commands to user    │
│   - Save to workspace/       │
└──────────────────────────────┘
    │
    ▼
┌─────────────────────┐
│   MEMORY MANAGER    │  ── Logs full session (auto-trimmed at 100 entries)
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
| `/model` | Switch LLM provider (Ollama / OpenRouter) and select a model |
| `/create` | **Scaffold a new project** — React (Bun), Vite, Next.js, or Express |
| `/anime` | Open the daily loot box or view your character collection |
| `/buddy` | Set an active Anime character as your chat companion |
| `/clear` | Clear the terminal screen |
| `/memory` | Show memory stats (entries count, build/chat breakdown) |

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

- If `"chat"` → streams directly
- If `"build"` → hands off to the Coordinator pipeline
- On LLM error → defaults to `"chat"` as a safe fallback

### The Build Pipeline

**Step 1 — Planning**: The Planner (`src/agents/planner.ts`) reads your request plus your `memory.json` history. It generates a strict `TaskGraph` JSON:

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

**Step 2 — Scheduling**: The Task Manager (`src/agents/taskManager.ts`) topologically sorts tasks into parallel waves:
```
Wave 1: task-1, task-3   (no dependencies → run in parallel)
Wave 2: task-2           (depends on task-1 output)
```

**Step 3 — Execution**: Workers execute all tasks in a wave concurrently. Each worker:
- Receives the task description + outputs of dependency tasks for context
- Receives the full **directory manifest** (all files being created) so HTML workers correctly link CSS/JS via relative paths
- Physically writes the generated code to `workspace/[projectName]/[fileOutput]`

### Command Detection

Workers include a **command detection system** that prevents shell commands from being written to files:

- If the LLM generates output that looks like shell commands (e.g., `npm install express`, `mkdir src`), the worker detects this and marks the output as a **command** instead of code.
- Commands are **collected and displayed** to the user at the end of the build:

```
📋 Commands to run manually:
┌─────────────────────────────────────────
│  $ npm install express body-parser cors
│  $ npm run dev
└─────────────────────────────────────────
Copy and run these commands in your project directory.
```

- This ensures generated files always contain valid source code, not shell commands.

### Chat Mode

When intent is `chat`, Forge streams responses token by token using `async *` generator functions:

```
●  Thinking...    ← spinner while waiting for first token
┌─────────────────────────────
│ Hello! I'm [BuddyName]...   ← text streams in live
└─────────────────────────────
```

Chat responses are also saved to `memory.json` so the AI accumulates context over time.

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

### Switching Providers

Type `/model` at any time during your session:

```
◆ Select LLM Provider
│  ○  Ollama (Local)
│  ●  OpenRouter (Cloud)
└

◆ Enter OpenRouter model name
│  openai/gpt-4o
```

> **Note:** Forge uses *one* provider exclusively per session. There is no automatic fallback mixing. This prevents unpredictable behavior from mixing local and cloud models.

---

## Memory System

Every interaction is persisted to `memory.json`:

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

**Open Daily Box:** Unlocks a random Anime character. **Strictly one box per 24 hours.** The timestamp is saved to `gacha.json`. If you try again too soon:

```
⚠  You must wait 22h 13m before opening another box!
```

**The Roster (28 characters):**
Naruto, Sasuke, Kakashi, Goku, Vegeta, Gohan, Saitama, Genos, Eren, Levi, Mikasa, Gojo, Yuji, Megumi, Luffy, Zoro, Sanji, Gon, Killua, Hisoka, Tanjiro, Nezuko, Zenitsu, Light Yagami, L, Deku, Bakugo, Todoroki

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

State is persisted in `gacha.json` across sessions.

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
│   ├── types.ts              # TypeScript interfaces
│   ├── agents/
│   │   ├── coordinator.ts    # Orchestrates the full pipeline
│   │   ├── planner.ts        # Decomposes requests into TaskGraph
│   │   ├── taskManager.ts    # Topological sort → wave scheduling
│   │   ├── worker.ts         # Executes tasks, detects commands, writes files
│   │   └── router.ts         # Intent detection + chat streaming
│   ├── llm/
│   │   ├── ollama.ts         # Ollama client (local models)
│   │   └── openrouter.ts     # OpenRouter client (cloud models)
│   └── utils/
│       ├── ui.ts             # ASCII mascots, Forge logo, terminal utils
│       ├── memory.ts         # Persistent session memory (memory.json)
│       └── gacha.ts          # Anime loot box & buddy system
├── workspace/                # All generated projects land here
├── memory.json               # Session history (auto-created, auto-trimmed)
├── gacha.json                # Gacha progress (auto-created)
├── .env                      # API keys
├── package.json
└── tsconfig.json
```

---

## Configuration

### Environment Variables (`.env`)

```env
OPENROUTER_API_KEY=sk-or-...
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
| Files written to wrong directory | Ensure you run `npm run dev` from the `FORGECLI/` directory |
| Intent always routes to BUILD | The 1.5b model sometimes fails — try a larger model via `/model` |
| Commands written to files | Fixed — commands are now detected and shown, not written |
| `/create` fails with Bun | Ensure Bun is installed: `curl -fsSL https://bun.sh/install \| bash` |

---

*Built with Node.js, TypeScript, @clack/prompts, chalk, Ollama SDK, and OpenAI SDK.*
