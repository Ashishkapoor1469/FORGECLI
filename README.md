# ⚡ Forge — AI Multi-Agent CLI System

```
  ███████╗ ██████╗ ██████╗  ██████╗ ███████╗
  ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
  █████╗  ██║   ██║██████╔╝██║  ███╗█████╗  
  ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  
  ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
  ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

**Forge** is a production-grade AI Software Engineering OS that runs directly inside your terminal. It orchestrates intelligent agents across an Event-Based Bus to plan, schedule, generate, test, and version-control software development tasks — with a professional CLI UX inspired by Claude Code and Gemini CLI.

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
  - [Execution Log Box](#execution-log-box)
- [Advanced Features](#advanced-features)
  - [Smart Memory Filtering](#smart-memory-filtering)
  - [Resume & Continue Builds](#resume--continue-builds)
  - [Conflict-Safe Parallel Execution](#conflict-safe-parallel-execution)
  - [Project Evolution Mode](#project-evolution-mode)
  - [Semantic Code Understanding](#semantic-code-understanding)
  - [Intelligent Refactoring](#intelligent-refactoring)
  - [Failure Recovery System](#failure-recovery-system)
  - [Task Validation](#task-validation)
  - [Output Consistency Checking](#output-consistency-checking)
  - [Encrypted Component Registry](#encrypted-component-registry)
  - [Cross-Agent Context Sharing](#cross-agent-context-sharing)
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
| 🧠 **Multi-Tier Agents** | Features Planner, Validator, Task Manager, Tiered Workers, Reviewer, Editor, and TestWriter agents. |
| 🔌 **Event-Based Agent Bus** | Non-blocking execution via `EventEmitter` for robust sub-agent coordination. |
| 🔀 **Intent Router & Clarification** | Detects chat, plan, vs builds. Asks clarification questions (tech stack, styling) if the intent is vague. |
| ⚡ **Multi-Model Routing** | Dynamically selects model per task (Heavy reasoning → Cloud Model; Fast execution → Local Model). |
| 🛡️ **Validator Agent** | Dedicated stage that runs the actual build, checks runtime errors, and broken imports automatically. |
| 🔍 **Advanced Error Localization** | Maps any error to the exact file + line range to isolate the region without reprocessing the full file. |
| 🌱 **Smart File Diff Engine** | Shows a diff-style preview (`--- old` `+++ new`) before applying surgical line-by-line code patches. |
| 🧩 **Replanning System** | On major task failure, regenerates the *entire* plan using current files + error logs instead of just retrying. |
| 💾 **Semantic Code Index** | Uses Local Embeddings to catalog codebase logic into an injected Code Vector space. |
| 🔐 **Goal Progress Tracking** | Tracks overall goal completion % and halts only when functional success is achieved. |
| 📦 **Dependency Safety System** | Checks package health, flags vulnerable/deprecated libraries, and triggers a Pre-Build Safety Prompt. |
| 🚀 **Background Execution Mode** | Runs silently in the background while the user does other things; async logs checkable via `/status`. |
| 🎨 **Professional CLI UX** | Interactive slash-command autocomplete, rotating thinking spinners, and auto-healing terminal resize. |
| 🔧 **Skill Registry** | Reusable AI behavior templates stored in `.forge/skills/manifest.json` with `/skill` management. |
| 🔄 **Pause/Resume Mid-Execution** | Pause, resume, or cancel individual tasks dynamically without losing progress. |
| ⌨️ **CTRL+0 Auto Loop Mode** | Skips all manual confirmations and runs continuously until the master goal is fully achieved. |
| 🐳 **Deployment Generator** | Scaffolds Dockerfiles, `docker-compose.yml`, and CI Github Actions. |
| 💬 **Streaming Chat** | Token-by-token streaming with 85/15 split-pane terminal layout. |
| 🦊 **Dynamic Buddies** | Unlock anime mascots that adjust the conversational persona. |

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
┌──────────────────────────────┐
│   SMART MEMORY FILTER        │  ── Extract project names, file structures, tech stacks
│   + RESUME DETECTION         │  ── Detect incomplete builds → offer to resume
└──────────────────────────────┘
    │
    ▼
┌──────────────────────────────┐
│   SEMANTIC ANALYZER          │  ── Analyze project tech stack, entry points, components
└──────────────────────────────┘
    │
    ▼
┌─────────────────────┐
│      PLANNER        │  ── Generates a TaskGraph (JSON) with dependencies
└─────────────────────┘     + Workspace context + semantic analysis + evolution mode
    │
    ▼
┌──────────────────────────────┐
│   TASK VALIDATOR             │  ── Reject vague tasks, detect cycles, warn file conflicts
└──────────────────────────────┘
    │
    ▼
┌─────────────────────┐
│    TASK MANAGER     │  ── Conflict-safe scheduling (same-file tasks run sequentially)
└─────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  DYNAMIC EXECUTOR (Coordinator)     │
│  Tasks run as soon as deps resolve  │
│  Concurrent LLM calls per wave      │
│  Failure recovery: retry once       │
└─────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────┐
│   WORKER AGENTS              │
│   - Evolution mode (edit)    │
│   - Refactoring detection    │
│   - Detect code vs commands  │
│   - Write code to workspace  │
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
┌──────────────────────────────┐
│   POST-EXECUTION             │
│   - Component registry save  │  ── AES-256 encrypted component catalog
│   - Consistency checker      │  ── Validate HTML/JS cross-file references
│   - Failure report           │  ── List failed tasks + fix suggestions
│   - Memory save (filtered)   │  ── AES-256 encrypted (auto-trimmed at 100)
└──────────────────────────────┘
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

Forge features an **interactive slash-command autocomplete** — just type `/` and a filterable dropdown appears with all available commands. Use **Arrow ↑↓** to navigate, **Tab** to accept inline, and **Enter** to submit.

| Command | Action |
|---|---|
| `/model` | Switch LLM provider (Ollama / OpenRouter), select a model, or load a saved one |
| `/create` | **Scaffold a new project** — Vanilla HTML, React (Bun), Vite, Next.js, or Express |
| `/workspace` | Full workspace panel: scan, list, select projects |
| `/plan <goal>` | Enter **PLAN MODE**: generates a task graph, saves it, and stops without building |
| `/skill` | **Skill Manager**: list, set active, or clear agent skill contexts |
| `/skill list` | Display all registered skills from `.forge/skills/manifest.json` |
| `/skill set <id>` | Force a specific skill's context into every worker prompt |
| `/cd <folder>` | **Switch active workspace** to an existing project in `workspace/` |
| `/rollback <taskId>` | **Revert workspace snapshot** to the point before a specific task ID executed |
| `/status` | **View Observability Dashboard** for Agent metrics, Background execution, and bus states |
| `/anime` | Open the daily loot box or view your character collection |
| `/buddy` | Set an active Anime character as your chat companion |
| `/memory` | Show memory stats (entries count, build/chat breakdown) |
| `/admin` | **Access encrypted vault** (password required) |
| `/clear` | Clear the terminal screen (full scrollback reset) |
| `/help` | Show the full command reference list |

Alternatively, you can launch the API server mode by running:
```bash
forge serve
```
This spawns an HTTP listener on port 8080.

### Natural Language
Any other input is automatically analyzed by the **Intent Router** with a Claude-style rotating thinking indicator (`Thinking...`, `Analyzing your request...`, `Understanding context...`). The system operates across 3 primary modes:
- **CHAT MODE** → Streams direct conversational responses.
- **PLAN MODE (`/plan`)** → Evaluates context & generates a roadmap without building.
- **BUILD MODE** → Triggers the full multi-agent pipeline to generate files.
If input is vague (e.g. "build a todo app"), the Intent Router will automatically ask clarification questions regarding tech stack, styling, and database choices.

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

### Execution Log Box

During multi-agent builds, Forge renders a **Claude-style bordered chat box** in the bottom ~38% of the terminal. The box has a fixed frame with Unicode borders — only the content scrolls upward as new task logs arrive:

```
  ┌─── ⚡ Forge Execution Log ─────────────────────────────────────────┐
  │  ✓ task-1: Code verified as correct.                               │
  │  🔍 task-2: Reviewing generated code...                            │
  │  ✓ task-2: Code verified as correct.                               │
  │  ⚠ task-3: Issues found (Attempt 1/2). Editing...                  │
  │    Fix needed: Missing React import                                │
  │  ✓ task-3: Code verified as correct.                               │
  │  ✓ task-4: Done                                                    │
  │                                                                    │
  └────────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- The box frame (`┌─┐│└─┘`) stays fixed in place — it never scrolls or shifts
