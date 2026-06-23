/**
 * Extract LinkGrid entries from MDX files into src/data/resources.json.
 * Descriptions: overlay JSON > LinkGrid description > Mantik lesson intro > fallback.
 * Usage: node scripts/seed-resources-from-mdx.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, 'src/data/resources.json');
const overlayPath = path.join(root, 'scripts/resource-description-overlays.json');

const DESCRIPTION_OVERLAYS = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));

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

function normalizeUrlKey(url) {
  if (url.startsWith('http')) {
    try {
      const u = new URL(url);
      u.hash = '';
      return u.toString().replace(/\/$/, '');
    } catch {
      return url;
    }
  }
  return url.replace(/\/$/, '') || url;
}

function lookupOverlay(url) {
  const key = normalizeUrlKey(url);
  return (
    DESCRIPTION_OVERLAYS[url] ??
    DESCRIPTION_OVERLAYS[key] ??
    DESCRIPTION_OVERLAYS[`${key}/`] ??
    null
  );
}

function findLessonMdx(section, lessonId) {
  const sectionDir = path.join(root, 'src/content', section);
  if (!fs.existsSync(sectionDir)) return null;

  const stack = [sectionDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!ent.name.endsWith('.mdx')) continue;
      const raw = fs.readFileSync(full, 'utf8');
      const idMatch = raw.match(/^lessonId:\s*(.+)$/m);
      if (idMatch && idMatch[1].trim() === lessonId) return full;
    }
  }
  return null;
}

function extractLessonIntro(mdxPath) {
  const raw = fs.readFileSync(mdxPath, 'utf8');
  const body = raw.replace(/^---[\s\S]*?---\s*/, '');
  const sectionMatch = body.match(/###[^\n]+\n+([\s\S]*?)(?=\n###|\n<LinkGrid|\n<ExerciseBox|\n!\[|$)/);
  if (!sectionMatch) return null;

  let text = sectionMatch[1]
    .replace(/^-\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text || text.length < 20) return null;

  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length >= 2) {
    text = sentences.slice(0, 2).join(' ').trim();
  }

  return text.slice(0, 500);
}

function lessonIntroFromUrl(url) {
  const match = url.match(/^\/(java|ftc|frc|comp)\/([^/?#]+)$/);
  if (!match) return null;
  const [, section, lessonId] = match;
  const mdxPath = findLessonMdx(section, lessonId);
  if (!mdxPath) return null;
  return extractLessonIntro(mdxPath);
}

function descriptionFor(link, minor, url) {
  const overlay = lookupOverlay(url);
  if (overlay?.trim()) return overlay.trim().slice(0, 500);

  const intro = lessonIntroFromUrl(url);
  const linkDesc = link.description?.trim();

  if (intro && (!linkDesc || intro.length > linkDesc.length + 20)) {
    return intro.slice(0, 500);
  }
  if (linkDesc) return linkDesc.slice(0, 500);
  if (intro) return intro.slice(0, 500);

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
        description: descriptionFor(link, minor, url),
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
    const key = normalizeUrlKey(e.url).toLowerCase();
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

const generic = resources.filter((r) =>
  r.description.endsWith('resource for FIRST programming.'),
).length;
console.log(`Wrote ${resources.length} resources to ${outPath} (${generic} still using fallback)`);
