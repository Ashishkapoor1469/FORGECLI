import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

export interface GachaState {
  lastBoxOpened: number; // timestamp
  unlockedCharacters: string[];
  activeBuddy: string | null;
}

export const ANIME_ROSTER = [
  "Naruto Uzumaki",
  "Sasuke Uchiha",
  "Kakashi Hatake",
  "Goku",
  "Vegeta",
  "Gohan",
  "Saitama",
  "Genos",
  "Eren Yeager",
  "Levi Ackerman",
  "Mikasa Ackerman",
  "Satoru Gojo",
  "Yuji Itadori",
  "Megumi Fushiguro",
  "Monkey D. Luffy",
  "Roronoa Zoro",
  "Sanji",
  "Gon Freecss",
  "Killua Zoldyck",
  "Hisoka",
  "Tanjiro Kamado",
  "Nezuko Kamado",
  "Zenitsu Agatsuma",
  "Light Yagami",
  "L Lawliet",
  "Izuku Midoriya",
  "Katsuki Bakugo",
  "Shoto Todoroki",
];

export class GachaManager {
  private filePath: string;

  constructor(filePath = ".forge/gacha.json") {
    this.filePath = join(process.cwd(), filePath);
    // Ensure the hidden .forge directory exists
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.initFile();
  }

  private initFile() {
    if (!existsSync(this.filePath)) {
      this.saveState({
        lastBoxOpened: 0,
        unlockedCharacters: [],
        activeBuddy: null,
      });
    }
  }

  private getState(): GachaState {
    try {
      const data = readFileSync(this.filePath, "utf-8");
      return JSON.parse(data);
    } catch {
      return { lastBoxOpened: 0, unlockedCharacters: [], activeBuddy: null };
    }
  }

  private saveState(state: GachaState) {
    writeFileSync(this.filePath, JSON.stringify(state, null, 2), "utf-8");
  }

  getCollection(): string[] {
    return this.getState().unlockedCharacters;
  }

  getActiveBuddy(): string | null {
    return this.getState().activeBuddy;
  }

  setActiveBuddy(character: string | null) {
    const state = this.getState();
    if (character && !state.unlockedCharacters.includes(character)) {
      throw new Error("You haven't unlocked this character yet!");
    }
    state.activeBuddy = character;
    this.saveState(state);
  }

  openDailyBox(): { success: boolean; character?: string; message: string } {
    const state = this.getState();
    const now = Date.now();
    const hours24 = 24 * 60 * 60 * 1000;

    // Reject if too soon
    if (now - state.lastBoxOpened < hours24) {
      const remainingMs = hours24 - (now - state.lastBoxOpened);
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      return {
        success: false,
        message: `You must wait ${hours}h ${mins}m before opening another box!`,
      };
    }

    // Determine lockouts
    const possible = ANIME_ROSTER.filter(
      (c) => !state.unlockedCharacters.includes(c),
    );
    if (possible.length === 0) {
      return {
        success: false,
        message: "You have already unlocked every character in the game!",
      };
    }

    // Roll
    const randomIndex = Math.floor(Math.random() * possible.length);
    const wonCharacter = possible[randomIndex];

    // Save
    state.unlockedCharacters.push(wonCharacter);
    state.lastBoxOpened = now;
    this.saveState(state);

    return {
      success: true,
      character: wonCharacter,
      message: `You unlocked: ${wonCharacter}!`,
    };
  }
}
