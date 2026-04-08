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
exports.MASCOTS = void 0;
exports.getRandomMascotName = getRandomMascotName;
exports.showIntro = showIntro;
exports.showOutro = showOutro;
exports.rightAlignedLog = rightAlignedLog;
exports.streamSideBySideChat = streamSideBySideChat;
exports.startGlobalMascot = startGlobalMascot;
exports.stopGlobalMascot = stopGlobalMascot;
const prompt = __importStar(require("@clack/prompts"));
const chalk_1 = __importDefault(require("chalk"));
const log_update_1 = __importDefault(require("log-update"));
// We keep MASCOTS as multi-frame arrays now
exports.MASCOTS = {
    Snowman: [
        [
            chalk_1.default.cyan("   *      ") + chalk_1.default.white("  .-.  ") + chalk_1.default.cyan("    *"),
            chalk_1.default.cyan("        ") + chalk_1.default.white("(o o) "),
            chalk_1.default.white("        | O |"),
            chalk_1.default.white("       /|   |\\"),
            chalk_1.default.white("       /_|___|_\\")
        ],
        [
            chalk_1.default.cyan("   *      ") + chalk_1.default.white("  .-.  ") + chalk_1.default.cyan("   *"),
            chalk_1.default.cyan("        ") + chalk_1.default.white("(- -) "),
            chalk_1.default.white("        | O |"),
            chalk_1.default.white("       /|   |\\"),
            chalk_1.default.white("       /_|___|_\\")
        ],
        [
            chalk_1.default.cyan(" *        ") + chalk_1.default.white("  .-.  ") + chalk_1.default.cyan("    *"),
            chalk_1.default.cyan("        ") + chalk_1.default.white("(o o) "),
            chalk_1.default.white("        | O |"),
            chalk_1.default.white("       /|   |\\"),
            chalk_1.default.white("       /_|___|_\\")
        ]
    ],
    Dog: [
        [
            chalk_1.default.yellow("  /^ ^\\"),
            chalk_1.default.yellow(" / 0 0 \\"),
            chalk_1.default.yellow(" V\\ Y /V"),
            chalk_1.default.yellow("  / - \\"),
            chalk_1.default.yellow(" |    \\"),
            chalk_1.default.yellow(" || (__V")
        ],
        [
            chalk_1.default.yellow("  /^ ^\\"),
            chalk_1.default.yellow(" / - - \\"),
            chalk_1.default.yellow(" V\\ Y /V"),
            chalk_1.default.yellow("  / - \\"),
            chalk_1.default.yellow(" |    \\"),
            chalk_1.default.yellow(" || (__V")
        ],
        [
            chalk_1.default.yellow("  /^ ^\\"),
            chalk_1.default.yellow(" / 0 0 \\"),
            chalk_1.default.yellow(" V\\ Y /V"),
            chalk_1.default.yellow("  / - \\"),
            chalk_1.default.yellow(" |  U \\"),
            chalk_1.default.yellow(" || (__V")
        ]
    ],
    Robot: [
        [
            chalk_1.default.gray("    [■■■■]"),
            chalk_1.default.gray("   | o  o |"),
            chalk_1.default.gray("   |  --  |"),
            chalk_1.default.gray("   |______|"),
            chalk_1.default.gray("   /| || |\\"),
            chalk_1.default.gray("  /_|_||_|_\\")
        ],
        [
            chalk_1.default.gray("    [■■■■]"),
            chalk_1.default.gray("   | -  - |"),
            chalk_1.default.gray("   |  --  |"),
            chalk_1.default.gray("   |______|"),
            chalk_1.default.gray("   /| || |\\"),
            chalk_1.default.gray("  /_|_||_|_\\")
        ],
        [
            chalk_1.default.gray("    [■■■■]"),
            chalk_1.default.gray("   | o  o |"),
            chalk_1.default.gray("   |  ~~  |"),
            chalk_1.default.gray("   |______|"),
            chalk_1.default.gray("   /| || |\\"),
            chalk_1.default.gray("  /_|_||_|_\\")
        ]
    ],
    Default: [
        [
            chalk_1.default.blue("   /\\_/\\"),
            chalk_1.default.blue("  ( o.o )"),
            chalk_1.default.blue("   > ^ <")
        ],
        [
            chalk_1.default.blue("   /\\_/\\"),
            chalk_1.default.blue("  ( -.- )"),
            chalk_1.default.blue("   > ^ <")
        ],
        [
            chalk_1.default.blue("   /\\_/\\"),
            chalk_1.default.blue("  ( o.o )"),
            chalk_1.default.blue("   > - <")
        ]
    ]
};
/** Pick a random mascot each time the CLI boots */
function getRandomMascotName() {
    const names = Object.keys(exports.MASCOTS).filter(n => n !== 'Default');
    return names[Math.floor(Math.random() * names.length + 1)];
}
function showIntro() {
    console.clear();
    const forgeText = `
${chalk_1.default.bold.hex("#FF6B6B")("  ███████╗ ██████╗ ██████╗  ██████╗ ███████╗")}
${chalk_1.default.bold.hex("#FF8E53")("  ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝")}
${chalk_1.default.bold.hex("#FFA133")("  █████╗  ██║   ██║██████╔╝██║  ███╗█████╗  ")}
${chalk_1.default.bold.hex("#F5D300")("  ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  ")}
${chalk_1.default.bold.hex("#A8E300")("  ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗")}
${chalk_1.default.bold.hex("#39E300")("  ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝")}
  `;
    const totalBoard = `
${forgeText}
  ${chalk_1.default.cyan("-----------------------")}
  ${chalk_1.default.bold.hex("#74B9FF")("AI Multi-Agent Forge")}
  `;
    prompt.intro(totalBoard);
}
function showOutro(message) {
    prompt.outro(chalk_1.default.bold.hex("#A29BFE")(message));
}
function rightAlignedLog(leftText, rightText) {
    const terminalWidth = process.stdout.columns || 80;
    const paddingLength = terminalWidth - leftText.length - rightText.length - 8;
    const padding = paddingLength > 0 ? " ".repeat(paddingLength) : " ";
    console.log(`│  ${leftText}${padding}${chalk_1.default.dim(rightText)}`);
}
/**
 * Splits text into lines wrapping at a specific max width.
 */
