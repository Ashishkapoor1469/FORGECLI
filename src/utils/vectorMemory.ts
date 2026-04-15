import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import * as crypto from "crypto";

export interface VectorEntry {
  id: string; // hash of content
  filePath: string;
  name: string; // function/class name
  content: string;
  embedding: number[];
}

export class VectorMemory {
  private dbPath: string;
  private entries: VectorEntry[] = [];

  constructor() {
    this.dbPath = join(process.cwd(), ".forge", "vectors.json");
    if (!existsSync(dirname(this.dbPath))) mkdirSync(dirname(this.dbPath), { recursive: true });
    this.load();
  }

  private load() {
    if (existsSync(this.dbPath)) {
      this.entries = JSON.parse(readFileSync(this.dbPath, "utf-8"));
    }
  }

  private save() {
    writeFileSync(this.dbPath, JSON.stringify(this.entries, null, 2));
  }

  private hash(text: string): string {
    return crypto.createHash("sha256").update(text).digest("hex");
  }

  // Very basic mock TF-IDF style vector generator for demonstration.
  // In production, would call an embedding API.
  private generateMockEmbedding(text: string): number[] {
    const words = text.toLowerCase().split(/\W+/);
    return [
      words.length % 10,
      words.indexOf("function") > -1 ? 1 : 0,
      words.indexOf("class") > -1 ? 1 : 0,
      words.indexOf("export") > -1 ? 1 : 0,
      words.indexOf("interface") > -1 ? 1 : 0,
    ];
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  upsert(filePath: string, name: string, content: string) {
    const id = this.hash(content);
    if (!this.entries.find(e => e.id === id)) {
      this.entries.push({
        id,
        filePath,
        name,
        content,
        embedding: this.generateMockEmbedding(content)
      });
      this.save();
    }
  }

  search(query: string, topK: number = 3): VectorEntry[] {
    const qEmbed = this.generateMockEmbedding(query);
    const scored = this.entries.map(e => ({
      entry: e,
      score: this.cosineSimilarity(qEmbed, e.embedding)
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(s => s.entry);
  }
}
