import * as prompt from "@clack/prompts";
import chalk from "chalk";

const MASCOTS = [
  // Snowman
  `
   ${chalk.cyan("*")}      ${chalk.white("  .  ")}      ${chalk.cyan("*")}
 ${chalk.cyan("*")}     ${chalk.white(" \\_O_/ ")}    ${chalk.cyan("*")}
   ${chalk.white("  / \\  ")}
   ${chalk.white(" /___\\ ")}
  `,

  // Panda
  `
   ${chalk.white("   /\\_/\\")}
   ${chalk.white("  ( o.o )")}
   ${chalk.white("   > ^ < ")}
   ${chalk.white("  /  |  \\")}
  `,

  // Dog
  `
   ${chalk.yellow("   / \\__")}
   ${chalk.yellow("  (    @\\___")}
   ${chalk.yellow("  /         O")}
   ${chalk.yellow(" /   (_____/)")}
   ${chalk.yellow("/_____/   U")}
  `,

  // Eagle
  `
   ${chalk.magenta("    \\\\_//")}
   ${chalk.magenta("   (o o)")}
   ${chalk.magenta("==o=^=o==")}
   ${chalk.magenta("   / \\")}
  `,

  // Lizard
  `
   ${chalk.green("    /^^\\")}
   ${chalk.green("   / o o\\")}
   ${chalk.green("   \\_-_/")}
   ${chalk.green("   / | \\")}
  `,

  // Cat
  `
   ${chalk.blue("   /\\_/\\")}
   ${chalk.blue("  ( o.o )")}
   ${chalk.blue("   > ^ <")}
  `,

  // Robot
  `
   ${chalk.gray("   [::::]")}
   ${chalk.gray("  | o  o |")}
   ${chalk.gray("  |  --  |")}
   ${chalk.gray("  |______|")}
   ${chalk.gray("   / || \\")}
  `,

  // Ghost
  `
   ${chalk.white("   .-.")}
   ${chalk.white("  (o o)")}
   ${chalk.white("  | O |")}
   ${chalk.white("  |   |")}
   ${chalk.white("  '~~~'")}
  `,

  // Alien
  `
   ${chalk.green("    .-.-.")}
   ${chalk.green("   ( o o )")}
   ${chalk.green("   |  ^  |")}
   ${chalk.green("   | --- |")}
   ${chalk.green("    -----")}
  `,

  // Penguin
  `
   ${chalk.cyan("   _~_")}
   ${chalk.cyan("  (o o)")}
   ${chalk.cyan(" /  V  \\")}
   ${chalk.cyan("/(  _  )\\")}
   ${chalk.cyan("  ^^ ^^")}
  `,
];

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

  const mascot = MASCOTS[Math.floor(Math.random() * MASCOTS.length)];

  const totalBoard = `
${forgeText}
${mascot}
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
