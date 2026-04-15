import { ProviderConfig } from "../types.js";
import { OllamaClient } from "../llm/ollama.js";
import { OpenRouterClient } from "../llm/openrouter.js";
import { execSync } from "child_process";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";

export class TestWriterAgent {
  private ollama = new OllamaClient();
  private openRouter = new OpenRouterClient();

  async generateTests(
    filePath: string,
    codeContent: string,
    config: ProviderConfig,
    projectName: string
  ): Promise<string> {
    const systemPrompt = `You are a strict TestWriter agent.
Your objective is to generate unit tests for the provided source code.
Assume a generic testing framework like Jest or Vitest.
Return ONLY valid test code wrapped in \`\`\`javascript or \`\`\`typescript.`;

    const request = `Generate tests for this code from ${filePath}:\n\n${codeContent}`;

    let result: string;
    if (config.provider === "openrouter") {
      result = await this.openRouter.executeTask(systemPrompt, request, config.model);
    } else {
      result = await this.ollama.executeTask(systemPrompt, request, config.model);
    }

    const match = result.trim().match(/```[a-zA-Z]*\n([\s\S]*?)```/);
    return match ? match[1].trim() : result.trim();
  }

  runTests(projectName: string): boolean {
    const projectPath = join(process.cwd(), "workspace", projectName);
    try {
      execSync("npm test", { cwd: projectPath, stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
}
