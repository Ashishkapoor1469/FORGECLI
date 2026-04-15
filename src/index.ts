import { showIntro, showOutro, streamSideBySideChat, startGlobalMascot, stopGlobalMascot, getRandomMascotName } from "./utils/ui.js";
import { autocompleteText } from "./utils/prompt.js";
import * as prompt from "@clack/prompts";
import { Coordinator } from "./agents/coordinator.js";
import { ProviderConfig } from "./types.js";
import { IntentRouter } from "./agents/router.js";
import { MemoryManager } from "./utils/memory.js";
import { GachaManager } from "./utils/gacha.js";
import chalk from "chalk";
import { execSync } from "child_process";
import { join } from "path";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { GitIntegration } from "./utils/gitIntegration.js";
import { AgentEventBus } from "./engine/agentBus.js";
import { SkillRegistry } from "./skills/skillRegistry.js";
import http from "http";
process.removeAllListeners("SIGINT");
process.removeAllListeners("SIGTERM");

let config: ProviderConfig = {
  provider: "ollama",
  model: "glm-5:cloud",
};

const coordinator = new Coordinator();
const router = new IntentRouter();
const memory = new MemoryManager();
const gacha = new GachaManager();
const skillRegistry = new SkillRegistry();


function showHelp() {
  console.log();
  console.log(chalk.bold.hex("#74B9FF")("  ⚡ Forge CLI — Command Reference"));
  console.log(chalk.dim("  ─────────────────────────────────────────"));
  console.log();

  const { SLASH_COMMANDS } = require("./utils/prompt.js");
  for (const { cmd, desc } of SLASH_COMMANDS) {
    console.log(`  ${chalk.cyan.bold(cmd.padEnd(16))} ${chalk.white(desc)}`);
  }

  console.log();
  console.log(chalk.dim("  Type / to see interactive suggestions."));
  console.log();
}

