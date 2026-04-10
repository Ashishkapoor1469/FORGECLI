"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterClient = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class OpenRouterClient {
    apiKey;
    constructor() {
        const key = process.env.OPENROUTER_API_KEY?.trim();
        console.log("API KEY:", key);
        if (!key) {
            throw new Error("❌ OPENROUTER_API_KEY missing");
        }
        this.apiKey = key;
    }
    async request(body) {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/Ashishkapoor1469/FORGECLI",
                "X-Title": "Forge CLI"
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`❌ OpenRouter Error: ${res.status} - ${text}`);
        }
        return res.json();
    }
    // ⚡ Normal task
    async executeTask(systemPrompt, prompt, model) {
        const data = await this.request({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ]
        });
        return data.choices?.[0]?.message?.content || "";
    }
    // 🧠 JSON task
    async generateJson(systemPrompt, prompt, model) {
        const data = await this.request({
            model,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt + "\nIMPORTANT: You must return ONLY valid, parsable JSON." },
                { role: "user", content: prompt }
            ]
        });
        const content = data.choices?.[0]?.message?.content || "";
        try {
            return JSON.parse(content);
        }
        catch {
            // In case the model wrapped it in markdown code blocks
            const cleanJson = content.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
            try {
                return JSON.parse(cleanJson);
            }
            catch {
                throw new Error("❌ JSON parse failed:\n" + content);
            }
        }
    }
    // 🌊 Streaming
    async *streamTask(systemPrompt, prompt, model) {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/Ashishkapoor1469/FORGECLI",
                "X-Title": "Forge CLI"
            },
            body: JSON.stringify({
                model,
                stream: true,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ]
            })
        });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`❌ OpenRouter Stream Error: ${res.status} - ${errorText}`);
        }
        if (!res.body)
            throw new Error("No stream body");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // keep incomplete line in buffer
            for (const line of lines) {
                if (!line.startsWith("data:"))
                    continue;
                const json = line.replace("data:", "").trim();
                if (json === "[DONE]")
                    return;
                try {
                    const parsed = JSON.parse(json);
                    const delta = parsed.choices?.[0]?.delta?.content;
                    if (delta)
                        yield delta;
                }
                catch { }
            }
        }
    }
}
exports.OpenRouterClient = OpenRouterClient;
