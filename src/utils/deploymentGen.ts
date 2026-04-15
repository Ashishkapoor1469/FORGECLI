import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export class DeploymentGenerator {
  generateDocker(projectPath: string, type: "node" | "react") {
    // Dockerfile
    const dockerfile = type === "node" 
      ? `FROM node:18-alpine\nWORKDIR /app\nCOPY package.json .\nRUN npm install\nCOPY . .\nCMD ["npm", "start"]`
      : `FROM node:18-alpine AS build\nWORKDIR /app\nCOPY package.json .\nRUN npm install\nCOPY . .\nRUN npm run build\nFROM nginx:alpine\nCOPY --from=build /app/dist /usr/share/nginx/html\nEXPOSE 80\nCMD ["nginx", "-g", "daemon off;"]`;
    
    writeFileSync(join(projectPath, "Dockerfile"), dockerfile);

    // docker-compose.yml
    const compose = `version: '3.8'\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:${type === "node" ? "3000" : "80"}"`;
    writeFileSync(join(projectPath, "docker-compose.yml"), compose);
  }

  generateGithubActions(projectPath: string) {
    const wfDir = join(projectPath, ".github", "workflows");
    if (!existsSync(wfDir)) mkdirSync(wfDir, { recursive: true });

    const yml = `name: CI\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - uses: actions/setup-node@v3\n        with:\n          node-version: 18\n      - run: npm install\n      - run: npm test\n`;
    writeFileSync(join(wfDir, "ci.yml"), yml);
  }
}
