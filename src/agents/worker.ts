import { WorkerOutput, WaveTask, ProviderConfig } from '../types.js';
import { OllamaClient } from '../llm/ollama.js';
import { OpenRouterClient } from '../llm/openrouter.js';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

export class WorkerAgent {
  private ollama = new OllamaClient();
  private openRouter = new OpenRouterClient();

  async execute(
    task: WaveTask, 
    taskDescription: string, 
    context: Record<string, any>, 
    config: ProviderConfig,
    projectName?: string,
    fileOutput?: string,
    directoryManifest?: string[]
  ): Promise<WorkerOutput> {
    
    let pathingInstruction = "";
    if (directoryManifest && directoryManifest.length > 0) {
      pathingInstruction = `GLOBAL PROJECT ARCHITECTURE: ${JSON.stringify(directoryManifest)}
CRITICAL RULE: If you are building an HTML file, DO NOT write inline CSS or inline Javascript. 
You must explicitly use relative paths (e.g. <link rel="stylesheet" href="./styles.css"> or <script src="./scripts.js">) to link to the exact sibling files listed in the Architecture!`;
    }

    const systemPrompt = `You are a precise WORKER agent executing a coding task.
Context from previous tasks: ${JSON.stringify(context, null, 2)}
${pathingInstruction}

Provide the implementation for the following task. 
WARNING: You must output ONLY the raw code inside a single markdown code block (e.g. \`\`\`javascript ... \`\`\`).
Do NOT output any conversational text, explanations, or 'obj' structures.`;

    try {
      let result: string;
      if (config.provider === 'openrouter') {
        result = await this.openRouter.executeTask(systemPrompt, taskDescription, config.model);
      } else {
        result = await this.ollama.executeTask(systemPrompt, taskDescription, config.model);
      }

      // Extract code from markdown block if it exists
      let strippedResult = result.trim();
      const match = strippedResult.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
      if (match && match[1]) {
        strippedResult = match[1].trim();
      } else {
        // Fallback cleanup if model disobeyed and just sent raw text w/ backticks
        strippedResult = strippedResult.replace(/^```[a-z]*\n/gm, '').replace(/```$/gm, '').trim();
      }

      const artifacts: string[] = [];
      if (fileOutput && projectName) {
         // Force routing into the workspace folder
         const fullPath = join(process.cwd(), 'workspace', projectName, fileOutput);
         mkdirSync(dirname(fullPath), { recursive: true });
         writeFileSync(fullPath, strippedResult, 'utf-8');
         artifacts.push(fullPath);
      }

      return {
        task_id: task.task_id,
        agent: task.agent,
        status: 'completed',
        result: strippedResult,
        artifacts: artifacts,
        errors: []
      };
    } catch (e: any) {
      return {
        task_id: task.task_id,
        agent: task.agent,
        status: 'failed',
        result: '',
        artifacts: [],
        errors: [e.message]
      };
    }
  }
}
