/**
 * Extract LinkGrid entries from MDX files into src/data/resources.json.
 * Usage: node scripts/seed-resources-from-mdx.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, 'src/data/resources.json');

const SOURCES = [
  {
    file: 'src/content/frc/frc-environment-setup/frc-programming-resources.mdx',
    major: 'frc',
    defaultMinor: 'General',
  },
  {
    file: 'src/content/ftc/onbot-java-setup/onbot-java-setup.mdx',
    major: 'ftc',
    defaultMinor: 'OnBot Java Setup',
  },
  {
    file: 'src/content/ftc/android-studio-setup/android-studio-setup.mdx',
    major: 'ftc',
    defaultMinor: 'Android Studio Setup',
  },
];

const LINKGRID_RE =
  /<LinkGrid\s+links=\{(\[[\s\S]*?\])\}\s*(?:title="([^"]*)")?\s*(?:section="([^"]*)")?\s*\/>/g;

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function resolveUrl(link, section) {
  if (link.url) return link.url;
  if (link.id) {
    const sec = section || 'frc';
    if (['java', 'ftc', 'frc', 'comp'].includes(link.id)) return `/${link.id}`;
    return `/${sec}/${link.id}`;
  }
  return null;
}

function descriptionFor(link, minor) {
  if (link.description?.trim()) return link.description.trim().slice(0, 500);
  return `${link.label} — ${minor} resource for FIRST programming.`.slice(0, 500);
}

function parseLinkGrids(content, major, defaultMinor) {
  const entries = [];
  let match;
  while ((match = LINKGRID_RE.exec(content)) !== null) {
    const [, jsonStr, title, section] = match;
    const minor = title?.trim() || defaultMinor;
    let links;
    try {
      links = JSON.parse(jsonStr);
    } catch {
      console.warn('Failed to parse LinkGrid JSON in', minor);
      continue;
    }
    for (const link of links) {
      const url = resolveUrl(link, section || major);
      if (!url) continue;
      const baseId = slugify(`${major}-${minor}-${link.label}`);
      entries.push({
        id: baseId,
        title: link.label.slice(0, 120),
        description: descriptionFor(link, minor),
        url,
        major,
        minor: minor.slice(0, 80),
        tags: [major, slugify(minor)].filter(Boolean),
        source: 'mantik',
      });
    }
  }
  return entries;
}

function dedupeByUrl(entries) {
  const seen = new Map();
  for (const e of entries) {
    const key = e.url.toLowerCase();
    if (!seen.has(key)) seen.set(key, e);
  }
  return [...seen.values()];
}

function ensureUniqueIds(entries) {
  const used = new Set();
  return entries.map((e) => {
    let id = e.id;
    let n = 2;
    while (used.has(id)) {
      id = `${e.id}-${n}`;
      n += 1;
    }
    used.add(id);
    return { ...e, id };
  });
}

const all = [];
for (const src of SOURCES) {
  const filePath = path.join(root, src.file);
  const content = fs.readFileSync(filePath, 'utf8');
  all.push(...parseLinkGrids(content, src.major, src.defaultMinor));
}

const resources = ensureUniqueIds(dedupeByUrl(all)).sort((a, b) =>
  a.title.localeCompare(b.title),
);

const catalog = { version: 1, resources };
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
console.log(`Wrote ${resources.length} resources to ${outPath}`);
