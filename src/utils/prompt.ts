import * as prompt from '@clack/prompts';
import chalk from 'chalk';
import readline from 'readline';

export const SLASH_COMMANDS = [
  { cmd: "/model", desc: "Switch LLM provider and model" },
  { cmd: "/create", desc: "Scaffold a new project" },
  { cmd: "/workspace", desc: "Open the project workspace manager" },
  { cmd: "/plan", desc: "Generate a build plan without executing" },
  { cmd: "/skill", desc: "Manage Agent Skills" },
  { cmd: "/anime", desc: "Anime Lootbox Menu" },
  { cmd: "/buddy", desc: "Set Chat Buddy" },
  { cmd: "/cd", desc: "Change active workspace directory" },
  { cmd: "/rollback", desc: "Rollback to state before a task ID" },
  { cmd: "/status", desc: "Show observability dashboard" },
  { cmd: "/memory", desc: "Show memory stats" },
  { cmd: "/admin", desc: "Access encrypted vault" },
  { cmd: "/clear", desc: "Clear the terminal screen" },
];

export interface AutocompleteTextOptions {
  message: string;
  placeholder?: string;
  initialValue?: string;
}

/**
 * Interactive text input with slash-command autocomplete.
 * When the user types `/`, a filterable suggestion dropdown appears
 * similar to Gemini CLI / Claude Code.
 */
