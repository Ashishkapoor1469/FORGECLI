import { TaskGraph, ProviderConfig } from '../types.js';
import { OpenRouterClient } from '../llm/openrouter.js';
import { OllamaClient } from '../llm/ollama.js';

export class Planner {
  private openRouter = new OpenRouterClient();
  private ollama = new OllamaClient();

  async createPlan(request: string, config: ProviderConfig, memorySummary: string): Promise<TaskGraph> {
    const systemPrompt = `You are the PLANNER agent in a multi-agent coding system.
Your job is to read a user request and decompose it into a minimal, atomic task graph.
Identify ALL parallelizable paths explicitly.
Mark inter-task dependencies precisely using task IDs.

Context from previous iterations:
${memorySummary}

Output schema must be strict JSON:
{
  "projectName": "<GENERATE_A_CONTEXTUAL_PROJECT_NAME>",
  "tasks": [
    {
      "id": "task-1",
      "description": "...",
      "dependencies": [],
      "parallel": true,
      "complexity": "low",
      "fileOutput": "src/index.js" // Opt. File route
    }
  ]
}`;

    let graph: TaskGraph;

    if (config.provider === 'openrouter') {
      graph = await this.openRouter.generateJson(request, systemPrompt, config.model) as TaskGraph;
    } else {
      graph = await this.ollama.generateJson(systemPrompt, request, config.model) as TaskGraph;
    }
    
    // Ensure default values safety
    if (!graph || !graph.tasks) {
      graph = { tasks: [] };
    }
    return graph;
  }
}