- New log lines appear at the bottom; old lines scroll upward
- Long lines are smart-truncated (preserving ANSI color codes) with an `…` ellipsis
- The mascot animation is paused during execution to prevent ANSI write collisions
- After execution completes, the box is cleared and normal terminal output resumes

---

## Advanced Features

Forge includes an **Advanced Features Extension** — a suite of capabilities that make the build system more stable, intelligent, reliable, and realistic.

### Interactive Slash Autocomplete

Inspired by **Claude Code** and **Gemini CLI**, Forge features a real-time filterable slash-command dropdown:

```
◆  forge ›  /sk
  ❯ /skill           Manage Agent Skills
    /status          Show observability dashboard
```

- Type `/` → all 13+ commands appear as dim-gray suggestions
- Continue typing → list filters instantly to matching commands
- **Arrow ↑↓** to navigate, **Tab** to accept inline, **Enter** to submit
- Only the selected item is highlighted in bright cyan; the rest stay low-opacity

### Skill Registry

Forge supports a **Skill System** that lets you define reusable AI behavior templates. Skills are stored in `.forge/skills/manifest.json`:

```json
{
  "react_component": {
    "id": "react_component",
    "version": "1.0",
    "description": "Scaffolds a functional React component",
    "type": "code",
    "successRate": 1.0,
    "runs": 0,
    "executorData": "Always use functional components with arrow functions..."
  }
}
```

