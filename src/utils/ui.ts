import * as prompt from '@clack/prompts';
import chalk from 'chalk';

const MASCOTS = [
  // Snowman
  `       ${chalk.cyan('*')}    ${chalk.white('      .      ')}   ${chalk.cyan('*')}
    ${chalk.cyan('*')}   ${chalk.white('  \\_O_/   ')} ${chalk.cyan('*')}
       ${chalk.cyan('*')} ${chalk.white('   / \\    ')}   ${chalk.cyan('*')}
   ${chalk.white('       /___\\')}`,

  // Panda
  `   ${chalk.white('      //_// ')}   
   ${chalk.white('    ( 0_0 ) ')}   
   ${chalk.white('     > ^ <  ')}   
   ${chalk.white('    /  |  \\ ')}`,

  // Dog
  `   ${chalk.yellow('      __    ')}   
   ${chalk.yellow("   o-''|\\__/")}   
   ${chalk.yellow('    \\_/|_)  )')}   
   ${chalk.yellow('       \\_\\_/')}`,

  // Eagle
  `   ${chalk.magenta('     \\\\.---.//')}   
   ${chalk.magenta('      /q_p  \\')}   
   ${chalk.magenta('     / \\_ /  |')}   
   ${chalk.magenta("    '--...--`")}`,

  // Lizard
  `   ${chalk.green('       /^^\\ ')}   
   ${chalk.green('      / o_o\\')}   
   ${chalk.green('      \\_-_/ ')}   
   ${chalk.green('      / | \\ ')}`
];

export function showIntro() {
  console.clear();
  
  const forgeText = `
${chalk.bold.hex('#FF6B6B')('  ███████╗ ██████╗ ██████╗  ██████╗ ███████╗')}
${chalk.bold.hex('#FF8E53')('  ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝')}
${chalk.bold.hex('#FFA133')('  █████╗  ██║   ██║██████╔╝██║  ███╗█████╗  ')}
${chalk.bold.hex('#F5D300')('  ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  ')}
${chalk.bold.hex('#A8E300')('  ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗')}
${chalk.bold.hex('#39E300')('  ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝')}
  `;

  const mascot = MASCOTS[Math.floor(Math.random() * MASCOTS.length)];

  const totalBoard = `
${forgeText}
${mascot}
  ${chalk.cyan('-----------------------')}
  ${chalk.bold.hex('#74B9FF')('AI Multi-Agent Forge')}
  `;

  prompt.intro(totalBoard);
}

export function showOutro(message: string) {
  prompt.outro(chalk.bold.hex('#A29BFE')(message));
}

export function rightAlignedLog(leftText: string, rightText: string) {
  const terminalWidth = process.stdout.columns || 80;
  const paddingLength = terminalWidth - leftText.length - rightText.length - 8;
  const padding = paddingLength > 0 ? ' '.repeat(paddingLength) : ' ';
  console.log(`│  ${leftText}${padding}${chalk.dim(rightText)}`);
}
