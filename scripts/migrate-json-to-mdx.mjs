#!/usr/bin/env node
/**
 * Migrates legacy JSON content to readable MDX for Astro content collections.
 * Output uses markdown, fenced code blocks, and component slots (no per-file imports).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'legacy', 'data');
const CONTENT = path.join(ROOT, 'src', 'content');

const SECTION_CONFIGS = [
  { config: 'java-training-config.json', section: 'java' },
  { config: 'ftc-specific-config.json', section: 'ftc' },
  { config: 'frc-specific-config.json', section: 'frc' },
  { config: 'competitive-training-config.json', section: 'comp' },
];

function htmlToMarkdownInline(str) {
  return String(str)
    .replace(/<a href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<br\s*\/?>/gi, '\n\n')
    .replace(/&bull;/g, '•')
    .replace(/<\/a>/g, '')
    .replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/`([^`]+)<\/code>/gi, '`$1`')
    .replace(/<code>([^<`]+)`/gi, '`$1`');
}

function looksLikeCode(content) {
  const c = String(content).trim();
  if (!c.includes('\n')) return false;
  return (
    /^\s*(while|for|if|public|class|import|void|int|double|boolean|String|Scanner|System\.)/m.test(c) ||
    (c.includes('{') && c.includes('}') && c.includes(';'))
  );
}

function stripRemainingHtml(str) {
  return String(str)
    .replace(/<[^>]*>/g, '')
    .replace(/<\s*$/gm, '')
    .replace(/<\s+(?=[^a-z/!])/gi, '');
}

function sanitizeContent(str) {
  if (!str) return '';
  return htmlToMarkdownInline(str)
    .replace(/<\/code\./g, '</code>.')
    .replace(/<\/code([^>a-z/])/gi, '</code>$1');
}

/** Escape `{`/`}` so MDX does not treat them as JSX expressions in prose. */
function escapeMdxExpressions(str) {
  return String(str).replace(/\{/g, '\\{').replace(/\}/g, '\\}');
}

function inlineProse(str) {
  if (!str) return '';
  let converted = sanitizeContent(str)
    .replace(/<</g, '&lt;&lt;')
    .replace(/>>/g, '&gt;&gt;');
  if (/<[^>]*>?/.test(converted) || /<\s*$/.test(converted)) {
    converted = stripRemainingHtml(converted);
  }
  return escapeMdxExpressions(converted.trim());
}

function htmlUlToMarkdown(html) {
  const trimmed = html.trim();
  if (!trimmed.startsWith('<ul>')) return null;
  const items = [];
  const re = /<li>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = re.exec(trimmed)) !== null) {
    items.push(match[1]);
  }
  if (!items.length) return null;
  return mdBulletList(items);
}

function prose(str) {
  if (!str) return '';
  const asList = htmlUlToMarkdown(str);
  if (asList) return asList;
  return `${inlineProse(str)}\n\n`;
}