**Manage skills via the CLI:**
- `/skill` → Interactive menu (List / Set Active / Clear)
- `/skill list` → Show all registered skills
- `/skill set react_component` → Force that skill's `executorData` into every worker prompt
- When active, the status bar shows: `Model: ollama/glm-5:cloud | Skill: react_component`

### Rotating Thinking Indicator

When processing natural language input, Forge displays a Claude-style rotating spinner with changing messages:

```
⠋ Thinking...
⠙ Analyzing your request...
⠹ Understanding context...
⠸ Processing intent...
⠼ Reading between the lines...
⠴ Evaluating approach...
```

Messages cycle every 1.5 seconds, providing constant visual feedback that the system is working.

### Auto-Healing Terminal Resize

Forge handles terminal resizing gracefully:
- The **85/15 split-pane** layout dynamically recalculates on `process.stdout.on('resize')`
- The **Execution Log Box** clears artifacts and redraws its frame at new dimensions
- The **Mascot Pane** fully repairs itself — no more smeared ASCII art on resize

### Plan Mode (`/plan`)

Generate a complete build roadmap without executing anything:

```
◇  forge › /plan build a login page with React
⠋ Generating Plan Roadmap...

🗺️  Generated Plan Roadmap
  ▪ [task-1] Create package.json with React dependencies
  ▪ [task-2] Create main App component
  ▪ [task-3] Create LoginForm component
  ▪ [task-4] Add CSS styles

✓ Plan saved. Type anything to trigger the build and resume this plan.
```

The plan is saved to encrypted memory. On the next build request, Forge detects the pending plan and offers to resume it.

### Smart Memory Filtering

When accessing memory for LLM prompts, Forge extracts **only** essential context:
- ✅ Project name, file structure, tech stack, completed/failed features
- ❌ Never injects raw logs, full source code, or repeated outputs

If memory is large, it's automatically summarized and **capped at ~2000 characters** to prevent prompt bloat. The raw memory is still available in the Admin Vault — only the LLM context is filtered.

```
Project: express-api-server
Tech: Express, TypeScript, Node.js
Files: src/index.ts, src/routes/auth.ts, package.json (+3 more)
Done: Create main server entry; Add authentication middleware
Failed: Configure WebSocket support
```

### Resume & Continue Builds

If a previous build was incomplete or had failures, Forge detects it automatically:

