#!/usr/bin/env node
/**
 * Estimates realistic student completion time from lesson content and updates
 * frontmatter `duration` fields across FRC, FTC, Java, and Comp collections.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SECTIONS = ['frc', 'ftc', 'java', 'comp'];

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { fm: {}, body: raw, rawFrontmatter: null };
  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx > 0) fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { fm, body: raw.slice(match[0].length), rawFrontmatter: match[1] };
}

function extractCodeFromTabs(body) {
  let chars = 0;
  let lines = 0;
  let tabs = 0;

  const tabBlocks = body.match(/<CodeTabs[\s\S]*?\/>|<CodeTabs[\s\S]*?<\/CodeTabs>/g) || [];
  for (const block of tabBlocks) {
    const codeMatches = block.matchAll(/"code"\s*:\s*"((?:\\.|[^"\\])*)"/g);
    for (const m of codeMatches) {
      tabs += 1;
      const code = JSON.parse(`"${m[1]}"`);
      chars += code.length;
      lines += code.split('\n').length;
    }
  }

  return { chars, lines, tabs };
}

function extractMetrics(body) {
  let prose = body;
  prose = prose.replace(/```[\s\S]*?```/g, ' ');
  prose = prose.replace(/<CodeTabs[\s\S]*?\/>/g, ' ');
  prose = prose.replace(/<CodeTabs[\s\S]*?<\/CodeTabs>/g, ' ');
  prose = prose.replace(/answers=\{[\s\S]*?\}(?=\s*>)/g, ' ');

  const proseWords = prose
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

  let fenceChars = 0;
  let fenceLines = 0;
  let fenceBlocks = 0;
  for (const m of body.matchAll(/```[\s\S]*?```/g)) {
    fenceBlocks += 1;
    const code = m[0].replace(/^```[^\n]*\n?/, '').replace(/```$/, '');
    fenceChars += code.length;
    fenceLines += code.split('\n').length;
  }

  const tabs = extractCodeFromTabs(body);
  const exerciseBoxes = (body.match(/<ExerciseBox/g) || []).length;
  const answerTasks = (body.match(/"task"\s*:/g) || []).length;
  const linkGrids = (body.match(/<LinkGrid/g) || []).length;
  const externalLinks = (body.match(/\]\(https?:\/\//g) || []).length;
  const reflectionExercises =
    exerciseBoxes > 0 && answerTasks === 0 && fenceLines + tabs.lines < 8;

  return {
    proseWords,
    codeLines: fenceLines + tabs.lines,
    codeBlocks: fenceBlocks + tabs.tabs,
    exerciseBoxes,
    answerTasks,
    linkGrids,
    externalLinks,
    reflectionExercises,
  };
}

function round5(n) {
  return Math.max(5, Math.round(n / 5) * 5);
}

/**
 * Student completion time (reading + studying examples + hands-on work).
 */
