"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterClient = void 0;
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class OpenRouterClient {
    client;
    constructor() {
        const apiKey = process.env.OPENROUTER_API_KEY || 'dummy_key';
        this.client = new openai_1.default({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: apiKey,
            defaultHeaders: {
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "FORGECLI",
                "Authorization": `Bearer ${apiKey}`
            }
        });
    }
    async generateJson(prompt, systemPrompt, model) {
        const response = await this.client.chat.completions.create({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' }
        });
        try {
            return JSON.parse(response.choices[0].message.content || '{}');
        }
        catch (e) {
            throw new Error("Failed to parse OpenRouter response as JSON.");
        }
    }
    async executeTask(systemPrompt, prompt, model) {
        const response = await this.client.chat.completions.create({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ]
        });
        return response.choices[0].message.content || 'Task result...';
    }
    async *streamTask(systemPrompt, prompt, model) {
        // @ts-expect-error - OpenRouter include_reasoning is not in OpenAI strict types
        const stream = await this.client.chat.completions.create({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            stream: true,
            include_reasoning: true
        });
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.reasoning) {
                yield delta.reasoning;
            }
            if (delta?.content) {
                yield delta.content;
            }
        }
    }
}
exports.OpenRouterClient = OpenRouterClient;