```
📋 Previous Build Found
  Project: react-dashboard
  Completed: 5/8
  Failed: task-6
  Pending: task-7, task-8
  From: 2026-04-10T15:30:00Z

◆ Resume from last build? (Skip 5 completed tasks)
│  ● Yes
│  ○ No
```

**Behavior:**
- Completed tasks are **skipped entirely** (no re-execution)
- Failed tasks are **retried** with the same context
- New tasks execute normally
- The coordinator pre-populates its state from the saved session

### Conflict-Safe Parallel Execution

Before executing tasks in parallel, the Task Manager checks for **file output collisions**:

```
task-1 → styles.css     ┐
task-2 → styles.css     ┘ CONFLICT → Sequential execution
task-3 → app.js            Safe → Parallel with task-1
```

- If two tasks target the same file, only the first runs; the rest are **deferred** to the next scheduling cycle
- In-progress file claims are also tracked — a new task won't start writing to a file that another worker is currently writing
- Deferred tasks are logged: `⏳ task-2: Deferred (file conflict — waiting for sequential access)`

### Project Evolution Mode

When a project already exists, Forge activates **Evolution Mode** at two levels:

**Planner Level** — The system prompt includes strict directives:
> *"Do NOT create files that already exist — instead, your task description MUST say 'Modify \<filename\>'. Only create genuinely new files."*

**Worker Level** — When existing code is passed:
> *"You are in EVOLUTION mode. Preserve all working logic. Apply minimal, targeted changes. Do NOT rewrite from scratch."*

This prevents the common failure pattern of AI agents blindly regenerating files and breaking existing features.

### Semantic Code Understanding

Before modifying a project, the **Semantic Analyzer** (`src/utils/semanticAnalyzer.ts`) builds a structured understanding:

| Analysis | How |
|---|---|
| **Tech Stack** | Reads `package.json` deps + file extensions |
| **Entry Points** | Identifies `index.ts`, `main.js`, `app.tsx`, etc. |
| **Routes** | Finds files containing `route`, `router`, or `/api/` |
| **Components** | Detects `.tsx`, `.jsx`, `.vue`, `.svelte` files in `src/` |
| **Styles** | Collects `.css`, `.scss`, `.sass`, `.less` files |

This summary is injected into the Planner's context, enabling more informed task decomposition — the LLM knows where logic belongs before creating tasks.

### Intelligent Refactoring

When a task description contains refactoring keywords (`refactor`, `improve`, `optimize`, `clean up`, `simplify`, `restructure`, `modernize`...), the Worker activates **Refactoring Mode**:

- Make **minimal changes** — only modify what needs improvement
- **Preserve all working logic** and behavior
- Do NOT rename public exports or change function signatures unless necessary
- Improve structure, readability, and efficiency without breaking anything

This prevents the common problem of AI agents "improving" code by rewriting it entirely and introducing regressions.

### Failure Recovery System

When a task fails during execution:

1. **Retry once** — The coordinator automatically retries the task with the error message injected into the worker's prompt:
   > *"The previous attempt failed with: 'JSON parse error'. Please fix the issue."*

2. **If retry fails** — Log the failure and **continue executing** other independent tasks. Do not halt the entire pipeline.

3. **Failure Report** — After execution completes, a clear report is printed:

```
❌ Failure Report — 2 task(s) failed:
┌─────────────────────────────────────────
│  task-4
│    Error: Rate limited (429)
│    Fix: Rate limited — wait a few seconds and retry, or switch to a different model.
│  task-7
│    Error: Dependency failed
│    Fix: Fix the upstream dependency task first.
└─────────────────────────────────────────
```

The `suggestFix()` method provides intelligent suggestions based on error type: timeout, rate limit, JSON parse, context length, file permission, etc.

### Task Validation

Before execution begins, the **Task Validator** (`src/agents/taskValidator.ts`) checks the entire task graph:

| Check | Action |
|---|---|
| Missing `fileOutput` | Task **rejected** |
| Empty description | Task **rejected** |
| Invalid dependency reference | Auto-cleaned (removed) |
| Circular dependencies | Detected and **broken** (last dep removed) |
| File output conflicts | **Warned** (handled at runtime by conflict-safe scheduling) |

