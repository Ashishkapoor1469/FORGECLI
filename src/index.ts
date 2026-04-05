import { showIntro, showOutro } from "./utils/ui.js";
import * as prompt from "@clack/prompts";
import { Coordinator } from "./agents/coordinator.js";
import { ProviderConfig } from "./types.js";
import { IntentRouter } from "./agents/router.js";
import { MemoryManager } from "./utils/memory.js";
import { GachaManager } from "./utils/gacha.js";
import chalk from "chalk";
import { execSync } from "child_process";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";

process.removeAllListeners("SIGINT");
process.removeAllListeners("SIGTERM");

let config: ProviderConfig = {
  provider: "ollama",
  model: "qwen2.5-coder:1.5b",
};

const coordinator = new Coordinator();
const router = new IntentRouter();
const memory = new MemoryManager();
const gacha = new GachaManager();


function showHelp() {
  console.log();
  console.log(chalk.bold.hex("#74B9FF")("  ⚡ Forge CLI — Command Reference"));
  console.log(chalk.dim("  ─────────────────────────────────────────"));
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
    console.log(`  ${chalk.cyan.bold(cmd.padEnd(12))} ${chalk.white(desc)}`);
  }

  console.log();
  console.log(chalk.dim("  Any other input is analyzed by the Intent Router:"));
  console.log(chalk.dim("  • Conversational → Chat Mode (streaming response)"));
  console.log(chalk.dim("  • Build/Create   → Multi-agent pipeline (generates files)"));
  console.log();
}

async function handleModelSelection() {
  const provider = await prompt.select({
    message: "Select LLM Provider",
    options: [
      { value: "ollama", label: "Ollama (Local)" },
      { value: "openrouter", label: "OpenRouter (Cloud)" },
    ],
  });

  if (prompt.isCancel(provider)) return;

  let model;
  if (provider === "ollama") {
    model = await prompt.text({
      message: "Enter Ollama model name",
      initialValue: "qwen2.5-coder:1.5b",
    });
  } else {
    model = await prompt.text({
      message: "Enter OpenRouter model name",
      initialValue: "openai/gpt-4o",
    });
  }

  if (prompt.isCancel(model)) return;

  config.provider = provider as "ollama" | "openrouter";
  config.model = model as string;
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
    prompt.log.success("Buddy deactivated.");
  } else {
    gacha.setActiveBuddy(selection as string);
    prompt.log.success(
      `You are now chatting with ${chalk.magenta(selection)}!`,
    );
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

async function main() {
  showIntro();

  const buddy = gacha.getActiveBuddy();
  const buddyStr = buddy ? ` | Buddy: ${chalk.magenta(buddy)}` : "";
  prompt.log.info(
    `Model: ${chalk.cyan(`${config.provider}/${config.model}`)}${buddyStr} | Type ${chalk.bold("/help")} for commands`,
  );

  while (true) {
    const userReq = await prompt.text({
      message: "forge ›",
      placeholder: "Ask anything or describe what to build... (/help)",
    });

    if (prompt.isCancel(userReq)) {
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
    if (input === "/clear") {
      console.clear();
      continue;
    }
    if (input === "/memory") {
      showMemoryStats();
      continue;
    }

    if (input.length === 0) continue;

    // Check for unknown slash commands
    if (input.startsWith("/")) {
      prompt.log.warn(`Unknown command: ${chalk.yellow(input)}. Type ${chalk.bold("/help")} for available commands.`);
      continue;
    }

    const s = prompt.spinner();
    s.start("Determining intent...");

    try {
      const intent = await router.determineIntent(input, config);
      s.stop(`Intent: ${chalk.bold.green(intent.toUpperCase())}`);

      if (intent === "chat") {
        const memSum = memory.getMemorySummary();
        const chatStream = router.streamChat(input, memSum, config);

        const chatSpinner = prompt.spinner();
        chatSpinner.start("Thinking...");

        let fullResponse = "";
        let isFirstChunk = true;

        for await (const chunk of chatStream) {
          if (isFirstChunk) {
            chatSpinner.stop("Ready:");
            console.log(`\n${chalk.dim("┌─────────────────────────────")}`);
            process.stdout.write("│ ");
            isFirstChunk = false;
          }

          const safeChunk = chunk.replace(/\n/g, "\n│ ");
          process.stdout.write(safeChunk);
          fullResponse += chunk;
        }

        if (isFirstChunk) {
          chatSpinner.stop("Finished.");
          console.log(`\n${chalk.dim("┌─────────────────────────────")}\n│ `);
        }

        console.log(`\n${chalk.dim("└─────────────────────────────")}\n`);

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
      if (s) s.stop("Process failed.");
      prompt.log.error(error.message || "An unknown error occurred.");
    }
  }
}

main().catch(console.error);
