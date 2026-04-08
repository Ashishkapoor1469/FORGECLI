import chalk from 'chalk';
import * as prompt from "@clack/prompts";
import { MASCOTS } from "./src/utils/ui.js";

// Animation interval
let currentFrame = 0;
const mascotFrames = MASCOTS.Robot; // Assume Robot

const drawMascot = () => {
    if (!process.stdout.isTTY) return;
    const cols = process.stdout.columns;
    const rows = process.stdout.rows;
    const MASCOT_WIDTH = 25;
    
    // Save cursor position
    process.stdout.write('\x1b[s');
    
    // Draw mascot at the top right of the terminal window (fixed)
    const frame = mascotFrames[currentFrame];
    for (let i = 0; i < frame.length; i++) {
        // Move to absolute row i+2, column cols - MASCOT_WIDTH
        process.stdout.write(`\x1b[${i+2};${cols - MASCOT_WIDTH}H`);
        process.stdout.write(frame[i]);
    }
    
    // Restore cursor position
    process.stdout.write('\x1b[u');
    currentFrame = (currentFrame + 1) % mascotFrames.length;
};

// Start 
setInterval(drawMascot, 500);

async function main() {
   // Fill terminal so we can test scrolling
   console.clear();
   console.log("Welcome to the test");
   for (let i=0; i<10; i++) console.log("Line " + i);
   
   while (true) {
     const value = await prompt.text({ message: "Type something:"});
     if (prompt.isCancel(value)) break;
     console.log("You typed:", value);
   }
   process.exit(0);
}

main();
