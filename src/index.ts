import { showIntro, showOutro } from './utils/ui.js';
import * as prompt from '@clack/prompts';
import { Coordinator } from './agents/coordinator.js';
import { ProviderConfig } from './types.js';
import { IntentRouter } from './agents/router.js';
import { MemoryManager } from './utils/memory.js';
import { GachaManager } from './utils/gacha.js';
import chalk from 'chalk';

let config: ProviderConfig = {
  provider: 'ollama',
  model: 'qwen2.5-coder:1.5b'
};

const coordinator = new Coordinator();
const router = new IntentRouter();
const memory = new MemoryManager();
const gacha = new GachaManager();

async function handleModelSelection() {
  const provider = await prompt.select({
    message: 'Select LLM Provider',
    options: [
      { value: 'ollama', label: 'Ollama (Local)' },
      { value: 'openrouter', label: 'OpenRouter (Cloud)' }
    ]
  });

  if (prompt.isCancel(provider)) return;

  let model;
  if (provider === 'ollama') {
    model = await prompt.text({
      message: 'Enter Ollama model name',
      initialValue: 'qwen2.5-coder:1.5b'
    });
  } else {
    model = await prompt.text({
      message: 'Enter OpenRouter model name',
      initialValue: 'openai/gpt-4o'
    });
  }

  if (prompt.isCancel(model)) return;

  config.provider = provider as 'ollama' | 'openrouter';
  config.model = model as string;
  prompt.log.success(`Switched to ${config.provider} (${config.model})`);
}

async function handleAnimeMenu() {
  const action = await prompt.select({
    message: 'Anime Lootbox Menu',
    options: [
      { value: 'open', label: '🎁 Open Daily Box' },
      { value: 'view', label: '📜 View Collection' },
      { value: 'cancel', label: 'Cancel' }
    ]
  });

  if (action === 'open') {
    const result = gacha.openDailyBox();
    if (result.success) {
      prompt.log.success(chalk.green.bold(result.message));
    } else {
      prompt.log.warn(chalk.yellow(result.message));
    }
  } else if (action === 'view') {
    const coll = gacha.getCollection();
    if (coll.length === 0) {
      prompt.log.info("You haven't unlocked any characters yet!");
    } else {
      prompt.log.info(`Owned (${coll.length}):\n${chalk.cyan(coll.join(', '))}`);
    }
  }
}

async function handleBuddyMenu() {
  const coll = gacha.getCollection();
  if (coll.length === 0) {
    prompt.log.warn("You have no buddies! Type /anime to open a box.");
    return;
  }

  const options = coll.map(c => ({ value: c, label: c }));
  options.unshift({ value: 'none', label: 'No Buddy (Default Mode)' });

  const selection = await prompt.select({
    message: 'Select your Chat Buddy',
    options
  });

  if (prompt.isCancel(selection)) return;

  if (selection === 'none') {
    gacha.setActiveBuddy(null);
    prompt.log.success("Buddy deactivated.");
  } else {
    gacha.setActiveBuddy(selection as string);
    prompt.log.success(`You are now chatting with ${chalk.magenta(selection)}!`);
  }
}

async function main() {
  showIntro();

  prompt.log.info(`Active Model: ${config.provider} (${config.model}). Tools: /model, /anime, /buddy`);

  while (true) {
    const userReq = await prompt.text({
      message: 'What do you want to build?',
      placeholder: 'e.g., A simple express server... (or /help)',
    });

    if (prompt.isCancel(userReq)) {
      showOutro('Goodbye!');
      process.exit(0);
    }

    const input = (userReq as string).trim();

    if (input === '/model') {
      await handleModelSelection();
      continue;
    }
    if (input === '/anime') {
      await handleAnimeMenu();
      continue;
    }
    if (input === '/buddy') {
      await handleBuddyMenu();
      continue;
    }

    if (input.length === 0) continue;

    const s = prompt.spinner();
    s.start('Determining intent...');
    
    try {
      const intent = await router.determineIntent(input, config);
      s.stop(`Intent recognized: ${chalk.bold.green(intent.toUpperCase())}`);

      if (intent === 'chat') {
        const memSum = memory.getMemorySummary();
        const chatStream = router.streamChat(input, memSum, config);
        
        const chatSpinner = prompt.spinner();
        chatSpinner.start('Thinking...');
        
        let fullResponse = '';
        let isFirstChunk = true;

        for await (const chunk of chatStream) {
          if (isFirstChunk) {
            chatSpinner.stop('Ready:');
            console.log(`\n${chalk.dim('┌─────────────────────────────')}`);
            process.stdout.write('│ ');
            isFirstChunk = false;
          }

          const safeChunk = chunk.replace(/\n/g, '\n│ ');
          process.stdout.write(safeChunk);
          fullResponse += chunk;
        }
        
        if (isFirstChunk) {
          chatSpinner.stop('Finished.');
          console.log(`\n${chalk.dim('┌─────────────────────────────')}\n│ `);
        }

        console.log(`\n${chalk.dim('└─────────────────────────────')}\n`);

        // Save simple chat into memory
        memory.saveMemory({
          timestamp: new Date().toISOString(),
          request: input,
          graph: null,
          results: { chatResponse: fullResponse }
        });

      } else {
        const buildSpinner = prompt.spinner();
        buildSpinner.start('Initializing coordinator...');
        await coordinator.processRequest(input, buildSpinner, config);
        buildSpinner.stop('Process completed successfully.');
      }
    } catch (error: any) {
      if (s) s.stop('Process failed.');
      prompt.log.error(error.message || 'An unknown error occurred.');
    }
  }
}

main().catch(console.error);
