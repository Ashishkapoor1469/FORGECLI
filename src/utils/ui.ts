import * as prompt from "@clack/prompts";
import chalk from "chalk";
import logUpdate from "log-update";

export const MASCOTS: Record<string, string[][]> = {
  Snowman: [
    [
      chalk.cyan("   *      ") + chalk.white("  .-.  ") + chalk.cyan("    *"),
      chalk.cyan("        ") + chalk.white("(o o) "),
      chalk.white("        | O |"),
      chalk.white("       /|   |\\"),
      chalk.white("       /_|___|_\\")
    ],
    [
      chalk.cyan("   *      ") + chalk.white("  .-.  ") + chalk.cyan("   *"),
      chalk.cyan("        ") + chalk.white("(- -) "),
      chalk.white("        | O |"),
      chalk.white("       /|   |\\"),
      chalk.white("       /_|___|_\\")
    ],
    [
      chalk.cyan(" *        ") + chalk.white("  .-.  ") + chalk.cyan("    *"),
      chalk.cyan("        ") + chalk.white("(o o) "),
      chalk.white("        | O |"),
      chalk.white("       /|   |\\"),
      chalk.white("       /_|___|_\\")
    ]
  ],

  Dog: [
    [
      chalk.yellow("  /^ ^\\"),
      chalk.yellow(" / 0 0 \\"),
      chalk.yellow(" V\\ Y /V"),
      chalk.yellow("  / - \\"),
      chalk.yellow(" |    \\"),
      chalk.yellow(" || (__V")
    ],
    [
      chalk.yellow("  /^ ^\\"),
      chalk.yellow(" / - - \\"),
      chalk.yellow(" V\\ Y /V"),
      chalk.yellow("  / - \\"),
      chalk.yellow(" |    \\"),
      chalk.yellow(" || (__V")
    ],
    [
      chalk.yellow("  /^ ^\\"),
      chalk.yellow(" / 0 0 \\"),
      chalk.yellow(" V\\ Y /V"),
      chalk.yellow("  / - \\"),
      chalk.yellow(" |  U \\"),
      chalk.yellow(" || (__V")
    ]
  ],

  Robot: [
    [
      chalk.gray("    [■■■■]"),
      chalk.gray("   | o  o |"),
      chalk.gray("   |  --  |"),
      chalk.gray("   |______|"),
      chalk.gray("   /| || |\\"),
      chalk.gray("  /_|_||_|_\\")
    ],
    [
      chalk.gray("    [■■■■]"),
      chalk.gray("   | -  - |"),
      chalk.gray("   |  --  |"),
      chalk.gray("   |______|"),
      chalk.gray("   /| || |\\"),
      chalk.gray("  /_|_||_|_\\")
    ],
    [
      chalk.gray("    [■■■■]"),
      chalk.gray("   | o  o |"),
      chalk.gray("   |  ~~  |"),
      chalk.gray("   |______|"),
      chalk.gray("   /| || |\\"),
      chalk.gray("  /_|_||_|_\\")
    ]
  ],

  Default: [
    [
      chalk.blue("   /\\_/\\"),
      chalk.blue("  ( o.o )"),
      chalk.blue("   > ^ <")
    ],
    [
      chalk.blue("   /\\_/\\"),
      chalk.blue("  ( -.- )"),
      chalk.blue("   > ^ <")
    ],
    [
      chalk.blue("   /\\_/\\"),
      chalk.blue("  ( o.o )"),
      chalk.blue("   > - <")
    ]
  ]
};


export function getRandomMascotName(): string {
  const names = Object.keys(MASCOTS).filter(n => n !== 'Default');
  return names[Math.floor(Math.random() * names.length+1)];
}

export function showIntro() {
  console.clear();

  const forgeText = `
${chalk.bold.hex("#FF6B6B")("  ███████╗ ██████╗ ██████╗  ██████╗ ███████╗")}
${chalk.bold.hex("#FF8E53")("  ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝")}
${chalk.bold.hex("#FFA133")("  █████╗  ██║   ██║██████╔╝██║  ███╗█████╗  ")}
${chalk.bold.hex("#F5D300")("  ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  ")}
${chalk.bold.hex("#A8E300")("  ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗")}
${chalk.bold.hex("#39E300")("  ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝")}
  `;

  const totalBoard = `
${forgeText}
  ${chalk.cyan("-----------------------")}
  ${chalk.bold.hex("#74B9FF")("AI Multi-Agent Forge")}
  `;

  prompt.intro(totalBoard);
}

export function showOutro(message: string) {
  prompt.outro(chalk.bold.hex("#A29BFE")(message));
}

export function rightAlignedLog(leftText: string, rightText: string) {
  const terminalWidth = process.stdout.columns || 80;
  const paddingLength = terminalWidth - leftText.length - rightText.length - 8;
  const padding = paddingLength > 0 ? " ".repeat(paddingLength) : " ";
  console.log(`│  ${leftText}${padding}${chalk.dim(rightText)}`);
}