async function handleModelSelection() {
  const savedModelsPath = join(process.cwd(), "workspace", "saved_models.json");
  let savedModels: { provider: string, model: string }[] = [];
  if (existsSync(savedModelsPath)) {
    try {
      savedModels = JSON.parse(readFileSync(savedModelsPath, "utf-8"));
    } catch { }
  }

  const options: any[] = [];

  if (savedModels.length > 0) {
    savedModels.forEach((m, i) => {
      options.push({ value: `saved:${i}`, label: `💾 ${m.provider} (${m.model})` });
    });
    options.push({ value: "delete", label: "❌ Delete a Saved Model" });
  }

  options.push({ value: "ollama", label: "Ollama (New)" });
  options.push({ value: "openrouter", label: "OpenRouter (New)" });

  const selection = await prompt.select({
    message: "Select LLM Provider",
    options,
  });

  if (prompt.isCancel(selection)) return;

  let provider = "";
  let modelStr = "";

  if (selection === "delete") {
    const delOptions = savedModels.map((m, i) => ({
      value: i,
      label: `🗑  ${m.provider} (${m.model})`
    }));
    delOptions.push({ value: -1, label: "Cancel" });

    const delTarget = await prompt.select({
      message: "Which model do you want to delete?",
      options: delOptions,
    });

    if (prompt.isCancel(delTarget) || delTarget === -1) return;

    const delIdx = delTarget as number;
    const deletedModel = savedModels.splice(delIdx, 1)[0];
    writeFileSync(savedModelsPath, JSON.stringify(savedModels, null, 2), "utf-8");
    prompt.log.success(`Deleted ${deletedModel.provider} (${deletedModel.model}) from saved list.`);
    return;
  }

  if (typeof selection === "string" && selection.startsWith("saved:")) {
    const idx = parseInt(selection.split(":")[1]);
    provider = savedModels[idx].provider;
    modelStr = savedModels[idx].model;
  } else {
    provider = selection as string;
    if (provider === "ollama") {
      const resp = await prompt.text({
        message: "Enter Ollama model name",
        initialValue: "qwen2.5-coder:1.5b",
      });
      if (prompt.isCancel(resp)) return;
      modelStr = resp as string;
    } else {
      const resp = await prompt.text({
        message: "Enter OpenRouter model name",
        initialValue: "openai/gpt-4o",
      });
      if (prompt.isCancel(resp)) return;
      modelStr = resp as string;
    }

    // Save newly entered model
    const exists = savedModels.some(s => s.provider === provider && s.model === modelStr);
    if (!exists) {
      savedModels.push({ provider, model: modelStr });
      if (!existsSync(join(process.cwd(), "workspace"))) {
        mkdirSync(join(process.cwd(), "workspace"));
      }
      writeFileSync(savedModelsPath, JSON.stringify(savedModels, null, 2), "utf-8");
    }
  }

  config.provider = provider as "ollama" | "openrouter";
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

  if (prompt.isCancel(framework)) return;

  const projectName = await prompt.text({
    message: "Enter project name",
    placeholder: "my-awesome-app",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Project name is required";
      if (/[^a-zA-Z0-9-_]/.test(value)) return "Use only letters, numbers, hyphens, and underscores";
    },
  });

  if (prompt.isCancel(projectName)) return;

  const name = (projectName as string).trim();
  const projectDir = join(process.cwd(), "workspace", name);

  // Create directory
  if (existsSync(projectDir)) {
    prompt.log.warn(`Directory workspace/${name} already exists.`);
    const overwrite = await prompt.confirm({
      message: "Continue anyway?",
      initialValue: false,
    });
    if (!overwrite || prompt.isCancel(overwrite)) return;
  }
  mkdirSync(projectDir, { recursive: true });

  const s = prompt.spinner();

  try {
    switch (framework) {
      case "react-bun": {
        s.start("Scaffolding React app with Bun...");
        execSync("bun init -y", { cwd: projectDir, stdio: "pipe" });
        s.stop("Bun project initialized!");
        prompt.log.success(`Project created at: ${chalk.cyan(`workspace/${name}`)}`);
        prompt.log.info(chalk.dim("Next steps:"));
        console.log(`  ${chalk.cyan("$")} cd workspace/${name}`);
        console.log(`  ${chalk.cyan("$")} bun install`);
        console.log(`  ${chalk.cyan("$")} bun run dev`);
        config.activeProject = name;
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
        if (prompt.isCancel(viteTemplate)) return;

        s.start(`Scaffolding Vite (${viteTemplate}) project...`);
        execSync(`npx -y create-vite@latest ./ --template ${viteTemplate}`, {
          cwd: projectDir,
          stdio: "pipe",
        });
        s.stop("Vite project created!");
        prompt.log.success(`Project created at: ${chalk.cyan(`workspace/${name}`)}`);
        prompt.log.info(chalk.dim("Next steps:"));
        console.log(`  ${chalk.cyan("$")} cd workspace/${name}`);
        console.log(`  ${chalk.cyan("$")} npm install`);
        console.log(`  ${chalk.cyan("$")} npm run dev`);
        config.activeProject = name;
        break;
      }

      case "nextjs": {
        s.start("Scaffolding Next.js project...");
        execSync(
          `npx -y create-next-app@latest ./ --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm`,
          { cwd: projectDir, stdio: "pipe" },
        );
        s.stop("Next.js project created!");
        prompt.log.success(`Project created at: ${chalk.cyan(`workspace/${name}`)}`);
        prompt.log.info(chalk.dim("Next steps:"));
        console.log(`  ${chalk.cyan("$")} cd workspace/${name}`);
        console.log(`  ${chalk.cyan("$")} npm run dev`);
        config.activeProject = name;
        break;
      }

      case "express": {
        s.start("Scaffolding Express project...");
        execSync("npm init -y", { cwd: projectDir, stdio: "pipe" });
        execSync("npm install express", { cwd: projectDir, stdio: "pipe" });
        // Create a basic index.js
        const fs = await import("fs");
        fs.writeFileSync(
          join(projectDir, "index.js"),
          `const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express!' });
});

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});
`,
          "utf-8",
        );
        s.stop("Express project created!");
        prompt.log.success(`Project created at: ${chalk.cyan(`workspace/${name}`)}`);
        prompt.log.info(chalk.dim("Next steps:"));
        console.log(`  ${chalk.cyan("$")} cd workspace/${name}`);
        console.log(`  ${chalk.cyan("$")} node index.js`);
        config.activeProject = name;
        break;
      }

      case "vanilla": {
        s.start("Scaffolding vanilla HTML/CSS/JS project...");
        const fs = await import("fs");
        fs.mkdirSync(join(projectDir, "css"), { recursive: true });
        fs.mkdirSync(join(projectDir, "js"), { recursive: true });

        fs.writeFileSync(
          join(projectDir, "index.html"),
          `<!DOCTYPE html>
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
`,
          "utf-8",
        );

        fs.writeFileSync(
          join(projectDir, "css", "styles.css"),
          `/* ${name} — Styles */\n\n* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n  min-height: 100vh;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  background: #0f0f0f;\n  color: #e0e0e0;\n}\n\nh1 {\n  font-size: 2.5rem;\n  margin-bottom: 1rem;\n  background: linear-gradient(135deg, #667eea, #764ba2);\n  -webkit-background-clip: text;\n  -webkit-text-fill-color: transparent;\n}\n\np {\n  color: #aaa;\n  font-size: 1.1rem;\n}\n`,
          "utf-8",
        );

        fs.writeFileSync(
          join(projectDir, "js", "script.js"),
          `// ${name} — JavaScript\n\ndocument.addEventListener('DOMContentLoaded', () => {\n  console.log('${name} loaded successfully!');\n});\n`,
          "utf-8",
        );

        s.stop("Vanilla project created!");
        prompt.log.success(`Project created at: ${chalk.cyan(`workspace/${name}`)}`);
        prompt.log.info(chalk.dim("Next steps:"));
        console.log(`  ${chalk.cyan("$")} cd workspace/${name}`);
        console.log(`  ${chalk.cyan("$")} Open index.html in your browser`);
        break;
      }
    }
  } catch (error: any) {
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
      prompt.log.success(chalk.green.bold(result.message));
    } else {
      prompt.log.warn(chalk.yellow(result.message));
    }
  } else if (action === "view") {
    const coll = gacha.getCollection();
    if (coll.length === 0) {
      prompt.log.info("You haven't unlocked any characters yet!");
    } else {
      prompt.log.info(
        `Owned (${coll.length}):\n${chalk.cyan(coll.join(", "))}`,
      );
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

  if (prompt.isCancel(selection)) return;

  if (selection === "none") {
    gacha.setActiveBuddy(null);
    stopGlobalMascot();
    prompt.log.success("Buddy deactivated.");
  } else {
    gacha.setActiveBuddy(selection as string);
    startGlobalMascot(selection as string);
    prompt.log.success(
      `You are now chatting with ${chalk.magenta(selection)}!`,
    );
  }
}

async function handleSkillMenu(args: string) {
  if (args.startsWith("list")) {
    const skills = skillRegistry.getAllSkills();
    if (skills.length === 0) {
      prompt.log.warn("No skills found. Use /skill or edit .forge/skills/manifest.json");
      return;
    }
    prompt.log.info(chalk.bold.blue("📜 Active Skills Registry"));
    for (const s of skills) {
      console.log(`  ${chalk.cyan('▪')} ${chalk.bold(s.id)} (${s.type}) — ${chalk.dim(s.description)}`);
    }
    return;
  }

  if (args.startsWith("set ")) {
    const target = args.replace("set ", "").trim();
    const skills = skillRegistry.getAllSkills();
    const exists = skills.find(s => s.id === target);
    if (!exists) {
      prompt.log.error(`Skill '${target}' not found in registry.`);
      return;
    }
    config.activeSkillId = target;
    prompt.log.success(`Forced Active Skill Context: ${chalk.bold.magenta(target)}`);
    return;
  }

  // Interactive Menu Fallback
  const action = await prompt.select({
    message: "Forge Skill Menu",
    options: [
      { value: "list", label: "📜 List all Skills" },
      { value: "set", label: "🎯 Set Active Skill" },
      { value: "clear", label: "🧹 Clear Active Skill" },
      { value: "cancel", label: "Cancel" }
    ]
  });

  if (action === "list") {
    handleSkillMenu("list");
  } else if (action === "set") {
    const skills = skillRegistry.getAllSkills();
    if (skills.length === 0) {
      prompt.log.warn("No skills found!"); return;
    }
    const sel = await prompt.select({
      message: "Select a skill to force context:",
      options: [
        ...skills.map(s => ({ value: s.id, label: `${s.id} - ${s.description}` })),
        { value: "cancel", label: "Cancel" }
      ]
    });
    if (sel !== "cancel" && !prompt.isCancel(sel)) {
      config.activeSkillId = sel as string;
      prompt.log.success(`Locked active skill to: ${sel}`);
    }
  } else if (action === "clear") {
    config.activeSkillId = undefined;
    prompt.log.success("Active skill cleared (auto-resolution enabled).");
  }
}

function showMemoryStats() {
  const memories = memory.getMemories();
  const buildCount = memories.filter((m) => m.graph !== null).length;
  const chatCount = memories.filter((m) => m.graph === null).length;

  prompt.log.info(chalk.bold("📊 Memory Stats"));
  console.log(`  Total entries: ${chalk.cyan(memories.length.toString())}`);
  console.log(`  Build sessions: ${chalk.green(buildCount.toString())}`);
  console.log(`  Chat messages: ${chalk.blue(chatCount.toString())}`);

  if (memories.length > 0) {
    const last = memories[memories.length - 1];
    console.log(`  Last activity: ${chalk.dim(last.timestamp)}`);
  }
}

async function handleAdminMenu() {
  const pass = await prompt.password({
    message: "Enter Admin Password:",
  });

  if (prompt.isCancel(pass)) return;

  const expectedPass = process.env.ADMIN_PASSWORD || "admin123";
  if (pass !== expectedPass) {
    prompt.log.error("Incorrect password! Access denied.");
    return;
  }

  prompt.log.success("Access Granted! Welcome to the Admin Vault.");

  while (true) {
    const action = await prompt.select({
      message: "Admin Options",
      options: [
        { value: "view_memory", label: "Read Encrypted Memory" },
        { value: "clear_memory", label: "Clear Encrypted Memory" },
        { value: "view_gacha", label: "Read Encrypted Gacha State" },
        { value: "reset_gacha", label: "Reset Gacha State" },
        { value: "back", label: "Go Back" },
      ]
    });

    if (action === "back" || prompt.isCancel(action)) break;

    if (action === "view_memory") {
      const mems = memory.getMemories();
      prompt.log.info(chalk.dim(JSON.stringify(mems, null, 2)));
    } else if (action === "clear_memory") {
      const confirm = await prompt.confirm({ message: "Are you SURE you want to permanently delete all memories?" });
      if (confirm && !prompt.isCancel(confirm)) {
        memory.clearMemories();
        prompt.log.success("Memories wiped and re-encrypted.");
      }
    } else if (action === "view_gacha") {
      const state = gacha.getState();
      prompt.log.info(chalk.dim(JSON.stringify(state, null, 2)));
    } else if (action === "reset_gacha") {
      const confirm = await prompt.confirm({ message: "Are you SURE you want to wipe all unlocked characters?" });
      if (confirm && !prompt.isCancel(confirm)) {
        gacha.reset();
        stopGlobalMascot();
        prompt.log.success("Gacha state reset to default.");
      }
    }
  }
}

async function main() {
  showIntro();

  const buddy = gacha.getActiveBuddy() || getRandomMascotName();
  startGlobalMascot(buddy);
  const buddyStr = buddy ? ` | Buddy: ${chalk.magenta(buddy)}` : "";
  const workspaceStr = config.activeProject ? ` | Workspace: ${chalk.green(config.activeProject)}` : "";
  prompt.log.info(
    `Model: ${chalk.cyan(`${config.provider}/${config.model}`)}${workspaceStr}${buddyStr} | Type ${chalk.bold("/")} for commands`,
  );

  // Fallback for non-interactive / direct execution
  const cliArgs = process.argv.slice(2).join(" ").trim();
  if (cliArgs === "serve") {
    prompt.log.info(chalk.bold.green("Starting Forge API Server Mode on port 8080..."));
    const server = http.createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      if (req.method === "GET" && req.url === "/workspace") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", project: config.activeProject || "none" }));
      } else if (req.method === "POST" && req.url === "/build") {
        let body = "";
        req.on("data", chunk => body += chunk.toString());
        req.on("end", async () => {
          try {
            const data = JSON.parse(body);
            // Simulated async dispatch
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "started", request: data.request }));
          } catch(e) {
            res.writeHead(400); res.end();
          }
        });
      } else {
        res.writeHead(404); res.end();
      }
    });
    server.listen(8080);
    return;
  } else if (cliArgs) {
    prompt.log.info(`Executing direct command: ${chalk.green(cliArgs)}`);
    const buildSpinner = prompt.spinner();
    buildSpinner.start("Initializing coordinator...");
    await coordinator.processRequest(cliArgs, buildSpinner, config);
    buildSpinner.stop("Build completed.");
    process.exit(0);
  }

  while (true) {
    const userReq = await autocompleteText({
      message: "forge ›",
      placeholder: "Ask anything or describe what to build... (/help)",
    });

    if (prompt.isCancel(userReq)) {
      stopGlobalMascot();
      showOutro("Goodbye!");
      process.exit(0);
    }

    const input = (userReq as string).trim();

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
    if (input.startsWith("/cd ")) {
      const folder = input.replace("/cd ", "").trim();
      const targetPath = join(process.cwd(), "workspace", folder);
      if (!existsSync(targetPath)) {
        prompt.log.error(`Directory workspace/${folder} does not exist.`);
      } else {
        config.activeProject = folder;
        console.clear();
        showIntro();
        const b = gacha.getActiveBuddy();
        const wsStr = ` | Workspace: ${chalk.green(config.activeProject)}`;
        const bdStr = b ? ` | Buddy: ${chalk.magenta(b)}` : "";
        const skStr = config.activeSkillId ? ` | Skill: ${chalk.yellow(config.activeSkillId)}` : "";
        prompt.log.info(
          `Model: ${chalk.cyan(`${config.provider}/${config.model}`)}${wsStr}${skStr}${bdStr} | Type ${chalk.bold("/help")} for commands`,
        );
        prompt.log.success(`Switched active workspace to ${chalk.cyan(`workspace/${folder}`)}`);
      }
      continue;
    }

    if (input.startsWith("/skill")) {
      const args = input.replace("/skill", "").trim();
      await handleSkillMenu(args);
      continue;
    }

    if (input === "/clear") {
      process.stdout.write('\x1Bc'); // Full terminal reset
      showIntro();
      const activeBuddy = gacha.getActiveBuddy();
      const wsStr = config.activeProject ? ` | Workspace: ${chalk.green(config.activeProject)}` : "";
      const bdStr = activeBuddy ? ` | Buddy: ${chalk.magenta(activeBuddy)}` : "";
      const skStr = config.activeSkillId ? ` | Skill: ${chalk.yellow(config.activeSkillId)}` : "";
      prompt.log.info(
        `Model: ${chalk.cyan(`${config.provider}/${config.model}`)}${wsStr}${skStr}${bdStr} | Type ${chalk.bold("/help")} for commands`,
      );
      continue;
    }
    
    if (input === "/workspace") {
      const wsPath = join(process.cwd(), "workspace");
      if (!existsSync(wsPath)) mkdirSync(wsPath);
      const fs = await import("fs");
      const projects = fs.readdirSync(wsPath, { withFileTypes: true })
                         .filter(d => d.isDirectory())
                         .map(d => d.name);
      
      if (projects.length === 0) {
        prompt.log.warn("No projects found in workspace/ directory. Try /create");
        continue;
      }
      
      const sel = await prompt.select({
        message: "Select a Workspace Project",
        options: [
           ...projects.map(p => ({ value: p, label: `📂 ${p}` })),
           { value: "cancel", label: "Cancel" }
        ]
      });
      if (sel === "cancel" || prompt.isCancel(sel)) continue;
      
      config.activeProject = sel as string;
      console.clear();
      showIntro();
      prompt.log.success(`Currently Active Workspace: ${chalk.cyan.bold(config.activeProject)}`);
      continue;
    }
    
    if (input.startsWith("/plan ")) {
      const goal = input.replace("/plan ", "").trim();
      const s = prompt.spinner();
      s.start("Generating Plan Roadmap...");
      await coordinator.processRequest(goal, s, config, true);
      continue;
    }

    if (input === "/memory") {
      showMemoryStats();
      continue;
    }
    if (input === "/admin") {
      await handleAdminMenu();
      continue;
    }
    if (input.startsWith("/rollback")) {
      const taskId = input.split(" ")[1];
      if (!taskId) { prompt.log.error("Please provide a task ID."); continue; }
      if (!config.activeProject) { prompt.log.error("No active project."); continue; }
      const git = new GitIntegration(config.activeProject);
      if (git.rollback(taskId)) prompt.log.success(`Rolled back to state before ${taskId}.`);
      else prompt.log.error(`Rollback failed or task ID not found in commits.`);
      continue;
    }
    if (input === "/status") {
      prompt.log.info(chalk.bold.yellow("📊 Forge Observability Dashboard"));
      prompt.log.info("Status: " + chalk.green("Online"));
      prompt.log.info("Agent Bus: Active");
      continue;
    }

    if (input.length === 0) continue;

    // Check for unknown slash commands
    if (input.startsWith("/")) {
      prompt.log.warn(`Unknown command: ${chalk.yellow(input)}. Type ${chalk.bold("/")} to see suggestions.`);
      continue;
    }

    // Claude-style rotating thinking messages
    const thinkingMessages = [
      "Thinking...",
      "Analyzing your request...",
      "Understanding context...",
      "Processing intent...",
      "Reading between the lines...",
      "Evaluating approach...",
    ];
    let thinkIdx = 0;
    const s = prompt.spinner();
    s.start(thinkingMessages[0]);
    const thinkInterval = setInterval(() => {
      thinkIdx = (thinkIdx + 1) % thinkingMessages.length;
      s.message(thinkingMessages[thinkIdx]);
    }, 1500);

    try {
      const intent = await router.determineIntent(input, config);
      clearInterval(thinkInterval);
      s.stop(`Intent: ${chalk.bold.green(intent.toUpperCase())}`);

      if (intent === "chat") {
        const memSum = memory.getMemorySummary();
        const chatStream = router.streamChat(input, memSum, config);
        const buddy = gacha.getActiveBuddy();

        const fullResponse = await streamSideBySideChat(chatStream, buddy);

        // Save chat into memory
        memory.saveMemory({
          timestamp: new Date().toISOString(),
          request: input,
          graph: null,
          results: { chatResponse: fullResponse },
        });
      } else {
        const buildSpinner = prompt.spinner();
        buildSpinner.start("Initializing coordinator...");
        await coordinator.processRequest(input, buildSpinner, config);
        buildSpinner.stop("Build completed.");
      }
    } catch (error: any) {
      clearInterval(thinkInterval);
      if (s) s.stop("Process failed.");
      prompt.log.error(error.message || "An unknown error occurred.");
    }
  }
}

main().catch(console.error);
