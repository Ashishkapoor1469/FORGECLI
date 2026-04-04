import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

export class OpenRouterClient {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY || 'dummy_key',
    });
  }

  async generateJson(prompt: string, systemPrompt: string, model: string): Promise<any> {
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
    } catch (e) {
      throw new Error("Failed to parse OpenRouter response as JSON.");
    }
  }

  async executeTask(systemPrompt: string, prompt: string, model: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    });
    return response.choices[0].message.content || 'Task result...';
  }

  async *streamTask(systemPrompt: string, prompt: string, model: string): AsyncGenerator<string, void, unknown> {
    
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
      const delta = chunk.choices[0]?.delta as any;
      
      if (delta?.reasoning) {
        yield delta.reasoning;
      }
      if (delta?.content) {
        yield delta.content;
      }
    }
  }
}