function resolveJsonPath(fileRef) {
  const normalized = fileRef.replace(/\\/g, '/');
  const candidates = [
    path.join(ROOT, normalized),
    path.join(ROOT, 'legacy', normalized),
    path.join(ROOT, normalized.replace(/^data\//, 'legacy/data/')),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}

function yamlString(str) {
  if (!str) return '""';
  if (/[:#\n"'&*!|>@[\]{},]/.test(str) || str.startsWith(' ') || str.endsWith(' ')) {
    return JSON.stringify(str);
  }
  return str;
}

function mdBulletList(items) {
  return items
    .map((item) => {
      const text = typeof item === 'string' ? inlineProse(item) : item;
      return `- ${text}`;
    })
    .join('\n') + '\n\n';
}

function mdOrderedList(items) {
  return items
    .map((item, i) => {
      if (typeof item === 'string') return `${i + 1}. ${inlineProse(item)}`;
      let line = `${i + 1}. ${inlineProse(item.text ?? '')}`;
      if (item.subitems?.length) {
        line += '\n' + item.subitems.map((sub) => `   - ${inlineProse(sub)}`).join('\n');
      }
      return line;
    })
    .join('\n') + '\n\n';
}

function mdFence(code, lang = 'java') {
  const fence = '```';
  return `${fence}${lang}\n${code}\n${fence}\n\n`;
}

function mdCodeTabs(tabs) {
  let out = '<CodeTabs>\n';
  for (const tab of tabs) {
    const label = tab.label ?? 'Tab';
    const code = tab.code ?? tab.content ?? '';
    const lang = tab.language ?? 'java';
    const fence = mdFence(code, lang).trim();
    out += wrapComponent('CodeTab', { label }, fence);
  }
  return `${out}</CodeTabs>\n\n`;
}

function componentAttrs(props) {
  return Object.entries(props)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      if (typeof v === 'string') return `${k}="${escapeAttr(v)}"`;
      return `${k}={${JSON.stringify(v)}}`;
    })
    .join(' ');
}

function wrapComponent(tag, attrs, body) {
  const attrStr = componentAttrs(attrs);
  const open = attrStr ? `<${tag} ${attrStr}>` : `<${tag}>`;
  const trimmed = body.trim();
  if (!trimmed) return `${open}\n\n</${tag}>\n\n`;
  return `${open}\n\n${trimmed}\n\n</${tag}>\n\n`;
}

function convertSection(section, sectionSlug) {
  const type = section.type;

  switch (type) {
    case 'text': {
      let out = '';
      if (section.title) out += `### ${section.title}\n\n`;
      if (section.content) {
        if (looksLikeCode(section.content)) {
          out += mdFence(section.content, section.language ?? 'java');
        } else {
          out += prose(section.content);
        }
      }
      return out;
    }
    case 'list': {
      let out = '';
      if (section.title) out += `### ${section.title}\n\n`;
      const items = section.items ?? section.content ?? [];
      if (Array.isArray(items)) out += mdBulletList(items);
      return out;
    }
    case 'code': {
      let out = '';
      if (section.title) out += `### ${section.title}\n\n`;
      const code = section.code ?? section.content ?? '';
      const lang = section.language ?? 'java';
      if (section.content && section.code && section.content !== section.code) {
        out += `${prose(section.content)}\n\n`;
      }
      if (code.trim()) out += mdFence(code, lang);
      return out;
    }
    case 'code-tabs': {
      const tabs = (section.tabs ?? []).map((tab) => ({
        label: tab.label ?? 'Tab',
        code: tab.code ?? tab.content ?? '',
        language: tab.language ?? 'java',
      }));
      let out = '';
      if (section.title) out += `### ${section.title}\n\n`;
      if (section.description) out += `${prose(section.description)}\n\n`;
      out += mdCodeTabs(tabs);
      return out;
    }
    case 'rules-box':
    case 'emphasis-box': {
      const attrs = {};
      if (section.title) attrs.title = section.title;
      if (section.subtitle) attrs.subtitle = section.subtitle;

      let body = '';
      if (section.items?.length) body += mdBulletList(section.items);
      if (section.goodPractices?.length) {
        body += `**Good Practices:**\n\n${mdBulletList(section.goodPractices)}`;
      }
      if (section.avoid?.length) {
        body += `**Avoid:**\n\n${mdBulletList(section.avoid)}`;
      }
      if (section.content) body += `${prose(section.content)}\n\n`;
      return wrapComponent('RulesBox', attrs, body);
    }
    case 'steps-box': {
      const attrs = {};
      if (section.title) attrs.title = section.title;
      if (section.subtitle) attrs.subtitle = section.subtitle;
      let body = '';
      if (section.items?.length) body += mdOrderedList(section.items.map((item) =>
        typeof item === 'string' ? prose(item) : { ...item, text: prose(item.text), subitems: item.subitems?.map(prose) },
      ));
      if (section.content) body += `${prose(section.content)}\n\n`;
      return wrapComponent('StepsBox', attrs, body);
    }
    case 'exercise-box': {
      const attrs = {};
      if (section.title) attrs.title = section.title;
      if (section.subtitle) attrs.subtitle = section.subtitle;
      if (section.description) attrs.description = section.description;
      if (section.language) attrs.language = section.language;
      if (section.answers?.length) attrs.answers = section.answers;

      let body = '';
      if (section.tasks?.length) body += mdBulletList(section.tasks);

      const code = section.code ?? (section.content && section.content !== section.description ? section.content : '');
      if (code?.trim()) body += mdFence(code, section.language ?? 'java');

      return wrapComponent('ExerciseBox', attrs, body);
    }
    case 'data-types-grid': {
      return `<DataTypesGrid types={${JSON.stringify(section.types ?? [])}} />\n\n`;
    }
    case 'logical-operators': {
      const attrs = {};
      if (section.title) attrs.title = section.title;
      if (section.subtitle) attrs.subtitle = section.subtitle;

      let body = '';
      if (section.operators?.length) body += mdBulletList(section.operators);
      if (section.examples) {
        body += `#### Examples:\n\n${mdFence(section.examples, 'java')}`;
      }
      return wrapComponent('LogicalOperators', attrs, body);
    }
    case 'link-grid': {
      const links = (section.links ?? section.items ?? section.content ?? []).map((link) => {
        if (typeof link === 'string') return { label: link, url: link };
        return {
          label: link.label ?? link.title ?? 'Link',
          id: link.id,
          url: link.url,
          description: link.description,
          underConstruction: link.underConstruction,
          external: link.external,
        };
      });
      const attrs = { links };
      if (section.title) attrs.title = section.title;
      if (sectionSlug) attrs.section = sectionSlug;
      return `<LinkGrid ${componentAttrs(attrs)} />\n\n`;
    }
    case 'table': {
      let out = '';
      if (section.title) out += `### ${section.title}\n\n`;
      const headers = section.headers ?? [];
      const rows = section.rows ?? [];
      if (headers.length) {
        out += `| ${headers.join(' | ')} |\n`;
        out += `| ${headers.map(() => '---').join(' | ')} |\n`;
        for (const row of rows) {
          out += `| ${row.join(' | ')} |\n`;
        }
        out += '\n';
      }
      return out;
    }
    case 'section': {
      let out = '';
      if (section.title) out += `### ${section.title}\n\n`;
      if (section.content) out += `${prose(section.content)}\n\n`;
      return out;
    }
    default:
      console.warn(`Unknown section type: ${type}`);
      return '';
  }
}

function convertSections(sections, sectionSlug) {
  return (sections ?? []).map((s) => convertSection(s, sectionSlug)).join('');
}

function writeMdx(filePath, frontmatter, body) {
  const fm = Object.entries(frontmatter)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      if (typeof v === 'string') return `${k}: ${yamlString(v)}`;
      if (typeof v === 'boolean') return `${k}: ${v}`;
      return `${k}: ${v}`;
    })
    .join('\n');

  const content = `---\n${fm}\n---\n\n${body}`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function migrateSectionConfig(configFile, section) {
  const configPath = path.join(DATA, 'config', configFile);
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  const overviewBody = convertSections(config.sections, section);
  writeMdx(path.join(CONTENT, section, 'overview.mdx'), {
    title: config.title,
    lessonId: 'overview',
    section,
    description: config.description ?? '',
    isOverview: true,
    order: 0,
  }, overviewBody);

  let groupOrder = 0;

  function processGroup(group) {
    groupOrder++;
    let itemOrder = 0;

    for (const item of group.items ?? []) {
      itemOrder++;
      const jsonPath = resolveJsonPath(item.file);
      if (!fs.existsSync(jsonPath)) {
        console.warn(`Missing: ${item.file}`);
        continue;
      }

      const lesson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const body = convertSections(lesson.sections, section);

      writeMdx(path.join(CONTENT, section, `${item.id}.mdx`), {
        title: lesson.title ?? item.label,
        lessonId: item.id,
        section,
        group: group.id,
        groupLabel: group.label,
        groupOrder,
        order: itemOrder,
        difficulty: item.difficulty,
        duration: item.duration,
        description: lesson.description ?? '',
      }, body);
    }

    for (const child of group.children ?? []) {
      processGroup(child);
    }
  }

  for (const group of config.groups ?? []) {
    processGroup(group);
  }
}

function migrateHomepage() {
  const homepagePath = path.join(DATA, 'config', 'homepage.json');
  const homepage = JSON.parse(fs.readFileSync(homepagePath, 'utf8'));
  const body = convertSections(homepage.sections, null);

  writeMdx(path.join(CONTENT, 'homepage', 'index.mdx'), {
    title: homepage.title ?? 'Welcome to Mantik',
    description: homepage.description ?? '',
  }, body);
}

function migrateOrphanJson() {
  const linked = new Set();
  for (const { config } of SECTION_CONFIGS) {
    const cfg = JSON.parse(fs.readFileSync(path.join(DATA, 'config', config), 'utf8'));

    function collectItems(group) {
      for (const item of group.items ?? []) {
        linked.add(item.file.replace(/\\/g, '/'));
      }
      for (const child of group.children ?? []) {
        collectItems(child);
      }
    }

    for (const group of cfg.groups ?? []) {
      collectItems(group);
    }
  }

  const sectionDirs = { java: 'java', ftc: 'ftc', frc: 'frc', comp: 'comp' };

  function walk(dir, section) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.includes('unused')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, section);
      } else if (entry.name.endsWith('.json')) {
        const rel = path.relative(ROOT, full).replace(/\\/g, '/');
        const relLegacy = rel.replace(/^legacy\/data\//, 'data/');
        if (linked.has(rel) || linked.has(relLegacy)) continue;

        const lesson = JSON.parse(fs.readFileSync(full, 'utf8'));
        const id = lesson.id ?? path.basename(entry.name, '.json');
        const outPath = path.join(CONTENT, section, `${id}.mdx`);
        if (fs.existsSync(outPath)) continue;

        const body = convertSections(lesson.sections, section);
        writeMdx(outPath, {
          title: lesson.title ?? id,
          lessonId: id,
          section,
          group: 'extra',
          groupLabel: 'Additional',
          groupOrder: 99,
          order: 99,
          draft: true,
        }, body);
        console.log(`Migrated orphan: ${rel}`);
      }
    }
  }

  for (const [section, dir] of Object.entries(sectionDirs)) {
    walk(path.join(DATA, dir), section);
  }
}

// Main — destructive: regenerates all src/content from legacy JSON
for (const dir of ['java', 'ftc', 'frc', 'comp', 'homepage']) {
  const p = path.join(CONTENT, dir);
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true });
  fs.mkdirSync(p, { recursive: true });
}

migrateHomepage();
for (const { config, section } of SECTION_CONFIGS) {
  migrateSectionConfig(config, section);
  console.log(`Migrated section: ${section}`);
}
migrateOrphanJson();
console.log('Migration complete.');
