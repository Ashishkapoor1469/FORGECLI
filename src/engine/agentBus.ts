import { EventEmitter } from 'events';
import { Task, WaveTask } from '../types.js';

export type ForgeEvent = 
  | 'TASK_READY'
  | 'TASK_STARTED'
  | 'CODE_GENERATED'
  | 'TEST_FAILED'
  | 'TEST_PASSED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'PLAN_READY';

export interface EventPayload {
  taskId?: string;
  agentId?: string;
  data?: any;
  timestamp: number;
}

export class AgentEventBus {
  private bus = new EventEmitter();
  private stats: { event: string; count: number; latency: number[] }[] = [];

  constructor() {
    this.bus.setMaxListeners(50);
  }

  on(event: ForgeEvent, listener: (payload: EventPayload) => void) {
    this.bus.on(event, (payload) => {
      // Record Observability
      this.trackStats(event, payload);
      listener(payload);
    });
  }

  emit(event: ForgeEvent, payload: Partial<EventPayload>) {
    payload.timestamp = Date.now();
    this.bus.emit(event, payload as EventPayload);
  }

  private trackStats(event: string, payload: any) {
    let stat = this.stats.find(s => s.event === event);
    if (!stat) {
      stat = { event, count: 0, latency: [] };
      this.stats.push(stat);
    }
    stat.count++;
  }

  getDashboardStats() {
    return this.stats.map(s => ({
      event: s.event,
      count: s.count,
      avgLatencyMs: s.latency.length > 0 ? s.latency.reduce((a,b)=>a+b,0)/s.latency.length : 0
    }));
  }
}
