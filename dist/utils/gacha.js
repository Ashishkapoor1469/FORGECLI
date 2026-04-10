"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GachaManager = exports.ANIME_ROSTER = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const crypto_js_1 = require("./crypto.js");
exports.ANIME_ROSTER = [
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
class GachaManager {
    filePath;
    constructor(filePath = ".forge/gacha.dat") {
        this.filePath = (0, path_1.join)(process.cwd(), filePath);
        // Ensure the hidden .forge directory exists
        const dir = (0, path_1.dirname)(this.filePath);
        if (!(0, fs_1.existsSync)(dir))
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        this.initFile();
    }
    initFile() {
        if (!(0, fs_1.existsSync)(this.filePath)) {
            this.saveState({
                lastBoxOpened: 0,
                unlockedCharacters: [],
                activeBuddy: null,
            });
        }
    }
    getState() {
        try {
            const encrypted = (0, fs_1.readFileSync)(this.filePath, "utf-8");
            if (!encrypted.trim()) {
                return { lastBoxOpened: 0, unlockedCharacters: [], activeBuddy: null };
            }
            const json = (0, crypto_js_1.decrypt)(encrypted);
            return JSON.parse(json);
        }
        catch {
            return { lastBoxOpened: 0, unlockedCharacters: [], activeBuddy: null };
        }
    }
    /** Temporarily unlock file for writing (admin bypass) */
    unlock() {
        if ((0, fs_1.existsSync)(this.filePath)) {
            (0, fs_1.chmodSync)(this.filePath, 0o666);
        }
    }
    /** Lock file back to read-only */
    lock() {
        if ((0, fs_1.existsSync)(this.filePath)) {
            (0, fs_1.chmodSync)(this.filePath, 0o444);
        }
    }
    saveState(state) {
        this.unlock();
        const encrypted = (0, crypto_js_1.encrypt)(JSON.stringify(state));
        (0, fs_1.writeFileSync)(this.filePath, encrypted, "utf-8");
        this.lock();
    }
    reset() {
        this.saveState({
            lastBoxOpened: 0,
            unlockedCharacters: [],
            activeBuddy: null,
        });
    }
    getCollection() {
        return this.getState().unlockedCharacters;
    }
    getActiveBuddy() {
        return this.getState().activeBuddy;
    }
    setActiveBuddy(character) {
        const state = this.getState();
        if (character && !state.unlockedCharacters.includes(character)) {
            throw new Error("You haven't unlocked this character yet!");
        }
        state.activeBuddy = character;
        this.saveState(state);
    }
    openDailyBox() {
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
        const possible = exports.ANIME_ROSTER.filter((c) => !state.unlockedCharacters.includes(c));
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
exports.GachaManager = GachaManager;
