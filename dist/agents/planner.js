"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Planner = void 0;
const openrouter_js_1 = require("../llm/openrouter.js");
const ollama_js_1 = require("../llm/ollama.js");
class Planner {
    openRouter = new openrouter_js_1.OpenRouterClient();
    ollama = new ollama_js_1.OllamaClient();
    async createPlan(request, config, memorySummary) {
        const systemPrompt = `You are the PLANNER agent in a multi-agent coding system.
Your job is to read a user request and decompose it into a minimal, atomic task graph.
Each task MUST produce a source code file — never a shell command.

CRITICAL RULES:
1. Every task must have a "fileOutput" that is a real source file path (e.g., "src/index.js", "package.json").
2. NEVER create tasks for "installing dependencies" or "running npm install". Instead, create a task that generates a proper package.json with all needed dependencies listed.
3. NEVER create tasks whose output would be shell commands (npm, mkdir, cd, pip, etc.).
4. Identify ALL parallelizable paths explicitly — tasks with no shared dependencies should run in the same wave.
5. Mark inter-task dependencies precisely using task IDs. Only add a dependency if the task truly needs the output of another task.
6. Use a descriptive, kebab-case projectName (e.g., "express-api-server", "react-todo-app").
7. Keep tasks atomic — one file per task.

Context from previous iterations:
${memorySummary}

Output schema must be strict JSON:
{
  "projectName": "<descriptive-kebab-case-name>",
  "tasks": [
    {
      "id": "task-1",
      "description": "Create the main entry point with Express server setup",
      "dependencies": [],
      "parallel": true,
      "complexity": "low",
      "fileOutput": "src/index.js"
    }
  ]
}`;
        let graph;
        if (config.provider === "openrouter") {
            graph = (await this.openRouter.generateJson(request, systemPrompt, config.model));
        }
        else {
            graph = (await this.ollama.generateJson(systemPrompt, request, config.model));
        }
        // Ensure default values safety
        if (!graph || !graph.tasks) {
            graph = { tasks: [] };
        }
        // Sanitize: remove tasks that have no fileOutput
        graph.tasks = graph.tasks.filter(t => {
            if (!t.fileOutput || t.fileOutput.trim() === '') {
                return false;
            }
            return true;
        });
        // Sanitize: ensure all task IDs are unique
        const seenIds = new Set();
        graph.tasks = graph.tasks.filter(t => {
            if (seenIds.has(t.id))
                return false;
            seenIds.add(t.id);
            return true;
        });
        // Sanitize: remove dependencies that reference non-existent tasks
        const validIds = new Set(graph.tasks.map(t => t.id));
        for (const task of graph.tasks) {
            task.dependencies = (task.dependencies || []).filter(dep => validIds.has(dep));
        }
        return graph;
    }
}
exports.Planner = Planner;
