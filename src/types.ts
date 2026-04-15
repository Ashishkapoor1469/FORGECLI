export type TaskComplexity = 'low' | 'mid' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial';

export interface Task {
  id: string;
  description: string;
  dependencies: string[];
  parallel: boolean;
  complexity: TaskComplexity;
  fileOutput?: string;
}

export interface TaskGraph {
  projectName?: string;
  tasks: Task[];
}

export interface WaveTask {
  task_id: string;
  agent: string;
  priority: 'low' | 'mid' | 'high';
}

export interface ExecutionWave {
  wave: number;
  tasks: WaveTask[];
}

export interface WaveSchedule {
  waves: ExecutionWave[];
}

export interface WorkerOutput {
  task_id: string;
  agent: string;
  status: TaskStatus;
  result: string;
  outputType: 'command' | 'code';
  artifacts: string[];
  errors: string[];
}

export interface GlobalState {
  taskRegistry: Record<string, {
    status: TaskStatus;
    agent: string;
    retryCount: number;
    result: any;
    lastError?: string;
  }>;
  fileManifest: Record<string, {
    createdBy: string;
    lastModifiedBy: string;
  }>;
}

export interface ProviderConfig {
  provider: 'openrouter' | 'ollama';
  model: string;
  activeProject?: string;
  activeSkillId?: string;
}
