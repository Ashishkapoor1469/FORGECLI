import dotenv from "dotenv";
dotenv.config();

export class OpenRouterClient {
  private apiKey: string;

  constructor() {
    const key = process.env.OPENROUTER_API_KEY?.trim();

    console.log("API KEY:", key);

    if (!key) {
      throw new Error("❌ OPENROUTER_API_KEY missing");
    }

    this.apiKey = key;
  }

  private async request(body: any) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
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
  async executeTask(systemPrompt: string, prompt: string, model: string) {
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
  async generateJson(systemPrompt: string, prompt: string, model: string) {
    const content = await this.executeTask(
      systemPrompt + "\nReturn ONLY JSON.",
      prompt,
      model
    );

    try {
      return JSON.parse(content);
    } catch {
      throw new Error("❌ JSON parse failed:\n" + content);
    }
  }

  // 🌊 Streaming
  async *streamTask(systemPrompt: string, prompt: string, model: string) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
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

    if (!res.body) throw new Error("No stream body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(l => l.startsWith("data:"));

      for (const line of lines) {
        const json = line.replace("data:", "").trim();
        if (json === "[DONE]") return;

        try {
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {}
      }
    }
  }
}