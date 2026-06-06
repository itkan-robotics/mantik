#!/usr/bin/env node
/**
 * Moves lesson MDX files into module folders based on their `group` frontmatter field.
 * Overview pages (no group / isOverview) stay at the section root.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SECTIONS = ['java', 'ftc', 'frc', 'comp'];

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const fieldMatch = line.match(/^(\w+):\s*(.*)$/);
    if (!fieldMatch) continue;
    const [, key, raw] = fieldMatch;
    let value = raw.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    fields[key] = value;
  }
  return fields;
}

function collectMdxFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMdxFiles(fullPath));
    } else if (entry.isFile() && /\.mdx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

let moved = 0;
let skipped = 0;

for (const section of SECTIONS) {
  const sectionDir = path.join(ROOT, 'src', 'content', section);
  if (!fs.existsSync(sectionDir)) continue;

  for (const filePath of collectMdxFiles(sectionDir)) {
    const relative = path.relative(sectionDir, filePath);
    const depth = relative.split(path.sep).length;

    const content = fs.readFileSync(filePath, 'utf8');
    const meta = parseFrontmatter(content);
    const group = meta.group?.trim();
    const isOverview = meta.isOverview === 'true' || meta.lessonId === 'overview';

    if (!group || isOverview) {
      if (depth > 1) {
        console.warn(`WARN: ${relative} has no group but is nested`);
      }
      skipped++;
      continue;
    }

    const targetDir = path.join(sectionDir, group);
    const targetPath = path.join(targetDir, path.basename(filePath));

    if (path.normalize(filePath) === path.normalize(targetPath)) {
      skipped++;
      continue;
    }

    fs.mkdirSync(targetDir, { recursive: true });
    fs.renameSync(filePath, targetPath);
    console.log(`${section}/${relative} -> ${group}/${path.basename(filePath)}`);
    moved++;
  }
}

console.log(`\nDone: moved ${moved}, skipped ${skipped}`);
