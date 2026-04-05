import { WorkerOutput, WaveTask, ProviderConfig } from "../types.js";
import { OllamaClient } from "../llm/ollama.js";
import { OpenRouterClient } from "../llm/openrouter.js";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";

// Patterns that indicate the LLM output is a shell command, not code
const COMMAND_PATTERNS = [
  /^(npm|npx|yarn|pnpm|bun)\s+(install|init|create|add|run|exec|start|dev|build|test)/im,
  /^(mkdir|cd|mv|cp|rm|touch|cat|echo|git|curl|wget|chmod|chown)\s+/im,
  /^(pip|pip3|python|python3|ruby|gem|cargo|go|dotnet)\s+/im,
  /^(apt|brew|choco|winget|scoop)\s+(install|update|upgrade)/im,
  /^(docker|docker-compose|kubectl)\s+/im,
  /^(ollama|openssl|ssh|scp)\s+/im,
];

function isShellCommand(text: string): boolean {
  const trimmed = text.trim();
  // If the text has very few lines and matches command patterns, it's a command
  const lines = trimmed.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length > 15) return false; // Too many lines to be just commands

  // Check if the majority of non-empty lines look like commands
  let commandLineCount = 0;
  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine.startsWith("#") || cleanLine.startsWith("//")) continue; // comments
    if (cleanLine === "&&" || cleanLine === "||") continue; // operators
    if (COMMAND_PATTERNS.some((p) => p.test(cleanLine))) {
      commandLineCount++;
    }
  }

  // If most lines are commands, treat the entire output as commands
  const meaningfulLines = lines.filter(
    (l) => !l.trim().startsWith("#") && !l.trim().startsWith("//"),
  );
  return (
    meaningfulLines.length > 0 &&
    commandLineCount / meaningfulLines.length >= 0.5
  );
}

export class WorkerAgent {
  private ollama = new OllamaClient();
  private openRouter = new OpenRouterClient();

  async execute(
    task: WaveTask,
    taskDescription: string,
    context: Record<string, any>,
    config: ProviderConfig,
    projectName?: string,
    fileOutput?: string,
    directoryManifest?: string[],
  ): Promise<WorkerOutput> {
    let pathingInstruction = "";
    if (directoryManifest && directoryManifest.length > 0) {
      pathingInstruction = `GLOBAL PROJECT ARCHITECTURE: ${JSON.stringify(directoryManifest)}
CRITICAL RULE: If you are building an HTML file, DO NOT write inline CSS or inline Javascript. 
You must explicitly use relative paths (e.g. <link rel="stylesheet" href="./styles.css"> or <script src="./scripts.js">) to link to the exact sibling files listed in the Architecture!`;
    }

    const systemPrompt = `You are a precise WORKER agent executing a coding task.
Context from previous tasks: ${JSON.stringify(context, null, 2)}
${pathingInstruction}

CRITICAL RULES:
1. Output ONLY the raw source code for the file being created.
2. Wrap your code in a single markdown code block (e.g. \`\`\`javascript ... \`\`\`).
3. Do NOT output shell commands like "npm install", "mkdir", "cd", etc.
4. Do NOT output conversational text, explanations, or 'obj' structures.
5. If the task is about setting up dependencies, output a valid package.json file with the dependencies listed.
6. Generate REAL, COMPLETE, WORKING code — not placeholders or stubs.`;

    try {
      let result: string;
      if (config.provider === "openrouter") {
        result = await this.openRouter.executeTask(
          systemPrompt,
          taskDescription,
          config.model,
        );
      } else {
        result = await this.ollama.executeTask(
          systemPrompt,
          taskDescription,
          config.model,
        );
      }

      // Extract code from markdown block if it exists
      let strippedResult = result.trim();
      const match = strippedResult.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
      if (match && match[1]) {
        strippedResult = match[1].trim();
      } else {
        // Fallback cleanup if model disobeyed and just sent raw text w/ backticks
        strippedResult = strippedResult
          .replace(/^```[a-z]*\n/gm, "")
          .replace(/```$/gm, "")
          .trim();
      }

      // Detect if the output is a shell command instead of code
      const isCommand = isShellCommand(strippedResult);

      const artifacts: string[] = [];

      if (isCommand) {
        // Don't write commands to files — they'll be displayed to the user
        return {
          task_id: task.task_id,
          agent: task.agent,
          status: "completed",
          result: strippedResult,
          outputType: "command",
          artifacts: [],
          errors: [],
        };
      }

      // It's code — write to file
      if (fileOutput && projectName) {
        const fullPath = join(
          process.cwd(),
          "workspace",
          projectName,
          fileOutput,
        );
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, strippedResult, "utf-8");
        artifacts.push(fullPath);
      }

      return {
        task_id: task.task_id,
        agent: task.agent,
        status: "completed",
        result: strippedResult,
        outputType: "code",
        artifacts,
        errors: [],
      };
    } catch (e: any) {
      return {
        task_id: task.task_id,
        agent: task.agent,
        status: "failed",
        result: "",
        outputType: "code",
        artifacts: [],
        errors: [e.message],
      };
    }
  }
}
