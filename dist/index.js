"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ui_js_1 = require("./utils/ui.js");
const prompt_js_1 = require("./utils/prompt.js");
const prompt = __importStar(require("@clack/prompts"));
const coordinator_js_1 = require("./agents/coordinator.js");
const router_js_1 = require("./agents/router.js");
const memory_js_1 = require("./utils/memory.js");
const gacha_js_1 = require("./utils/gacha.js");
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
const path_1 = require("path");
const fs_1 = require("fs");
process.removeAllListeners("SIGINT");
process.removeAllListeners("SIGTERM");
let config = {
    provider: "ollama",
    model: "qwen2.5-coder:1.5b",
};
const coordinator = new coordinator_js_1.Coordinator();
const router = new router_js_1.IntentRouter();
const memory = new memory_js_1.MemoryManager();
const gacha = new gacha_js_1.GachaManager();
function showHelp() {
    console.log();
    console.log(chalk_1.default.bold.hex("#74B9FF")("  ⚡ Forge CLI — Command Reference"));
    console.log(chalk_1.default.dim("  ─────────────────────────────────────────"));
    console.log();
    const commands = [
        { cmd: "/help", desc: "Show this command reference" },
        { cmd: "/model", desc: "Switch LLM provider (Ollama / OpenRouter) and select a model" },
        { cmd: "/create", desc: "Scaffold a new project (React, Vite, Next.js, Express)" },
        { cmd: "/anime", desc: "Open the daily loot box or view your character collection" },
        { cmd: "/buddy", desc: "Set an Anime character as your chat companion" },
        { cmd: "/clear", desc: "Clear the terminal screen" },
        { cmd: "/memory", desc: "Show memory stats (entries count, file size)" },
    ];
    for (const { cmd, desc } of commands) {
        console.log(`  ${chalk_1.default.cyan.bold(cmd.padEnd(12))} ${chalk_1.default.white(desc)}`);
    }
    console.log();
    console.log(chalk_1.default.dim("  Any other input is analyzed by the Intent Router:"));
    console.log(chalk_1.default.dim("  • Conversational → Chat Mode (streaming response)"));
    console.log(chalk_1.default.dim("  • Build/Create   → Multi-agent pipeline (generates files)"));
    console.log();
}
async function handleModelSelection() {
    const savedModelsPath = (0, path_1.join)(process.cwd(), "workspace", "saved_models.json");
    let savedModels = [];
    if ((0, fs_1.existsSync)(savedModelsPath)) {
        try {
            savedModels = JSON.parse((0, fs_1.readFileSync)(savedModelsPath, "utf-8"));
        }
        catch { }
    }
    const options = [];
    if (savedModels.length > 0) {
        savedModels.forEach((m, i) => {
            options.push({ value: `saved:${i}`, label: `💾 ${m.provider} (${m.model})` });
        });
    }
    options.push({ value: "ollama", label: "Ollama (New)" });
    options.push({ value: "openrouter", label: "OpenRouter (New)" });
    const selection = await prompt.select({
        message: "Select LLM Provider",
        options,
    });
    if (prompt.isCancel(selection))
        return;
    let provider = "";
    let modelStr = "";
    if (typeof selection === "string" && selection.startsWith("saved:")) {
        const idx = parseInt(selection.split(":")[1]);
        provider = savedModels[idx].provider;
        modelStr = savedModels[idx].model;
    }
    else {
        provider = selection;
        if (provider === "ollama") {
            const resp = await prompt.text({
                message: "Enter Ollama model name",
                initialValue: "qwen2.5-coder:1.5b",
            });
            if (prompt.isCancel(resp))
                return;
            modelStr = resp;
        }
        else {
            const resp = await prompt.text({
                message: "Enter OpenRouter model name",
                initialValue: "openai/gpt-4o",
            });
            if (prompt.isCancel(resp))
                return;
            modelStr = resp;
        }
        // Save newly entered model
        const exists = savedModels.some(s => s.provider === provider && s.model === modelStr);
        if (!exists) {
            savedModels.push({ provider, model: modelStr });
            if (!(0, fs_1.existsSync)((0, path_1.join)(process.cwd(), "workspace"))) {
                (0, fs_1.mkdirSync)((0, path_1.join)(process.cwd(), "workspace"));
            }
            (0, fs_1.writeFileSync)(savedModelsPath, JSON.stringify(savedModels, null, 2), "utf-8");
        }
    }
    config.provider = provider;
    config.model = modelStr;
    prompt.log.success(`Switched to ${config.provider} (${config.model})`);
}
async function handleCreateProject() {
    const framework = await prompt.select({
        message: "Select a framework to scaffold",
        options: [
            { value: "vanilla", label: "📄 Vanilla HTML/CSS/JS" },
            { value: "react-bun", label: "⚡ React (Bun)" },
            { value: "vite", label: "🚀 Vite (React/Vue/Svelte)" },
            { value: "nextjs", label: "▲ Next.js" },
            { value: "express", label: "🟢 Express.js" },
        ],
    });
    if (prompt.isCancel(framework))
        return;
    const projectName = await prompt.text({
        message: "Enter project name",
        placeholder: "my-awesome-app",
        validate: (value) => {
            if (!value || value.trim().length === 0)
                return "Project name is required";
            if (/[^a-zA-Z0-9-_]/.test(value))
                return "Use only letters, numbers, hyphens, and underscores";
        },
    });
    if (prompt.isCancel(projectName))
        return;
    const name = projectName.trim();
    const projectDir = (0, path_1.join)(process.cwd(), "workspace", name);
    // Create directory
    if ((0, fs_1.existsSync)(projectDir)) {
        prompt.log.warn(`Directory workspace/${name} already exists.`);
        const overwrite = await prompt.confirm({
            message: "Continue anyway?",
            initialValue: false,
        });
        if (!overwrite || prompt.isCancel(overwrite))
            return;
    }
    (0, fs_1.mkdirSync)(projectDir, { recursive: true });
    const s = prompt.spinner();
    try {
        switch (framework) {
            case "react-bun": {
                s.start("Scaffolding React app with Bun...");
                (0, child_process_1.execSync)("bun init -y", { cwd: projectDir, stdio: "pipe" });
                s.stop("Bun project initialized!");
                prompt.log.success(`Project created at: ${chalk_1.default.cyan(`workspace/${name}`)}`);
                prompt.log.info(chalk_1.default.dim("Next steps:"));
                console.log(`  ${chalk_1.default.cyan("$")} cd workspace/${name}`);
                console.log(`  ${chalk_1.default.cyan("$")} bun install`);
                console.log(`  ${chalk_1.default.cyan("$")} bun run dev`);
                break;
            }
            case "vite": {
                const viteTemplate = await prompt.select({
                    message: "Select Vite template",
                    options: [
                        { value: "react-ts", label: "React + TypeScript" },
                        { value: "react", label: "React" },
                        { value: "vue-ts", label: "Vue + TypeScript" },
                        { value: "vue", label: "Vue" },
                        { value: "svelte-ts", label: "Svelte + TypeScript" },
                        { value: "vanilla-ts", label: "Vanilla + TypeScript" },
                    ],
                });
                if (prompt.isCancel(viteTemplate))
                    return;
                s.start(`Scaffolding Vite (${viteTemplate}) project...`);
                (0, child_process_1.execSync)(`npx -y create-vite@latest ./ --template ${viteTemplate}`, {
                    cwd: projectDir,
                    stdio: "pipe",
                });
                s.stop("Vite project created!");
                prompt.log.success(`Project created at: ${chalk_1.default.cyan(`workspace/${name}`)}`);
                prompt.log.info(chalk_1.default.dim("Next steps:"));
                console.log(`  ${chalk_1.default.cyan("$")} cd workspace/${name}`);
                console.log(`  ${chalk_1.default.cyan("$")} npm install`);
                console.log(`  ${chalk_1.default.cyan("$")} npm run dev`);
                break;
            }
            case "nextjs": {
                s.start("Scaffolding Next.js project...");
                (0, child_process_1.execSync)(`npx -y create-next-app@latest ./ --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm`, { cwd: projectDir, stdio: "pipe" });
                s.stop("Next.js project created!");
                prompt.log.success(`Project created at: ${chalk_1.default.cyan(`workspace/${name}`)}`);
                prompt.log.info(chalk_1.default.dim("Next steps:"));
                console.log(`  ${chalk_1.default.cyan("$")} cd workspace/${name}`);
                console.log(`  ${chalk_1.default.cyan("$")} npm run dev`);
                break;
            }
            case "express": {
                s.start("Scaffolding Express project...");
                (0, child_process_1.execSync)("npm init -y", { cwd: projectDir, stdio: "pipe" });
                (0, child_process_1.execSync)("npm install express", { cwd: projectDir, stdio: "pipe" });
                // Create a basic index.js
                const fs = await import("fs");
                fs.writeFileSync((0, path_1.join)(projectDir, "index.js"), `const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express!' });
});

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});
`, "utf-8");
                s.stop("Express project created!");
                prompt.log.success(`Project created at: ${chalk_1.default.cyan(`workspace/${name}`)}`);
                prompt.log.info(chalk_1.default.dim("Next steps:"));
                console.log(`  ${chalk_1.default.cyan("$")} cd workspace/${name}`);
                console.log(`  ${chalk_1.default.cyan("$")} node index.js`);
                break;
            }
            case "vanilla": {
                s.start("Scaffolding vanilla HTML/CSS/JS project...");
                const fs = await import("fs");
                fs.mkdirSync((0, path_1.join)(projectDir, "css"), { recursive: true });
                fs.mkdirSync((0, path_1.join)(projectDir, "js"), { recursive: true });
                fs.writeFileSync((0, path_1.join)(projectDir, "index.html"), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <link rel="stylesheet" href="./css/styles.css">
</head>
<body>
  <header>
    <h1>Welcome to ${name}</h1>
  </header>
  <main>
    <p>Edit index.html, css/styles.css, and js/script.js to get started.</p>
  </main>
  <script src="./js/script.js"></script>
</body>
</html>
`, "utf-8");
                fs.writeFileSync((0, path_1.join)(projectDir, "css", "styles.css"), `/* ${name} — Styles */\n\n* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n  min-height: 100vh;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  background: #0f0f0f;\n  color: #e0e0e0;\n}\n\nh1 {\n  font-size: 2.5rem;\n  margin-bottom: 1rem;\n  background: linear-gradient(135deg, #667eea, #764ba2);\n  -webkit-background-clip: text;\n  -webkit-text-fill-color: transparent;\n}\n\np {\n  color: #aaa;\n  font-size: 1.1rem;\n}\n`, "utf-8");
                fs.writeFileSync((0, path_1.join)(projectDir, "js", "script.js"), `// ${name} — JavaScript\n\ndocument.addEventListener('DOMContentLoaded', () => {\n  console.log('${name} loaded successfully!');\n});\n`, "utf-8");
                s.stop("Vanilla project created!");
                prompt.log.success(`Project created at: ${chalk_1.default.cyan(`workspace/${name}`)}`);
                prompt.log.info(chalk_1.default.dim("Next steps:"));
                console.log(`  ${chalk_1.default.cyan("$")} cd workspace/${name}`);
                console.log(`  ${chalk_1.default.cyan("$")} Open index.html in your browser`);
                break;
            }
        }
    }
    catch (error) {
        s.stop("Scaffolding failed.");
        prompt.log.error(error.message || "Failed to scaffold project.");
    }
}
async function handleAnimeMenu() {
    const action = await prompt.select({
        message: "Anime Lootbox Menu",
        options: [
            { value: "open", label: "🎁 Open Daily Box" },
            { value: "view", label: "📜 View Collection" },
            { value: "cancel", label: "Cancel" },
        ],
    });
    if (action === "open") {
        const result = gacha.openDailyBox();
        if (result.success) {
            prompt.log.success(chalk_1.default.green.bold(result.message));
        }
        else {
            prompt.log.warn(chalk_1.default.yellow(result.message));
        }
    }
    else if (action === "view") {
        const coll = gacha.getCollection();
        if (coll.length === 0) {
            prompt.log.info("You haven't unlocked any characters yet!");
        }
        else {
            prompt.log.info(`Owned (${coll.length}):\n${chalk_1.default.cyan(coll.join(", "))}`);
        }
    }
}
async function handleBuddyMenu() {
    const coll = gacha.getCollection();
    if (coll.length === 0) {
        prompt.log.warn("You have no buddies! Type /anime to open a box.");
        return;
    }
    const options = coll.map((c) => ({ value: c, label: c }));
    options.unshift({ value: "none", label: "No Buddy (Default Mode)" });
    const selection = await prompt.select({
        message: "Select your Chat Buddy",
        options,
    });
    if (prompt.isCancel(selection))
        return;
    if (selection === "none") {
        gacha.setActiveBuddy(null);
        (0, ui_js_1.stopGlobalMascot)();
        prompt.log.success("Buddy deactivated.");
    }
    else {
        gacha.setActiveBuddy(selection);
        (0, ui_js_1.startGlobalMascot)(selection);
        prompt.log.success(`You are now chatting with ${chalk_1.default.magenta(selection)}!`);
    }
}
function showMemoryStats() {
    const memories = memory.getMemories();
    const buildCount = memories.filter((m) => m.graph !== null).length;
    const chatCount = memories.filter((m) => m.graph === null).length;
    prompt.log.info(chalk_1.default.bold("📊 Memory Stats"));
    console.log(`  Total entries: ${chalk_1.default.cyan(memories.length.toString())}`);
    console.log(`  Build sessions: ${chalk_1.default.green(buildCount.toString())}`);
    console.log(`  Chat messages: ${chalk_1.default.blue(chatCount.toString())}`);
    if (memories.length > 0) {
        const last = memories[memories.length - 1];
        console.log(`  Last activity: ${chalk_1.default.dim(last.timestamp)}`);
    }
}
async function main() {
    (0, ui_js_1.showIntro)();
    const buddy = gacha.getActiveBuddy() || (0, ui_js_1.getRandomMascotName)();
    (0, ui_js_1.startGlobalMascot)(buddy);
    const buddyStr = buddy ? ` | Buddy: ${chalk_1.default.magenta(buddy)}` : "";
    prompt.log.info(`Model: ${chalk_1.default.cyan(`${config.provider}/${config.model}`)}${buddyStr} | Type ${chalk_1.default.bold("/help")} for commands`);
    while (true) {
        const userReq = await (0, prompt_js_1.autocompleteText)({
            message: "forge ›",
            placeholder: "Ask anything or describe what to build... (/help)",
        });
        if (prompt.isCancel(userReq)) {
            (0, ui_js_1.stopGlobalMascot)();
            (0, ui_js_1.showOutro)("Goodbye!");
            process.exit(0);
        }
        const input = userReq.trim();
        // ── Slash commands ──
        if (input === "/help") {
            showHelp();
            continue;
        }
        if (input === "/model") {
            await handleModelSelection();
            continue;
        }
        if (input === "/create") {
            await handleCreateProject();
            continue;
        }
        if (input === "/anime") {
            await handleAnimeMenu();
            continue;
        }
        if (input === "/buddy") {
            await handleBuddyMenu();
            continue;
        }
        if (input === "/clear") {
            console.clear();
            continue;
        }
        if (input === "/memory") {
            showMemoryStats();
            continue;
        }
        if (input.length === 0)
            continue;
        // Check for unknown slash commands
        if (input.startsWith("/")) {
            prompt.log.warn(`Unknown command: ${chalk_1.default.yellow(input)}. Type ${chalk_1.default.bold("/help")} for available commands.`);
            continue;
        }
        const s = prompt.spinner();
        s.start("Determining intent...");
        try {
            const intent = await router.determineIntent(input, config);
            s.stop(`Intent: ${chalk_1.default.bold.green(intent.toUpperCase())}`);
            if (intent === "chat") {
                const memSum = memory.getMemorySummary();
                const chatStream = router.streamChat(input, memSum, config);
                const buddy = gacha.getActiveBuddy();
                const fullResponse = await (0, ui_js_1.streamSideBySideChat)(chatStream, buddy);
                // Save chat into memory
                memory.saveMemory({
                    timestamp: new Date().toISOString(),
                    request: input,
                    graph: null,
                    results: { chatResponse: fullResponse },
                });
            }
            else {
                const buildSpinner = prompt.spinner();
                buildSpinner.start("Initializing coordinator...");
                await coordinator.processRequest(input, buildSpinner, config);
                buildSpinner.stop("Build completed.");
            }
        }
        catch (error) {
            if (s)
                s.stop("Process failed.");
            prompt.log.error(error.message || "An unknown error occurred.");
        }
    }
}
main().catch(console.error);