```
⚠ Task Validation Warnings:
  • [REJECT] task-5: Missing fileOutput — tasks must produce a file.
  • [WARN] Circular dependency detected involving: task-2, task-3. Breaking cycles.
  • [WARN] File conflict: src/index.js is targeted by tasks: task-1, task-4.
```

Rejected tasks are removed from the graph before the user sees the confirmation prompt.

### Output Consistency Checking

After all tasks complete, the **Consistency Checker** (`src/utils/consistencyChecker.ts`) validates cross-file references:

- **HTML files** — Checks `<link href="...">` and `<script src="...">` tags point to files that actually exist in the project
- **JS/TS files** — Checks `import ... from '...'` and `require('...')` resolve to real modules
- **Root-level paths** — Correctly resolves `./styles.css` for root-level HTML files (normalizes `.` directory to empty)
- **Suggestions** — If a broken reference is found, suggests the closest matching file:

```
🔗 Consistency Check — Broken References:
  • src/app.js:3 → ./uitls/helpers
    Did you mean "src/utils/helpers.js"?
  Checked 6 files, 5 clean.
```

### Encrypted Component Registry

Every successfully generated component is tracked in an **AES-256-CBC encrypted catalog** at `workspace/<project>/.forge/components.enc`.

The **Component Registry** (`src/utils/registry.ts`) stores:

| Field | Description |
|---|---|
| `id` | Task ID or UUID |
| `projectName` | Parent project name |
| `filePath` | Relative path to the generated file |
| `description` | Task description from the planner |
| `createdAt` | ISO timestamp of creation |

**How it works:**
- Encryption key derived from `ADMIN_PASSWORD` env var (or a default session key) via SHA-256
- Each write generates a random **16-byte IV** prepended to the ciphertext
- Upsert logic: re-generating a file updates the existing record instead of duplicating
- The catalog is automatically decrypted and injected into Planner/Worker context on the next build

```
workspace/
└── react-todo-app/
    ├── .forge/
    │   └── components.enc    ← AES-256 encrypted JSON catalog
    ├── src/
    │   └── components/
    │       └── ui/
    │           └── Button.tsx
    └── package.json
```

### Cross-Agent Context Sharing

To ensure agents understand what previous steps built, Forge injects decoded component metadata at two levels:

**Planner Level** — The decrypted component registry is appended to `workspaceContext` as `COMPONENT REGISTRY METADATA`. The Planner uses **Rule 14 (Catalog Awareness)** to avoid recreating existing components and correctly reference them in new task dependencies.

**Worker Level** — Each Worker's dependency context map is enriched with `componentMetadata` from the registry. The Worker uses **Rule 10 (Catalog Awareness)** to match exact export signatures, hooks, and prop types from previously generated components.

This prevents the common multi-agent failure of:
- Generating a `Button` component in task-3, then importing it incorrectly in task-7
- Creating duplicate components because the Planner didn't know one already existed
- Import/export signature mismatches between dependent tasks

---

## Terminal Layout

Forge uses an **85/15 split-pane layout** with a dedicated execution log panel:

| Area | Location | Content |
|---|---|---|
| **Main Pane** | Left 85% | Chat responses, build output, Clack prompts |
| **Mascot Pane** | Right 15% | Animated ASCII mascot (paused during builds) |
| **Execution Log Box** | Bottom ~38% | Claude-style bordered chat box for task logs |

