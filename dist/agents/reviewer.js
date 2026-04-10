"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewerAgent = void 0;
const ollama_js_1 = require("../llm/ollama.js");
const openrouter_js_1 = require("../llm/openrouter.js");
class ReviewerAgent {
    ollama = new ollama_js_1.OllamaClient();
    openRouter = new openrouter_js_1.OpenRouterClient();
    async evaluate(globalObjective, taskDescription, fileContent, config) {
        const lines = fileContent.split('\n');
        const numberedCode = lines.map((l, i) => `${i + 1}| ${l}`).join('\n');
        const systemPrompt = `You are a strict CODE REVIEWER agent.
GLOBAL MISSION: ${globalObjective}
CURRENT SPECIFIC TASK: ${taskDescription}

Your job is to read the attached numbered code and determine if it has:
1. 'Placeholder' text (e.g. "Content goes here", "TODO", "Lorem Ipsum").
2. Missing logical implementations required by the mission.
3. Syntax errors or bad coding practices.

If the file perfectly completes the task with robust, production-ready code, return an empty array for "instructions".
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
            let result;
            if (config.provider === "openrouter") {
                result = await this.openRouter.generateJson(systemPrompt, numberedCode, config.model);
            }
            else {
                result = await this.ollama.generateJson(systemPrompt, numberedCode, config.model);
            }
            if (result && Array.isArray(result.instructions)) {
                return result.instructions;
            }
            return [];
        }
        catch {
            // If parsing fails, just fail open to avoid infinite loops
            return [];
        }
    }
}
exports.ReviewerAgent = ReviewerAgent;
