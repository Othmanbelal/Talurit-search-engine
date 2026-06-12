import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const limit = Number.parseInt(process.env.LINE_LIMIT ?? "350", 10);
const root = process.cwd();

const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  ".vite",
  "docs",
]);

const ignoredFiles = new Set([
  "AGENTS.md",
  "Claude.md",
  "package-lock.json",
  "PLAN.md",
]);

const includedExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mjs",
  ".prisma",
  ".sh",
  ".ts",
  ".tsx",
  ".yml",
  ".yaml",
]);

const includedNames = new Set([
  "Dockerfile",
]);

function collectFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...collectFiles(join(directory, entry.name)));
      }
      continue;
    }

    const shouldCheck =
      includedExtensions.has(extname(entry.name)) ||
      includedNames.has(entry.name);

    const filePath = join(directory, entry.name);

    if (
      entry.isFile() &&
      shouldCheck &&
      !ignoredFiles.has(entry.name) &&
      !isSchemaFile(entry.name)
    ) {
      files.push(filePath);
    }
  }

  return files;
}

function isSchemaFile(fileName) {
  return (
    fileName.endsWith(".prisma") ||
    fileName.endsWith(".schema.ts") ||
    fileName.endsWith(".schemas.ts")
  );
}

const oversizedFiles = collectFiles(root)
  .map((filePath) => {
    const contents = readFileSync(filePath, "utf8");
    const lines = contents.length === 0 ? 0 : contents.split(/\r?\n/).length;
    return { filePath, lines };
  })
  .filter((result) => result.lines > limit);

if (oversizedFiles.length > 0) {
  console.error(`Files over ${limit} lines:`);

  for (const result of oversizedFiles) {
    console.error(`- ${relative(root, result.filePath)} (${result.lines})`);
  }

  process.exit(1);
}

console.log(`Line check passed. No checked non-schema file exceeds ${limit} lines.`);