function wordWrap(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const rawLines = text.split('\n');
  for (const rawLine of rawLines) {
    if (rawLine.length <= maxWidth) {
      lines.push(rawLine);
    } else {
      let current = rawLine;
      while (current.length > maxWidth) {
        let breakPoint = current.lastIndexOf(' ', maxWidth);
        if (breakPoint === -1) breakPoint = maxWidth; // force break
        lines.push(current.substring(0, breakPoint));
        current = current.substring(breakPoint).trimStart();
      }
      if (current) lines.push(current);
    }
  }
  return lines;
}

export async function streamSideBySideChat(
  chatStream: AsyncIterable<string>,
  activeMascotName: string | null
): Promise<string> {
  const terminalWidth = process.stdout.columns || 80;
  const dividerCol = Math.floor(terminalWidth * 0.85);
  const CHAT_WIDTH = Math.max(20, dividerCol - 5);

  const mascotFrames = MASCOTS[activeMascotName || ''] || MASCOTS.Default;
  let fullResponse = "";

  function render() {
    const wrappedLines = wordWrap(fullResponse, CHAT_WIDTH);
    let outputLines = [];
    
    for (let i = 0; i < wrappedLines.length; i++) {
        outputLines.push(chalk.dim("│ ") + wrappedLines[i]);
    }
    
    const hLine = "─".repeat(CHAT_WIDTH + 1);
    
    logUpdate(
        chalk.dim(`┌${hLine}`) + "\n" +
        outputLines.join('\n') + "\n" +
        chalk.dim(`└${hLine}`)
    );
  }

  for await (const chunk of chatStream) {
    fullResponse += chunk;
    render();
  }

  render(); // Final static draw
  logUpdate.done();
  
  return fullResponse;
}

//  Global Floating Mascot

let globalAnimationInterval: NodeJS.Timeout | null = null;
let boundResizeHandler: (() => void) | null = null;

export function startGlobalMascot(activeMascotName: string | null) {
  if (globalAnimationInterval) stopGlobalMascot();
  if (!process.stdout.isTTY) return;

  const mascotFrames = MASCOTS[activeMascotName || ''] || MASCOTS.Default;
  let currentFrame = 0;
  
  let lastCols = process.stdout.columns || 80;
  let lastRows = process.stdout.rows || 24;

  const handleMascotResize = () => {
    const cols = process.stdout.columns || 80;
    const rows = process.stdout.rows || 24;
    
    // Attempt aggressive screen repair on resize
    process.stdout.write('\x1b[2J\x1b[H'); 
    lastCols = cols;
    lastRows = rows;
  };

  boundResizeHandler = handleMascotResize;
  process.stdout.on('resize', boundResizeHandler);

  const drawMascot = () => {
      const cols = process.stdout.columns || 80;
      const rows = process.stdout.rows || 24;
      
      // Dynamic Layout Calculation
      const dividerCol = Math.floor(cols * 0.85);
      const rightPaneStartX = dividerCol + 2; 
      const MASCOT_WIDTH = Math.max(0, cols - rightPaneStartX);
      const rightBg = " ".repeat(MASCOT_WIDTH);
      
      if (cols !== lastCols || rows !== lastRows) {
         handleMascotResize();
      }

      let out = "";
      // Save cursor
      out += '\x1b[s';
      
      // Draw 85/15 Global Divider Line
      for (let r = 1; r < rows; r++) {
         out += `\x1b[${r};${dividerCol}H${chalk.dim('│')}`;
      }
      
      const frame = mascotFrames[currentFrame];
      const startRow = (rows - 1) - frame.length - 1;
      
      // Clear the ENTIRE right pane above the mascot to erase fast-scroll trails
      for (let r = 1; r < startRow; r++) {
          out += `\x1b[${r};${rightPaneStartX}H${rightBg}`;
      }
      
      // Draw mascot
      for (let i = 0; i < frame.length; i++) {
          const rawLen = frame[i].replace(/\x1B\[\d+m/g, '').length;
          const padLen = Math.max(0, MASCOT_WIDTH - rawLen);
          const lineStr = frame[i] + " ".repeat(padLen);
          out += `\x1b[${startRow + i};${rightPaneStartX}H${lineStr}`;
      }
      
      // Clear below mascot if needed, to the bottom-1
      for (let r = startRow + frame.length; r < Math.max(rows, startRow + frame.length); r++) {
          if (r < rows) {
              out += `\x1b[${r};${rightPaneStartX}H${rightBg}`;
          }
      }

      // Restore cursor
      out += '\x1b[u';
      
      process.stdout.write(out);
      currentFrame = (currentFrame + 1) % mascotFrames.length;
  };

  globalAnimationInterval = setInterval(drawMascot, 500);
  drawMascot(); // draw immediate first frame
}

export function stopGlobalMascot() {
  if (globalAnimationInterval) {
    clearInterval(globalAnimationInterval);
    globalAnimationInterval = null;
  }
  if (boundResizeHandler) {
    process.stdout.removeListener('resize', boundResizeHandler);
    boundResizeHandler = null;
  }
}