- The right pane displays a persistent **animated mascot** (Snowman, Dog, Robot, or your active Buddy) that cycles through animation frames at 500ms intervals
- The divider line is drawn using ANSI escape sequences for clean positioning
- The mascot is positioned at the bottom-right corner to avoid interfering with scrolling content
- **During builds:** The mascot is paused and the Execution Log Box takes over the bottom portion. All task status, review, and error logs render inside the bordered box with fixed frame and scrolling content
- **After builds:** The box is cleared and the mascot resumes

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
| Component registry | `workspace/<project>/.forge/components.enc` | AES-256-CBC encrypted JSON |

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
    "results": { "task-1": { "status": "completed", "result": "...", "lastError": null } }
  }
]
```

**Memory management features:**
- Auto-trimmed at **100 entries** to prevent unbounded growth
- **Smart filtering**: Only project names, file structures, tech stacks, and feature status are sent to the LLM — never raw code or logs
- Context is **capped at ~2000 chars** to prevent prompt bloat
- **Resume detection**: Scans for incomplete builds and offers to resume from the last valid state
- Build and chat entries are tracked separately
- Use `/memory` to see stats

**Key methods in `MemoryManager`:**

| Method | Purpose |
|---|---|
| `getFilteredContext()` | Returns structured `FilteredContext[]` with only essential fields |
| `getFilteredContextString()` | Compact string version for LLM injection (≤2000 chars) |
| `findResumableSession(project?)` | Finds the most recent incomplete build for a project |
| `getMemorySummary()` | Human-readable summary of last 10 entries |
| `getMemories()` | Raw access to all decrypted entries |

The filtered memory is injected into the **Planner's** system prompt, so it naturally builds on prior context without overwhelming the LLM with noise.

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
│   ├── types.ts              # TypeScript interfaces (Task, GlobalState, etc.)
│   ├── agents/
│   │   ├── coordinator.ts    # Orchestrates the full Advanced pipeline
│   │   ├── planner.ts        # Decomposes requests into TaskGraph
│   │   ├── taskManager.ts    # Conflict-safe CPM dynamic scheduler
│   │   ├── taskValidator.ts  # Pre-execution structural graph validation
│   │   ├── worker.ts         # Executes tasks (Evolution, Refactoring rules)
│   │   ├── reviewer.ts       # Audits generated code for bugs
│   │   ├── editor.ts         # Patches issues identified by reviewer
│   │   ├── testWriter.ts     # Auto-generates and runs unit tests
│   │   └── router.ts         # Intent detection + chat streaming
│   ├── engine/
│   │   ├── agentBus.ts       # Non-blocking EventEmitter system
│   │   ├── diffEngine.ts     # AST-lite fast patch generator
│   │   └── pluginManager.ts  # Dynamic loader for .forge/plugins/*.js
│   ├── skills/
│   │   └── skillRegistry.ts  # Manages reusable AI behavior templates
│   ├── llm/
│   │   ├── ollama.ts         # Native Ollama API bindings
│   │   └── openrouter.ts     # Native OpenRouter API bindings
│   └── utils/
│       ├── consistencyChecker.ts     # Cross-file reference validation
│       ├── crypto.ts                 # AES-256 PBKDF encryption core
│       ├── dependencyIntelligence.ts # Real-time NPM package health validator
│       ├── deploymentGen.ts          # Docker, Compose & CI Actions scaffolding
│       ├── fileQueue.ts              # File-lock mutex queue
│       ├── fs.ts                     # File system traversal helpers
│       ├── gacha.ts                  # Anime character lootbox system
│       ├── gitIntegration.ts         # Auto-committer & Snapshot rollback
│       ├── incrementalCache.ts       # SHA256 caching for skip-over speed
│       ├── memory.ts                 # Encrypted conversational + build memory
│       ├── prompt.ts                 # Interactive slash-command autocomplete
│       ├── registry.ts               # Encrypted components tracker
│       ├── secretManager.ts          # Encrypted Vault for env vars
│       ├── semanticAnalyzer.ts       # Pre-build logic indexing
│       ├── ui.ts                     # Split-pane & animated mascot render
│       └── vectorMemory.ts           # Local Embedding semantic database
├── .forge/                   # Encrypted data directory (auto-created)
│   ├── memory.dat            # AES-256 encrypted session memory
│   ├── gacha.dat             # AES-256 encrypted gacha state
│   └── skills/
│       └── manifest.json     # Skill registry definitions
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
| Resume prompt not appearing | Resume only triggers when an active project is set (`/cd` or `/create`) |
| Tasks deferred endlessly | Check for circular dependencies — the validator should break them automatically |
| Consistency check false positives | External URLs and bare npm imports are ignored; only relative paths are checked |
| Failure recovery not helping | Some errors (rate limits, auth) can't be fixed by retry — switch models via `/model` |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

See [LICENSE.md](LICENSE.md) for details.

---

*Built with Node.js, TypeScript, @clack/prompts, chalk, Ollama SDK, OpenAI SDK, and native Node.js crypto.*
