import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";

export interface Skill {
  id: string;
  version: string;
  description: string;
  type: 'code' | 'test' | 'devops' | 'architecture' | 'optimization';
  successRate: number;
  runs: number;
  executorData: string; // The prompt instruction or AST template
}

export class SkillRegistry {
  private skillsDir: string;
  private skills: Record<string, Skill> = {};

  constructor() {
    this.skillsDir = join(process.cwd(), ".forge", "skills");
    if (!existsSync(this.skillsDir)) mkdirSync(this.skillsDir, { recursive: true });
    this.loadAll();
  }

  private loadAll() {
    if (existsSync(join(this.skillsDir, "manifest.json"))) {
      this.skills = JSON.parse(readFileSync(join(this.skillsDir, "manifest.json"), "utf-8"));
    }
  }

  private save() {
    writeFileSync(join(this.skillsDir, "manifest.json"), JSON.stringify(this.skills, null, 2));
  }

  resolveSkill(intentDescription: string): Skill | null {
    // Basic resolver: checks if known skill matches wording
    const lowerDesc = intentDescription.toLowerCase();
    let bestMatch: Skill | null = null;
    let highestScore = 0;

    for (const key in this.skills) {
      const skill = this.skills[key];
      // Weighted matching...
      if (lowerDesc.includes(skill.id.toLowerCase())) {
        const score = skill.successRate;
        if (score >= highestScore) {
            highestScore = score;
            bestMatch = skill;
        }
      }
    }
    return bestMatch;
  }

  registerSkill(skill: Skill) {
    this.skills[skill.id] = skill;
    this.save();
  }

  recordRun(skillId: string, success: boolean) {
    const s = this.skills[skillId];
    if (s) {
      s.runs++;
      const currentSuccesses = (s.successRate * (s.runs - 1));
      s.successRate = (currentSuccesses + (success ? 1 : 0)) / s.runs;
      this.save();
    }
  }

  getAllSkills(): Skill[] {
    return Object.values(this.skills);
  }
}
