"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaClient = void 0;
const ollama_1 = require("ollama");
function extractJson(raw) {
    const text = (raw || "").trim();
    try {
        return JSON.parse(text);
    }
    catch { }
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/i);
    if (fenceMatch?.[1]) {
        try {
            return JSON.parse(fenceMatch[1].trim());
        }
        catch { }
    }
    const s = text.indexOf("{"), e = text.lastIndexOf("}");
    if (s !== -1 && e > s) {
        try {
            return JSON.parse(text.slice(s, e + 1));
        }
        catch { }
    }
    throw new Error(`Failed to extract JSON from Ollama response:\n${text.slice(0, 300)}`);
}
class OllamaClient {
    newClient() {
        return new ollama_1.Ollama({ host: "http://localhost:11434" });
    }
    async executeTask(systemPrompt, prompt, model) {
        const client = this.newClient();
        const response = await client.chat({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt },
            ],
        });
        return response.message.content;
    }
    async *streamTask(systemPrompt, prompt, model) {
        const client = this.newClient();
        const response = await client.chat({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt },
            ],
            stream: true,
        });
        for await (const part of response) {
            yield part.message.content;
        }
    }
    async generateJson(systemPrompt, prompt, model) {
        // Attempt 1: format:"json" — works on most small local models
        try {
            const client = this.newClient();
            const response = await client.chat({
                model,
                format: "json",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt },
                ],
            });
            return extractJson(response.message.content);
        }
        catch (firstErr) {
            // Attempt 2: no format param — works on cloud-proxied models like glm5:cloud
            try {
                const client = this.newClient();
                const response = await client.chat({
                    model,
                    messages: [
                        {
                            role: "system",
                            content: systemPrompt + "\n\nIMPORTANT: Your response must be ONLY valid JSON. No explanation text, no markdown fences.",
                        },
                        { role: "user", content: prompt },
                    ],
                });
                return extractJson(response.message.content);
            }
            catch (secondErr) {
                throw new Error(`generateJson failed for model "${model}".\nAttempt 1: ${firstErr.message}\nAttempt 2: ${secondErr.message}`);
            }
        }
    }
}
exports.OllamaClient = OllamaClient;