function wordWrap(text, maxWidth) {
    const lines = [];
    const rawLines = text.split('\n');
    for (const rawLine of rawLines) {
        if (rawLine.length <= maxWidth) {
            lines.push(rawLine);
        }
        else {
            let current = rawLine;
            while (current.length > maxWidth) {
                let breakPoint = current.lastIndexOf(' ', maxWidth);
                if (breakPoint === -1)
                    breakPoint = maxWidth; // force break
                lines.push(current.substring(0, breakPoint));
                current = current.substring(breakPoint).trimStart();
            }
            if (current)
                lines.push(current);
        }
    }
    return lines;
}
/**
 * Renders the streamed chat alongside an animated mascot.
 */
async function streamSideBySideChat(chatStream, activeMascotName) {
    const terminalWidth = process.stdout.columns || 80;
    const dividerCol = Math.floor(terminalWidth * 0.85);
    const CHAT_WIDTH = Math.max(20, dividerCol - 5);
    const mascotFrames = exports.MASCOTS[activeMascotName || ''] || exports.MASCOTS.Default;
    let fullResponse = "";
    function render() {
        const wrappedLines = wordWrap(fullResponse, CHAT_WIDTH);
        let outputLines = [];
        for (let i = 0; i < wrappedLines.length; i++) {
            outputLines.push(chalk_1.default.dim("│ ") + wrappedLines[i]);
        }
        const hLine = "─".repeat(CHAT_WIDTH + 1);
        (0, log_update_1.default)(chalk_1.default.dim(`┌${hLine}`) + "\n" +
            outputLines.join('\n') + "\n" +
            chalk_1.default.dim(`└${hLine}`));
    }
    for await (const chunk of chatStream) {
        fullResponse += chunk;
        render();
    }
    render(); // Final static draw
    log_update_1.default.done();
    return fullResponse;
}
// ── Global Floating Mascot ──
let globalAnimationInterval = null;
function startGlobalMascot(activeMascotName) {
    if (globalAnimationInterval)
        clearInterval(globalAnimationInterval);
    if (!process.stdout.isTTY)
        return;
    const mascotFrames = exports.MASCOTS[activeMascotName || ''] || exports.MASCOTS.Default;
    let currentFrame = 0;
    const drawMascot = () => {
        const cols = process.stdout.columns;
        const rows = process.stdout.rows || 24;
        const dividerCol = Math.floor(cols * 0.85);
        const rightPaneStartX = dividerCol + 2;
        // Save cursor position
        process.stdout.write('\x1b[s');
        // Draw 70/30 Global Divider Line
        for (let r = 1; r < rows; r++) {
            process.stdout.write(`\x1b[${r};${dividerCol}H${chalk_1.default.dim('│')}`);
        }
        const frame = mascotFrames[currentFrame];
        const startRow = rows - frame.length - 1;
        const MASCOT_WIDTH = cols - dividerCol - 3;
        // Clear the ENTIRE right pane above the mascot to erase fast-scroll trails
        for (let r = 1; r < startRow; r++) {
            process.stdout.write(`\x1b[${r};${rightPaneStartX}H`);
            process.stdout.write(" ".repeat(MASCOT_WIDTH));
        }
        for (let i = 0; i < frame.length; i++) {
            process.stdout.write(`\x1b[${startRow + i};${rightPaneStartX}H`);
            // Ensure each line clears the rest of the column width
            const lineStr = frame[i] + " ".repeat(Math.max(0, MASCOT_WIDTH - frame[i].replace(/\x1B\[\d+m/g, '').length));
            process.stdout.write(lineStr);
        }
        // Restore cursor position
        process.stdout.write('\x1b[u');
        currentFrame = (currentFrame + 1) % mascotFrames.length;
    };
    globalAnimationInterval = setInterval(drawMascot, 500);
    drawMascot(); // draw immediate first frame
}
function stopGlobalMascot() {
    if (globalAnimationInterval) {
        clearInterval(globalAnimationInterval);
        globalAnimationInterval = null;
    }
}
