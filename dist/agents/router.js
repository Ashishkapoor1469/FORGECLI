"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentRouter = void 0;
const openrouter_js_1 = require("../llm/openrouter.js");
const ollama_js_1 = require("../llm/ollama.js");
const gacha_js_1 = require("../utils/gacha.js");
class IntentRouter {
    openRouter = new openrouter_js_1.OpenRouterClient();
    ollama = new ollama_js_1.OllamaClient();
    gacha = new gacha_js_1.GachaManager();
    async determineIntent(request, config) {
        const systemPrompt = `You are the INTENT ROUTER agent in a CLI tool.
Your job is to determine if the user's request is a conversational query or a request to build/execute a software task.
If the user is saying "hello", asking a question, or discussing concepts, output {"intent": "chat"}.
If the user is asking to create scripts, servers, structures, files, or execute specific multi-agent tasks, output {"intent": "build"}.

Output schema must be strict JSON:
{
  "intent": "chat" | "build"
}`;
        let result;
        try {
            if (config.provider === "openrouter") {
                result = await this.openRouter.generateJson(systemPrompt, request, config.model);
            }
            else {
                result = await this.ollama.generateJson(systemPrompt, request, config.model);
            }
        }
        catch {
            return "chat"; // Fallback to safely route to planner if error
        }
        return result?.intent === "chat" ? "chat" : "build";
    }
    async runChat(request, memorySummary, config) {
        const stream = this.streamChat(request, memorySummary, config);
        let fullResponse = "";
        for await (const chunk of stream)
            fullResponse += chunk;
        return fullResponse;
    }
    async *streamChat(request, memorySummary, config) {
        const buddy = this.gacha.getActiveBuddy();
        let personaStr = "You are a helpful and friendly conversational AI assistant.";
        if (buddy) {
            personaStr = `CRITICAL ROLEPLAY INSTRUCTION: You are physically playing the role of the Anime Character: ${buddy}. 
Respond strictly in their tone, perspective, terminology, and catchphrases. Do not break character. 
Introduce yourself naturally as them if they say 'hello'.`;
        }
        const systemPrompt = `${personaStr}
You are currently in Chat Mode. Talk to the user using natural, conversational language.
CRITICAL INSTRUCTION: DO NOT write code blocks to express conversational responses (e.g., do not write print("hello")). Just say the words!

Context of prior events:
${memorySummary}

Respond directly to the user's prompt in plain text/markdown.`;
        if (config.provider === "openrouter") {
            yield* this.openRouter.streamTask(systemPrompt, request, config.model);
        }
        else {
            yield* this.ollama.streamTask(systemPrompt, request, config.model);
        }
    }
}
exports.IntentRouter = IntentRouter;
