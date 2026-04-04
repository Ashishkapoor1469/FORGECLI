import { Ollama } from 'ollama';

export class OllamaClient {
  private client: Ollama;

  constructor() {
    this.client = new Ollama({ host: 'http://localhost:11434' });
  }

  async executeTask(systemPrompt: string, prompt: string, model: string): Promise<string> {
    const response = await this.client.chat({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    });
    return response.message.content;
  }

  async *streamTask(systemPrompt: string, prompt: string, model: string): AsyncGenerator<string, void, unknown> {
    const response = await this.client.chat({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      stream: true
    });
    for await (const part of response) {
      yield part.message.content;
    }
  }
  
  async generateJson(systemPrompt: string, prompt: string, model: string): Promise<any> {
    const response = await this.client.chat({
      model: model,
      format: 'json',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    });
    try {
      return JSON.parse(response.message.content);
    } catch (e) {
      throw new Error("Failed to parse Ollama response as JSON.");
    }
  }
}
