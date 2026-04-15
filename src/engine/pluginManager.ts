import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { AgentEventBus } from './agentBus.js';

export interface ForgePlugin {
  name: string;
  version: string;
  init(bus: AgentEventBus): void;
}

export class PluginManager {
  private pluginsDir: string;
  private plugins: ForgePlugin[] = [];

  constructor(private bus: AgentEventBus) {
    this.pluginsDir = join(process.cwd(), '.forge', 'plugins');
  }

  async loadPlugins() {
    if (!existsSync(this.pluginsDir)) return;
    const files = readdirSync(this.pluginsDir);
    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.mjs')) {
        try {
          const mod = await import(`file://${join(this.pluginsDir, file)}`);
          if (mod.default && mod.default.init) {
            this.plugins.push(mod.default);
            mod.default.init(this.bus);
          }
        } catch (e) {
          console.warn(`Failed to load plugin ${file}`);
        }
      }
    }
  }

  getLoadedPlugins(): string[] {
    return this.plugins.map(p => `${p.name} v${p.version}`);
  }
}
