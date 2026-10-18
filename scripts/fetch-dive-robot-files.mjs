/**
 * Build The Trenches backdrop pool (top Java teams by norm EPA) and cache Robot.java vs
 * RobotContainer.java — whichever is longer — under public/data/dive/teams/.
 * Files are scroll backdrops only; trivia is general FRC programming.
 *
 *   node scripts/fetch-dive-robot-files.mjs
 *   node scripts/fetch-dive-robot-files.mjs --limit=5
 */

import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REPOS_JSON = join(ROOT, 'public', 'data', 'frc-2026-public-repositories.json');
const DIVE_DIR = join(ROOT, 'public', 'data', 'dive');
const TEAMS_DIR = join(DIVE_DIR, 'teams');
const ROSTER_OUT = join(DIVE_DIR, 'team-roster.json');

const DEFAULT_LIMIT = 20;
const MIN_LINES = 30;

const ROBOT_DIR_CANDIDATES = [
  'src/main/java/frc/robot',
  'src/main/java/org/frc/robot',
];

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith('--limit='));
const teamLimit = limitArg ? Number(limitArg.split('=')[1]) : DEFAULT_LIMIT;

function delaySync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function ghApiJson(path, { retries = 4 } = {}) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const apiArg = path.startsWith('http')
        ? path.replace(/^https:\/\/api\.github\.com\//, '')
        : path.replace(/^\//, '');
      const out = execFileSync('gh', ['api', apiArg], {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
      });
      return JSON.parse(out);
    } catch (err) {
      const msg = String(err.stderr ?? err.message ?? err);
      if (msg.includes('403') && msg.includes('rate limit')) {
        const wait = 15_000 + attempt * 10_000;
        console.warn(`GitHub rate limit — waiting ${wait / 1000}s`);
        delaySync(wait);
        continue;
      }
      if (attempt === retries - 1) throw err;
      delaySync(2000 * (attempt + 1));
    }
  }
  throw new Error('gh api failed');
}

function lineCount(text) {
  if (!text) return 0;
  return text.split(/\r?\n/).length;
}

async function fetchFileContent(owner, repo, path) {
  try {
    const data = ghApiJson(`repos/${owner}/${repo}/contents/${path}`);
    if (Array.isArray(data) || data.type !== 'file') return null;
    const text = Buffer.from(data.content, 'base64').toString('utf8');
    return { text, sha: data.sha, path };
  } catch {
    return null;
  }
}

function searchRobotFile(owner, repo, filename) {
  try {
    const q = `filename:${filename} repo:${owner}/${repo}`;
    const res = ghApiJson(`search/code?q=${encodeURIComponent(q)}&per_page=5`);
    const items = res?.items ?? [];
    const hit = items.find((i) => i.name === filename);
    return hit?.path ?? null;
  } catch {
    return null;
  }
}

async function listRobotDir(owner, repo) {
  for (const dir of ROBOT_DIR_CANDIDATES) {
    try {
      const data = ghApiJson(`repos/${owner}/${repo}/contents/${dir}`);
      if (!Array.isArray(data)) continue;
      const names = new Set(data.map((e) => e.name));
      if (names.has('Robot.java') || names.has('RobotContainer.java')) {
        return dir;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

async function resolveEntryFiles(owner, repo) {
  const dir = await listRobotDir(owner, repo);
  let robot = null;
  let container = null;

  if (dir) {
    robot = await fetchFileContent(owner, repo, `${dir}/Robot.java`);
    container = await fetchFileContent(owner, repo, `${dir}/RobotContainer.java`);
  }

  if (!robot) {
    const path = searchRobotFile(owner, repo, 'Robot.java');
    if (path) robot = await fetchFileContent(owner, repo, path);
  }
  if (!container) {
    const path = searchRobotFile(owner, repo, 'RobotContainer.java');
    if (path) container = await fetchFileContent(owner, repo, path);
  }

  return { robot, container };
}

function pickLonger(robot, container) {
  const candidates = [robot, container].filter(Boolean);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, cur) => {
    const bestLines = lineCount(best.text);
    const curLines = lineCount(cur.text);
    if (curLines > bestLines) return cur;
    if (curLines === bestLines && cur.text.length > best.text.length) return cur;
    return best;
  });
}

async function loadRosterCandidates() {
  const raw = await readFile(REPOS_JSON, 'utf8');
  const data = JSON.parse(raw);
  const rows = (data.rows ?? [])
    .filter((r) => String(r.language ?? '').toLowerCase() === 'java')
    .filter((r) => r.linkToCodebases && r.teamNumber != null)
    .sort((a, b) => (b.normEpa ?? 0) - (a.normEpa ?? 0));

  return rows;
}

async function fetchRepoLicense(owner, repo) {
  try {
    const lic = ghApiJson(`repos/${owner}/${repo}/license`);
    return lic?.license?.spdx_id ?? lic?.license?.name ?? null;
  } catch {
    return null;
  }
}

async function main() {
  await mkdir(TEAMS_DIR, { recursive: true });

  const candidates = await loadRosterCandidates();
  const roster = [];
  let skipped = 0;

  for (const row of candidates) {
    if (roster.length >= teamLimit) break;

    const slug = String(row.linkToCodebases).trim();
    const [owner, repo] = slug.split('/');
    if (!owner || !repo) {
      console.warn(`Skip invalid slug: ${slug}`);
      skipped++;
      continue;
    }

    console.log(`Fetching ${row.teamNumber} ${row.teamName} (${slug})…`);

    const { robot, container } = await resolveEntryFiles(owner, repo);
    const chosen = pickLonger(robot, container);

    if (!chosen || lineCount(chosen.text) < MIN_LINES) {
      console.warn(`  Skip — no entry file or < ${MIN_LINES} lines`);
      skipped++;
      continue;
    }

    const license = await fetchRepoLicense(owner, repo);
    let defaultBranch = 'main';
    try {
      const repoMeta = ghApiJson(`repos/${owner}/${repo}`);
      defaultBranch = repoMeta?.default_branch ?? 'main';
    } catch {
      /* keep main */
    }
    const lines = lineCount(chosen.text);
    const meta = {
      teamNumber: row.teamNumber,
      teamName: row.teamName,
      normEpa: row.normEpa ?? null,
      linkToCodebases: slug,
      chosenFile: chosen.path,
      robotFile: robot?.path ?? null,
      robotLineCount: robot ? lineCount(robot.text) : 0,
      containerFile: container?.path ?? null,
      containerLineCount: container ? lineCount(container.text) : 0,
      lineCount: lines,
      sha: chosen.sha,
      license,
      sourceUrl: `https://github.com/${slug}/blob/${defaultBranch}/${chosen.path}`,
      fetchedAt: new Date().toISOString(),
    };

    const teamPath = join(TEAMS_DIR, `${row.teamNumber}.java`);
    const metaPath = join(TEAMS_DIR, `${row.teamNumber}.meta.json`);
    await writeFile(teamPath, chosen.text, 'utf8');
    await writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');

    roster.push({
      teamNumber: row.teamNumber,
      teamName: row.teamName,
      normEpa: row.normEpa ?? null,
      linkToCodebases: slug,
      chosenFile: chosen.path,
      lineCount: lines,
      license,
    });

    console.log(`  OK ${chosen.path} (${lines} lines)`);
    delaySync(400);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    teamLimit,
    sourceIndex: 'public/data/frc-2026-public-repositories.json',
    skippedWhileFilling: skipped,
    teams: roster,
  };

  await writeFile(ROSTER_OUT, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`\nWrote ${roster.length} teams → ${ROSTER_OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
