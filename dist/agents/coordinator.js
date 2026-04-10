"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Coordinator = void 0;
const planner_js_1 = require("./planner.js");
const taskManager_js_1 = require("./taskManager.js");
const worker_js_1 = require("./worker.js");
const reviewer_js_1 = require("./reviewer.js");
const editor_js_1 = require("./editor.js");
const memory_js_1 = require("../utils/memory.js");
const ui_js_1 = require("../utils/ui.js");
const prompt = __importStar(require("@clack/prompts"));
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
const path_1 = require("path");
const fs_js_1 = require("../utils/fs.js");
const fs = __importStar(require("fs"));
class Coordinator {
    planner = new planner_js_1.Planner();
    taskManager = new taskManager_js_1.TaskManager();
    worker = new worker_js_1.WorkerAgent();
    reviewer = new reviewer_js_1.ReviewerAgent();
    editor = new editor_js_1.EditorAgent();
    memory = new memory_js_1.MemoryManager();
    async processRequest(request, spinner, config) {
        // Reset state for each new request to avoid stale data
        const state = {
            taskRegistry: {},
            fileManifest: {}
        };
        spinner.message('[PLANNER] Generating task graph...');
        const memorySummary = this.memory.getMemorySummary();
        // Feature: Workspace Context Awareness
        let workspaceContext = "";
        if (config.activeProject) {
            const projectPath = (0, path_1.join)(process.cwd(), "workspace", config.activeProject);
            if (fs.existsSync(projectPath)) {
                const fileTree = (0, fs_js_1.getDirectoryTree)(projectPath);
                workspaceContext = `EXISTING PROJECT ARCHITECTURE:\n${JSON.stringify(fileTree, null, 2)}\nIMPORTANT: Edit the existing files instead of creating new ones if they already exist to achieve the goal.\n`;
            }
        }
        const graph = await this.planner.createPlan(request, config, memorySummary, workspaceContext);
        if (config.activeProject) {
            graph.projectName = config.activeProject;
        }
        spinner.stop('Task Graph generated.');
        if (graph.projectName) {
            prompt.log.info(`Project: ${chalk_1.default.cyan(graph.projectName)}`);
        }
        // Show task overview
        if (graph.tasks.length > 0) {
            prompt.log.info(chalk_1.default.dim('─── Task Plan ───'));
            for (const task of graph.tasks) {
                const deps = task.dependencies.length > 0 ? chalk_1.default.dim(` (depends: ${task.dependencies.join(', ')})`) : '';
                const file = task.fileOutput ? chalk_1.default.green(` → ${task.fileOutput}`) : '';
                prompt.log.info(`  ${chalk_1.default.bold(task.id)}: ${task.description}${file}${deps}`);
            }
        }
        const confirm = await prompt.confirm({
            message: `Execute ${graph.tasks.length} tasks?`,
            initialValue: true
        });
        if (!confirm || prompt.isCancel(confirm)) {
            prompt.cancel('Execution aborted by user.');
            return;
        }
        spinner.start('[TASK MANAGER] Beginning dynamic execution...');
        // Calculate map of all files that will be created
        const directoryManifest = graph.tasks
            .map(t => t.fileOutput)
            .filter((file) => !!file);
        // Collect commands to show user at the end
        const commandsToRun = [];
        const completedIds = new Set();
        const failedIds = new Set();
        const inProgress = new Map();
        spinner.stop('Executing dynamically based on dependencies...');
        while (completedIds.size + failedIds.size < graph.tasks.length) {
            const { runnable, newlyFailed } = this.taskManager.getRunnableTasks(graph, completedIds, failedIds, new Set(inProgress.keys()));
            for (const f of newlyFailed) {
                failedIds.add(f);
                state.taskRegistry[f] = {
                    status: 'failed',
                    agent: 'system',
                    retryCount: 0,
                    result: ''
                };
                prompt.log.error(`  ${chalk_1.default.red('✗')} ${f}: Skipped (Dependency failed)`);
            }
            for (const task of runnable) {
                const tDef = graph.tasks.find(t => t.id === task.task_id);
                const desc = tDef ? tDef.description : 'Execute ' + task.task_id;
                let logMsg = desc.substring(0, 50);
                if (tDef && tDef.fileOutput) {
                    logMsg = `[WRITE] ${tDef.fileOutput}`;
                }
                (0, ui_js_1.rightAlignedLog)(logMsg, `[${task.agent}]`);
                // Build context from dependencies
                const context = {};
                if (tDef && tDef.dependencies) {
                    for (const dep of tDef.dependencies) {
                        // deep copy to avoid mutations
                        const depRes = state.taskRegistry[dep]?.result || 'No output.';
                        context[dep] = JSON.parse(JSON.stringify(depRes));
                    }
                }
                // If the file already exists, read it so the Worker edits it instead of overwriting it
                let existingCode = undefined;
                if (graph.projectName && tDef?.fileOutput) {
                    const targetPath = (0, path_1.join)(process.cwd(), "workspace", graph.projectName, tDef.fileOutput);
                    if (fs.existsSync(targetPath)) {
                        existingCode = fs.readFileSync(targetPath, "utf-8");
                        prompt.log.info(`  ${chalk_1.default.dim('↑')} ${task.task_id}: Reading existing file ${tDef.fileOutput}`);
                    }
                }
                const executePromise = this.worker.execute(task, desc, context, config, request, // Global Objective
                graph.projectName, tDef?.fileOutput, directoryManifest, existingCode, // Pass existing code for editing
                1, 3).then(async (result) => {
                    inProgress.delete(task.task_id);
                    state.taskRegistry[result.task_id] = {
                        status: result.status,
                        agent: result.agent,
                        retryCount: 0,
                        result: result.result
                    };
                    if (result.status === 'completed') {
                        completedIds.add(result.task_id);
                    }
                    else {
                        failedIds.add(result.task_id);
                    }
                    if (result.outputType === 'command' && result.result.trim().length > 0) {
                        commandsToRun.push(result.result.trim());
                    }
                    // Evaluate self-correction loop
                    if (result.outputType === 'code' && result.artifacts && result.artifacts.length > 0) {
                        prompt.log.info(`  ${chalk_1.default.dim('🔍')} ${result.task_id}: Reviewing generated code...`);
                        let currentCode = result.result;
                        let currentArtifactPath = result.artifacts[0];
                        let retryCount = 0;
                        const MAX_VERIFICATION_RETRIES = 2; // Keep loop short
                        while (retryCount < MAX_VERIFICATION_RETRIES) {
                            const reviewInstructions = await this.reviewer.evaluate(request, desc, currentCode, config);
                            if (reviewInstructions.length === 0) {
                                prompt.log.success(`  ${chalk_1.default.green('✓')} ${result.task_id}: Code verified as correct.`);
                                break; // Passed checks
                            }
                            prompt.log.warn(`  ${chalk_1.default.yellow('⚠')} ${result.task_id}: Issues found (Attempt ${retryCount + 1}/${MAX_VERIFICATION_RETRIES}). Editing...`);
                            for (const instr of reviewInstructions) {
                                prompt.log.message(`    ${chalk_1.default.dim('Fix needed:')} ${instr.issue}`);
                            }
                            // Editor patches the array
                            currentCode = await this.editor.patch(currentCode, reviewInstructions, config);
                            // Save the patched code back to disk
                            const fs = require('fs');
                            fs.writeFileSync(currentArtifactPath, currentCode, 'utf-8');
                            retryCount++;
                        }
                        if (retryCount >= MAX_VERIFICATION_RETRIES) {
                            prompt.log.warn(`  ${chalk_1.default.yellow('⚠')} ${result.task_id}: Max verification retries reached for edits.`);
                        }
                    }
                    else if (result.status === 'failed') {
                        prompt.log.error(`  ${chalk_1.default.red('✗')} ${result.task_id}: ${result.errors?.join(', ') || 'Failed'}`);
                    }
                    else if (result.outputType === 'command') {
                        prompt.log.info(`  ${chalk_1.default.yellow('⚡')} ${result.task_id}: Command detected (will show below)`);
                    }
                    else {
                        prompt.log.success(`  ${chalk_1.default.green('✓')} ${result.task_id}: Done`);
                    }
                    return result;
                });
                inProgress.set(task.task_id, executePromise);
            }
            // Wait if tasks are running but no new tasks can be scheduled yet
            if (inProgress.size > 0 && runnable.length === 0 && newlyFailed.length === 0) {
                await Promise.race(inProgress.values());
            }
            else if (inProgress.size === 0 && runnable.length === 0 && newlyFailed.length === 0) {
                prompt.log.error("Stalemate: Cannot resolve further tasks due to missing dependencies or cycles.");
                break;
            }
        }
        prompt.log.success(`Execution completed!`);
        // Show collected commands to user
        if (commandsToRun.length > 0) {
            console.log();
            prompt.log.warn(chalk_1.default.bold.yellow('📋 Commands suggested by AI:'));
            console.log(chalk_1.default.dim('┌─────────────────────────────────────────'));
            const activeProjectName = graph.projectName || 'project';
            for (const cmd of commandsToRun) {
                for (const line of cmd.split('\n')) {
                    if (line.trim()) {
                        console.log(`│  ${chalk_1.default.cyan('$')} ${chalk_1.default.bold(line.trim())}`);
                    }
                }
            }
            console.log(chalk_1.default.dim('└─────────────────────────────────────────'));
            console.log();
            const runCommands = await prompt.confirm({
                message: 'Would you like to run these commands automatically?',
                initialValue: true,
            });
            if (runCommands && !prompt.isCancel(runCommands)) {
                const projectDir = graph.projectName ? (0, path_1.join)(process.cwd(), "workspace", graph.projectName) : process.cwd();
                for (const cmd of commandsToRun) {
                    try {
                        prompt.log.info(chalk_1.default.dim(`Executing: ${cmd}`));
                        (0, child_process_1.execSync)(cmd, { cwd: projectDir, stdio: 'inherit' });
                    }
                    catch (e) {
                        prompt.log.error(`Failed to execute command: ${cmd}`);
                    }
                }
                prompt.log.success('All commands executed.');
            }
            else {
                prompt.log.info(chalk_1.default.dim('Skipped executing commands.'));
            }
        }
        // Save to memory
        this.memory.saveMemory({
            timestamp: new Date().toISOString(),
            request,
            graph,
            results: state.taskRegistry
        });
    }
}
exports.Coordinator = Coordinator;
