import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from "fs";
import { join, dirname } from "path";
import { encrypt, decrypt } from "./crypto.js";

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

  constructor(filePath = ".forge/gacha.dat") {
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

  getState(): GachaState {
    try {
      const encrypted = readFileSync(this.filePath, "utf-8");
      if (!encrypted.trim()) {
        return { lastBoxOpened: 0, unlockedCharacters: [], activeBuddy: null };
      }
      const json = decrypt(encrypted);
      return JSON.parse(json);
    } catch {
      return { lastBoxOpened: 0, unlockedCharacters: [], activeBuddy: null };
    }
  }

  /** Temporarily unlock file for writing (admin bypass) */
  private unlock() {
    if (existsSync(this.filePath)) {
      chmodSync(this.filePath, 0o666);
    }
  }

  /** Lock file back to read-only */
  private lock() {
    if (existsSync(this.filePath)) {
      chmodSync(this.filePath, 0o444);
    }
  }

  private saveState(state: GachaState) {
    this.unlock();
    const encrypted = encrypt(JSON.stringify(state));
    writeFileSync(this.filePath, encrypted, "utf-8");
    this.lock();
  }

  reset() {
    this.saveState({
      lastBoxOpened: 0,
      unlockedCharacters: [],
      activeBuddy: null,
    });
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
