import { ProviderConfig } from "../types.js";
import { OllamaClient } from "../llm/ollama.js";
import { OpenRouterClient } from "../llm/openrouter.js";

export interface ReviewInstruction {
  lineRange: string;
  issue: string;
  suggestion: string;
}

export class ReviewerAgent {
  private ollama = new OllamaClient();
  private openRouter = new OpenRouterClient();

  async evaluate(
    globalObjective: string,
    taskDescription: string,
    fileContent: string,
    config: ProviderConfig
  ): Promise<ReviewInstruction[]> {
    
    const lines = fileContent.split('\n');
    const numberedCode = lines.map((l, i) => `${i + 1}| ${l}`).join('\n');

    const systemPrompt = `You are a strict CODE REVIEWER agent.
GLOBAL MISSION: ${globalObjective}
CURRENT SPECIFIC TASK: ${taskDescription}

Your job is to read the attached numbered code and determine if it has:
1. 'Placeholder' text (e.g. "Content goes here", "TODO", "Lorem Ipsum").
2. Missing logical implementations required by the mission.
3. Syntax errors, bad coding practices, or missing 'export' statements.
4. Mismatched or broken module imports - make sure the code specifically compiles and integrates without 'export/import' compilation errors.
5. Missing CSS imports, completely unstyled HTML elements, or poor UI frontend styling.

If the file perfectly completes the task with robust, production-ready, beautiful code, return an empty array for "instructions".
If the file needs fixes, pinpoint the exact line numbers that need modifying and describe how to fix them.

OUTPUT STRICT JSON ONLY:
{
  "instructions": [
    {
      "lineRange": "10-15",
      "issue": "Used generic placeholder text instead of actual feature logic.",
      "suggestion": "Replace the placeholder with a true Javascript event listener building the logic."
    }
  ]
}`;

    try {
      let result: any;
      if (config.provider === "openrouter") {
        result = await this.openRouter.generateJson(systemPrompt, numberedCode, config.model);
      } else {
        result = await this.ollama.generateJson(systemPrompt, numberedCode, config.model);
      }

      if (result && Array.isArray(result.instructions)) {
        return result.instructions;
      }
      return [];
    } catch {
      // If parsing fails, just fail open to avoid infinite loops
      return [];
    }
  }
}