export function estimateDuration(filePath, fm, body) {
  const name = path.basename(filePath, '.mdx');
  const section = fm.section || path.basename(path.dirname(filePath));
  const m = extractMetrics(body);

  const diffMult =
    { beginner: 1, intermediate: 1.1, advanced: 1.2 }[fm.difficulty] || 1;

  let minutes = 0;

  // Reading and note-taking
  minutes += m.proseWords / 115;

  // Studying code examples (capped — students skim long reference dumps)
  minutes += Math.min(m.codeLines * 0.22, 42);
  minutes += Math.max(0, m.codeBlocks - 1) * 1.5;

  // Hands-on exercises
  if (m.exerciseBoxes > 0) {
    if (m.reflectionExercises) {
      minutes += m.exerciseBoxes * 8;
    } else {
      minutes += m.exerciseBoxes * 16;
      minutes += Math.max(0, m.answerTasks - m.exerciseBoxes) * 3;
    }
  }

  // Skimming linked external documentation
  minutes += Math.min(m.externalLinks * 1.5, 20);

  // External doc links add skim time
  minutes += m.linkGrids * 3;

  // Lesson-type adjustments
  if (/teleop-exercises|tuning-practice|pid-practice/i.test(name)) {
    minutes = Math.max(minutes, 40 + m.exerciseBoxes * 14);
  }

  if (/environment-setup|android-studio-setup|install-git|project-creation/i.test(name)) {
    minutes += 22;
  }

  if (/example|walkthrough|command-based|intake-|elevator-|shooter-/i.test(name)) {
    minutes += 12;
  }

  if (section === 'comp') {
    minutes += Math.min(m.codeLines, 80) * 0.08;
    if (/advanced|segment|dynamic-programming|backtracking/i.test(name)) minutes += 8;
  }

  if (section === 'frc' || section === 'ftc') {
    if (/pid|odometry|path|vision|autonomous|control|profiling/i.test(name)) {
      minutes += 8;
    }
    if (/pid|profiling|motion-profiling|robot-pid/i.test(name) && m.codeLines > 0) {
      minutes += 15;
    }
    if (/profiling|motion-profiling/i.test(name) && m.codeLines > 25) {
      minutes += 10;
    }
  }

  // Short reference / overview hub pages (navigation only, no exercises)
  if (
    m.proseWords < 450 &&
    m.exerciseBoxes === 0 &&
    m.codeLines < 15 &&
    /overview|resources|programming-resources|onbot-java-setup|sdk-basics|telemetry-logging|advanced-movement-control$/i.test(
      name,
    )
  ) {
    minutes = Math.max(10, Math.min(minutes, 20));
  }

  minutes *= diffMult;

  // Reasonable floors by lesson shape
  if (fm.difficulty === 'advanced' && m.proseWords > 150 && minutes < 30) {
    minutes = 30;
  } else if (fm.difficulty === 'intermediate' && m.proseWords > 250 && minutes < 20) {
    minutes = 20;
  }

  if (/overview/i.test(fm.title || '') && m.exerciseBoxes === 0) {
    minutes = Math.max(10, Math.min(minutes, 25));
  }

  if (section === 'comp' && m.proseWords < 180 && m.codeLines === 0 && m.exerciseBoxes === 0) {
    minutes = 15;
  }

  // Practical bounds for a single sitting
  const max =
    m.exerciseBoxes >= 4 ? 150 : m.codeLines > 400 ? 120 : 105;
  return round5(Math.min(max, Math.max(10, minutes)));
}

function updateFile(filePath, dryRun = false) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { fm, body } = parseFrontmatter(raw);
  if (fm.isOverview === 'true' || fm.isOverview === true) return null;

  const estimated = estimateDuration(filePath, fm, body);
  const hasDuration = Object.prototype.hasOwnProperty.call(fm, 'duration');
  const current = hasDuration ? parseInt(fm.duration, 10) || 0 : null;
  const next = `${estimated} min`;

  if (hasDuration && fm.duration === next) return null;

  if (!dryRun) {
    let updated = raw;
    if (hasDuration) {
      updated = raw.replace(/^duration:\s*.+$/m, `duration: ${next}`);
    } else {
      const fmEnd = raw.indexOf('---', 4);
      updated = `${raw.slice(0, fmEnd)}duration: ${next}\n${raw.slice(fmEnd)}`;
    }
    fs.writeFileSync(filePath, updated, 'utf8');
  }

  return {
    file: path.basename(filePath),
    section: fm.section || '',
    current: current ?? '(none)',
    estimated,
    diff: current == null ? estimated : estimated - current,
  };
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const debugFile = process.argv.find((a) => a.startsWith('--debug='))?.slice(8);
  const changes = [];

  if (debugFile) {
    const filePath = path.isAbsolute(debugFile)
      ? debugFile
      : path.join(ROOT, debugFile);
    const raw = fs.readFileSync(filePath, 'utf8');
    const { fm, body } = parseFrontmatter(raw);
    console.log(extractMetrics(body));
    console.log('estimate:', estimateDuration(filePath, fm, body));
    return;
  }

  for (const section of SECTIONS) {
    const dir = path.join(ROOT, 'src', 'content', section);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.mdx')).sort()) {
      const result = updateFile(path.join(dir, file), dryRun);
      if (result) changes.push(result);
    }
  }

  changes.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  console.log(`${dryRun ? '[dry-run] ' : ''}Updated ${changes.length} lessons`);
  if (changes.length) {
    console.log('\nLargest changes:');
    for (const row of changes.slice(0, 20)) {
      console.log(
        `  ${row.section}/${row.file}: ${row.current} -> ${row.estimated} min (${row.diff >= 0 ? '+' : ''}${row.diff})`,
      );
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
