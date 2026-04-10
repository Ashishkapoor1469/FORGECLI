"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditorAgent = void 0;
const ollama_js_1 = require("../llm/ollama.js");
const openrouter_js_1 = require("../llm/openrouter.js");
class EditorAgent {
    ollama = new ollama_js_1.OllamaClient();
    openRouter = new openrouter_js_1.OpenRouterClient();
    async patch(fileContent, instructions, config) {
        const lines = fileContent.split('\n');
        const numberedCode = lines.map((l, i) => `${i + 1}| ${l}`).join('\n');
        const systemPrompt = `You are a precision EDITOR agent.
The Code Reviewer has found issues in the provided file.
Your job is to apply the requested changes strictly.

Review Instructions:
${JSON.stringify(instructions, null, 2)}

You must return a JSON payload with precise line edits.
"startLine" and "endLine" are 1-indexed and inclusive.
"replacementCode" must contain the fully working code, correctly indented.

CRITICAL RULES:
1. Do NOT wrap "replacementCode" in markdown triple backticks. Just the raw string!
2. Ensure you replace EXACTLY the lines needed without accidentally deleting adjacent logic.
3. If inserting code, you can use startLine and endLine of the nearest block.

OUTPUT STRICT JSON ONLY:
{
  "patches": [
    {
      "startLine": 10,
      "endLine": 15,
      "replacementCode": "  const newBtn = document.createElement('button');\\n  newBtn.innerText = 'Click Me';"
    }
  ]
}`;
        let result;
        try {
            if (config.provider === "openrouter") {
                result = await this.openRouter.generateJson(systemPrompt, numberedCode, config.model);
            }
            else {
                result = await this.ollama.generateJson(systemPrompt, numberedCode, config.model);
            }
        }
        catch {
            return fileContent; // Fail safe
        }
        if (!result || !Array.isArray(result.patches)) {
            return fileContent; // Fail safe
        }
        // Apply patches backwards to avoid shifting line numbers
        const patches = result.patches;
        patches.sort((a, b) => b.startLine - a.startLine);
        let updatedLines = [...lines];
        for (const patch of patches) {
            if (patch.startLine > 0 && patch.endLine >= patch.startLine) {
                const replaceLines = patch.replacementCode.split('\n');
                // Convert to 0-indexed
                const startIdx = patch.startLine - 1;
                const deleteCount = patch.endLine - patch.startLine + 1;
                // Splice into the array
                updatedLines.splice(startIdx, deleteCount, ...replaceLines);
            }
        }
        return updatedLines.join('\n');
    }
}
exports.EditorAgent = EditorAgent;