export const autocompleteText = (opts: AutocompleteTextOptions): Promise<string | symbol> => {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      // Fallback for pipe/non-interactive
      return prompt.text({
        message: opts.message,
        placeholder: opts.placeholder,
        initialValue: opts.initialValue
      }).then(resolve);
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    let buffer = '';
    let selectedIdx = 0;
    let suggestions: typeof SLASH_COMMANDS = [];
    let showingSuggestions = false;
    let submitted = false;

    const prefix = chalk.cyan('◆') + '  ' + chalk.bold(opts.message) + ' ';
    const placeholder = opts.placeholder || '';

    function getFilteredSuggestions(input: string): typeof SLASH_COMMANDS {
      if (!input.startsWith('/')) return [];
      const query = input.toLowerCase();
      return SLASH_COMMANDS.filter(c => c.cmd.toLowerCase().startsWith(query));
    }

    const MAX_VISIBLE = 6;
    let windowStart = 0;

    function clearSuggestionLines() {
      const visibleCount = Math.min(MAX_VISIBLE, suggestions.length);
      const hasMore = suggestions.length > MAX_VISIBLE;
      const totalLines = visibleCount + (hasMore ? 1 : 0);
      if (totalLines > 0) {
        for (let i = 0; i < totalLines; i++) {
          process.stdout.write('\x1b[B\x1b[2K');
        }
        process.stdout.write(`\x1b[${totalLines}A`);
      }
    }

    function render() {
      // Clear current line
      process.stdout.write('\r\x1b[2K');
      
      // Clear old suggestion lines below
      clearSuggestionLines();

      // Draw input line
      const displayBuffer = buffer || chalk.dim(placeholder);
      process.stdout.write(`${prefix}${displayBuffer}`);

      // Draw suggestions below if showing
      const newSuggestions = getFilteredSuggestions(buffer);
      suggestions = newSuggestions;
      showingSuggestions = newSuggestions.length > 0;

      if (showingSuggestions) {
        // Clamp selectedIdx to valid range
        if (selectedIdx >= suggestions.length) selectedIdx = suggestions.length - 1;
        if (selectedIdx < 0) selectedIdx = 0;

        // Slide the window so selectedIdx is always visible
        if (selectedIdx >= windowStart + MAX_VISIBLE) {
          windowStart = selectedIdx - MAX_VISIBLE + 1;
        }
        if (selectedIdx < windowStart) {
          windowStart = selectedIdx;
        }
        // Clamp window
        if (windowStart < 0) windowStart = 0;
        if (windowStart > suggestions.length - MAX_VISIBLE) {
          windowStart = Math.max(0, suggestions.length - MAX_VISIBLE);
        }

        const windowEnd = Math.min(windowStart + MAX_VISIBLE, suggestions.length);

        // Save cursor position
        process.stdout.write('\x1b[s');

        // Show "↑ N more" if scrolled down
        const hasAbove = windowStart > 0;
        const hasBelow = windowEnd < suggestions.length;

        for (let i = windowStart; i < windowEnd; i++) {
          const s = suggestions[i];
          const isActive = i === selectedIdx;
          const pointer = isActive ? chalk.cyan('❯') : chalk.dim(' ');
          const cmdText = isActive ? chalk.cyan.bold(s.cmd) : chalk.dim.gray(s.cmd);
          const descText = isActive ? chalk.dim.white(s.desc) : chalk.dim.gray(s.desc);
          process.stdout.write(`\n\x1b[2K  ${pointer} ${cmdText.padEnd(22)} ${descText}`);
        }

        // Show scroll hint
        if (hasAbove || hasBelow) {
          const hints: string[] = [];
          if (hasAbove) hints.push(`↑ ${windowStart} above`);
          if (hasBelow) hints.push(`↓ ${suggestions.length - windowEnd} below`);
          process.stdout.write(`\n\x1b[2K  ${chalk.dim(`  ${hints.join('  |  ')}`)}`);
        }

        // Restore cursor position back to input line
        process.stdout.write('\x1b[u');
      }
    }

    // Initial render
    render();

    // Switch to raw mode for keypress detection
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const onKeypress = (str: string | undefined, key: readline.Key) => {
      if (submitted) return;

      // Ctrl+C / Escape → cancel
      if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        cleanup();
        process.stdout.write('\n');
        resolve(Symbol.for('clack:cancel'));
        return;
      }

      // Enter/Return → submit
      if (key.name === 'return') {
        if (showingSuggestions && suggestions.length > 0) {
          // Accept the selected suggestion
          buffer = suggestions[selectedIdx].cmd;
        }
        cleanup();
        process.stdout.write('\r\x1b[2K');
        // Print only the green checkmark line (no duplicate echo)
        console.log(`${chalk.green('◇')}  ${chalk.bold(opts.message)} ${chalk.dim(buffer)}`);
        resolve(buffer);
        return;
      }

      // Tab → accept current suggestion inline but don't submit
      if (key.name === 'tab') {
        if (showingSuggestions && suggestions.length > 0) {
          buffer = suggestions[selectedIdx].cmd;
          // Add trailing space for arguments
          if (!buffer.endsWith(' ')) buffer += ' ';
        }
        render();
        return;
      }

      // Arrow Up → move selection up
      if (key.name === 'up') {
        if (showingSuggestions) {
          selectedIdx = Math.max(0, selectedIdx - 1);
          render();
        }
        return;
      }

      // Arrow Down → move selection down
      if (key.name === 'down') {
        if (showingSuggestions) {
          selectedIdx = Math.min(suggestions.length - 1, selectedIdx + 1);
          render();
        }
        return;
      }

      // Backspace → delete last char
      if (key.name === 'backspace') {
        buffer = buffer.slice(0, -1);
        selectedIdx = 0;
        render();
        return;
      }

      // Regular character input
      if (str && !key.ctrl && !key.meta && str.length === 1) {
        buffer += str;
        selectedIdx = 0;
        render();
      }
    };

    function cleanup() {
      submitted = true;
      process.stdin.setRawMode(false);
      process.stdin.removeListener('keypress', onKeypress);
      rl.close();

      // Clear leftover suggestion lines
      const visibleCount = Math.min(6, suggestions.length);
      const extraLine = suggestions.length > 6 ? 1 : 0;
      const totalLines = visibleCount + extraLine;
      if (totalLines > 0) {
        process.stdout.write('\x1b[s');
        for (let i = 0; i < totalLines; i++) {
          process.stdout.write('\n\x1b[2K');
        }
        process.stdout.write('\x1b[u');
      }
    }

    // Enable keypress events
    readline.emitKeypressEvents(process.stdin, rl);
    process.stdin.on('keypress', onKeypress);
  });
};
