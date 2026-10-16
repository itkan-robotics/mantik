/**
 * Discover public FRC 2026 robot code repos (GitHub code search + Chief Delphi)
 * and emit CSV/JSON for /frc/2026-public-repositories.
 *
 * Methodology inspired by:
 * https://www.chiefdelphi.com/t/i-actually-scraped-github-to-get-3310-public-2025-code-repos/505706
 *
 * Usage:
 *   node scripts/fetch-frc-2026-public-repos.mjs
 *   node scripts/fetch-frc-2026-public-repos.mjs --skip-team-scan
 *   node scripts/fetch-frc-2026-public-repos.mjs --max-team 12000
 *   node scripts/fetch-frc-2026-public-repos.mjs --statbotics-only
 *   node scripts/fetch-frc-2026-public-repos.mjs --curate-only
 *   node scripts/fetch-frc-2026-public-repos.mjs --curate-only --no-rediscover
 *   node scripts/fetch-frc-2026-public-repos.mjs --manual-patch
 */

import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'data');
const OUT_CSV = join(OUT_DIR, 'frc-2026-public-repositories.csv');
const OUT_JSON = join(OUT_DIR, 'frc-2026-public-repositories.json');
const PROJECT_YEAR = '2026';

/** Official api.statbotics.io has been flaky; mirror documented at statbotics.popcornpenguins.com/docs/rest */
const STATBOTICS_API_BASES = [
  'https://api-statbotics.popcornpenguins.com/v3',
  'https://api.statbotics.io/v3',
  'https://api.statbotics.io/v2',
];

const EXCLUDED_REPO_PREFIXES = [
  'REVrobotics/',
  'PhotonVision/',
  'CrossTheRoadElec/',
  'wpilibsuite/',
  'WPILib/',
  'FRC-Team-Development/',
  'robotpy/',
  'PathPlanner/',
  'Mechanical-Advantage/AdvantageKit',
  'OpenFTC/',
];

const CD_SEARCH_QUERIES = [
  '2026 code release github',
  '2026 robot code release github',
  '2026 code release url:github.com',
  'rebuilt code release github',
  '2026 public robot code github',
];

/** Teams to omit from the index (e.g. wpilib teamNumber jokes with no real public main code). */
const EXCLUDED_TEAM_NUMBERS = new Set([254]);

/** Public releases the scraper can miss — GitHub slug only (no /tree/ paths). */
const MANUAL_TEAM_REPOS = [
  {
    teamNumber: 9128,
    teamName: 'ITKAN Robotics',
    linkToCodebases: 'itkan-robotics/RobotCode2026Public',
    language: 'java',
    normEpa: 1849,
  },
];

const args = process.argv.slice(2);
const statboticsOnly = args.includes('--statbotics-only');
const curateOnly = args.includes('--curate-only');
const curateNoRediscover = args.includes('--no-rediscover');
const manualPatch = args.includes('--manual-patch');
const skipTeamScan = args.includes('--skip-team-scan');
const maxTeamArg = args.find((a) => a.startsWith('--max-team='));
const maxTeam = maxTeamArg ? Number(maxTeamArg.split('=')[1]) : 11_000;
const minTeamArg = args.find((a) => a.startsWith('--min-team='));
const minTeam = minTeamArg ? Number(minTeamArg.split('=')[1]) : 1;

/** @typedef {{ repo: string, teamNumber: number | null, language: string | null, source: string }} RepoHit */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

function isExcludedRepo(fullName) {
  return EXCLUDED_REPO_PREFIXES.some((p) => fullName.startsWith(p));
}

function parseWpilibPrefs(text) {
  try {
    const j = JSON.parse(text);
    const year = String(j.projectYear ?? '');
    if (year !== PROJECT_YEAR) return null;
    const team = Number(j.teamNumber);
    if (!Number.isFinite(team) || team < 1 || team > 120_000) return null;
    const lang = j.currentLanguage ? String(j.currentLanguage).toLowerCase() : null;
    return { teamNumber: team, language: lang };
  } catch {
    return null;
  }
}

async function fetchPrefsFromUrl(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    return parseWpilibPrefs(await res.text());
  } catch {
    return null;
  }
}

async function fetchRawPrefs(owner, repo, branch = 'main') {
  const paths = ['.wpilib/wpilib_preferences.json', 'wpilib_preferences.json'];
  const refs = [branch, 'main', 'master'].filter(Boolean);
  const uniqueRefs = [...new Set(refs)];
  for (const p of paths) {
    for (const ref of uniqueRefs) {
      const parsed = await fetchPrefsFromUrl(
        `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${p}`,
      );
      if (parsed) return parsed;
    }
  }
  return null;
}

/** @param {any} item GitHub code search item */
async function prefsFromSearchItem(item) {
  const owner = item.repository?.owner?.login ?? item.repository?.full_name?.split('/')[0];
  const repo = item.repository?.name ?? item.repository?.full_name?.split('/')[1];
  if (!owner || !repo || !item.sha || !item.path) return null;
  const bySha = await fetchPrefsFromUrl(
    `https://raw.githubusercontent.com/${owner}/${repo}/${item.sha}/${item.path}`,
  );
  if (bySha) return bySha;
  const branch = item.repository?.default_branch ?? 'main';
  return fetchRawPrefs(owner, repo, branch);
}

function ingestPrefs(fullName, prefs, source) {
  if (!prefs) return;
  addRepo(fullName, {
    repo: fullName,
    teamNumber: prefs.teamNumber,
    language: prefs.language,
    source,
  });
}

/** @type {Map<string, RepoHit>} */
const reposByFullName = new Map();

function addRepo(fullName, hit) {
  if (isExcludedRepo(fullName)) return;
  const existing = reposByFullName.get(fullName);
  if (!existing) {
    reposByFullName.set(fullName, hit);
    return;
  }
  if (!existing.teamNumber && hit.teamNumber) existing.teamNumber = hit.teamNumber;
  if (!existing.language && hit.language) existing.language = hit.language;
  existing.source = `${existing.source},${hit.source}`;
}

async function enrichRepoFromGithub(fullName, source) {
  const [owner, repo] = fullName.split('/');
  if (!owner || !repo) return;
  const prefs = await fetchRawPrefs(owner, repo, 'main');
  ingestPrefs(fullName, prefs, source);
}

async function githubCodeSearchItems(query) {
  const items = [];
  const seen = new Set();
  for (let page = 1; page <= 10; page++) {
    const q = encodeURIComponent(query);
    let data;
    try {
      data = ghApiJson(`search/code?q=${q}&per_page=100&page=${page}`);
    } catch (err) {
      console.warn(`Search failed page ${page}:`, err.message ?? err);
      break;
    }
    if (!data.items?.length) break;
    for (const item of data.items) {
      const key = `${item.repository.full_name}@${item.sha}:${item.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
    if (data.items.length < 100) break;
    await sleep(2200);
  }
  return items;
}

async function scanBroadGithub() {
  console.log('GitHub: broad wpilib_preferences search…');
  const queries = [
    `"projectYear": "${PROJECT_YEAR}" filename:wpilib_preferences.json path:.wpilib`,
    `"projectYear": "${PROJECT_YEAR}" filename:wpilib_preferences.json`,
  ];
  const items = [];
  const seenRepo = new Set();
  for (const query of queries) {
    const batch = await githubCodeSearchItems(query);
    for (const item of batch) {
      if (seenRepo.has(item.repository.full_name)) continue;
      seenRepo.add(item.repository.full_name);
      items.push(item);
    }
  }
  console.log(`  ${items.length} unique repos from broad search`);
  let i = 0;
  for (const item of items) {
    i++;
    if (i % 50 === 0) console.log(`  parse ${i}/${items.length}`);
    const prefs = await prefsFromSearchItem(item);
    ingestPrefs(item.repository.full_name, prefs, 'github-broad');
    await sleep(80);
  }
}

async function scanPerTeamNumbers() {
  if (skipTeamScan) return;
  console.log(`GitHub: per-team search ${minTeam}–${maxTeam}…`);
  for (let team = minTeam; team <= maxTeam; team++) {
    if (team % 100 === 0) console.log(`  team ${team}/${maxTeam} (repos so far: ${reposByFullName.size})`);
    const q = `"teamNumber": ${team} "projectYear": "${PROJECT_YEAR}" filename:wpilib_preferences.json`;
    let data;
    try {
      data = ghApiJson(`search/code?q=${encodeURIComponent(q)}&per_page=100`);
    } catch {
      await sleep(5000);
      continue;
    }
    for (const item of data.items ?? []) {
      const prefs = await prefsFromSearchItem(item);
      ingestPrefs(item.repository.full_name, prefs, 'github-team');
      await sleep(80);
    }
    await sleep(2200);
  }
}

function extractGithubFromText(text) {
  const urls = new Set();
  const re = /https?:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    let path = m[1].replace(/\.git$/, '');
    path = path.split('/')[0] + '/' + path.split('/')[1];
    urls.add(path);
  }
  return [...urls];
}

async function scanChiefDelphi() {
  console.log('Chief Delphi: search.json…');
  for (const term of CD_SEARCH_QUERIES) {
    for (let page = 1; page <= 5; page++) {
      const url = `https://www.chiefdelphi.com/search.json?q=${encodeURIComponent(term)}&page=${page}`;
      let res;
      try {
        res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      } catch (err) {
        console.warn('CD fetch failed:', err.message ?? err);
        break;
      }
      if (!res.ok) break;
      const data = await res.json();
      const blobs = [
        ...(data.posts ?? []).map((p) => p.blurb ?? ''),
        ...(data.topics ?? []).map((t) => `${t.title ?? ''} ${t.excerpt ?? ''}`),
      ];
      const repoPaths = new Set();
      for (const b of blobs) {
        for (const p of extractGithubFromText(b)) repoPaths.add(p);
      }
      for (const fullName of repoPaths) {
        if (!/2026|rebuilt|robot-code|frc-\d|\/\d{4}/i.test(fullName)) continue;
        await enrichRepoFromGithub(fullName, 'chiefdelphi');
        await sleep(120);
      }
      if (!data.grouped_search_result?.more_full_page_results) break;
      await sleep(800);
    }
    await sleep(500);
  }
}

/** @type {Map<number, { name: string, normEpa: number | null }>} */
const teamMeta = new Map();

/** @type {Map<string, { description: string, ownerLogin: string }>} */
const repoDetailsCache = new Map();

/** Orgs that commonly appear in wpilib teamNumber jokes — map fragment → real FRC team. */
const ORG_HINT_TEAM = [
  ['stuypulse', 694],
  ['stuy-pulse', 694],
];

async function fetchRepoDetails(fullName) {
  if (repoDetailsCache.has(fullName)) return repoDetailsCache.get(fullName);
  const [owner, repo] = fullName.split('/');
  const fallback = { description: '', ownerLogin: owner ?? '' };
  if (!owner || !repo) {
    repoDetailsCache.set(fullName, fallback);
    return fallback;
  }
  try {
    const data = ghApiJson(`repos/${owner}/${repo}`);
    const details = {
      description: String(data.description ?? ''),
      ownerLogin: String(data.owner?.login ?? owner),
    };
    repoDetailsCache.set(fullName, details);
    await sleep(40);
    return details;
  } catch {
    repoDetailsCache.set(fullName, fallback);
    return fallback;
  }
}

function isLikelySeasonYear(n) {
  return n >= 1992 && n <= 2035;
}

function extractTeamNumbersFromText(text, { allowSeasonYears = false } = {}) {
  if (!text) return [];
  const nums = new Set();
  const s = String(text).toLowerCase();
  for (const m of s.matchAll(/\bfrc[_-]?(\d{1,5})\b/g)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 120_000 && (allowSeasonYears || !isLikelySeasonYear(n))) nums.add(n);
  }
  for (const m of s.matchAll(/\bteam[_-]?(\d{1,5})\b/g)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 120_000 && (allowSeasonYears || !isLikelySeasonYear(n))) nums.add(n);
  }
  for (const m of s.matchAll(/\b(?:frc\s+)?team\s*#?(\d{1,5})\b/g)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 120_000 && (allowSeasonYears || !isLikelySeasonYear(n))) nums.add(n);
  }
  for (const m of s.matchAll(/(?:^|\/)(?:frc)?(\d{3,5})(?:[_\-.]|$)/g)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 120_000 && (allowSeasonYears || !isLikelySeasonYear(n))) nums.add(n);
  }
  return [...nums];
}

function teamNameTokens(teamName) {
  const stop = new Set(['team', 'the', 'frc', 'robotics', 'high', 'school', 'club', 'and', 'from']);
  return String(teamName ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w));
}

function isNonPrimaryRobotRepo(fullName, description) {
  const h = `${fullName} ${description}`.toLowerCase();
  return /\bminibot\b|mini-bot|mini bot|practice robot|kitbot code/i.test(h);
}

/** True when this repo should not be listed as teamNumber's primary 2026 robot code. */
function repoConflictsWithTeam(fullName, teamNumber, teamName, description) {
  const org = (fullName.split('/')[0] ?? '').toLowerCase();
  const base = repoSlugBasename(fullName).toLowerCase();
  const t = teamNumber;

  const descTeams = extractTeamNumbersFromText(description);
  if (descTeams.length > 0 && !descTeams.includes(t)) return true;

  const frcOrg = org.match(/^frc[_-]?(\d{1,5})$/i);
  if (frcOrg && Number(frcOrg[1]) !== t) return true;

  const teamOrg = org.match(/^team[_-]?(\d{1,5})$/i);
  if (teamOrg && Number(teamOrg[1]) !== t) return true;

  const slugTeams = extractTeamNumbersFromText(`${org}/${base}`);
  if (slugTeams.length > 0 && !slugTeams.includes(t)) return true;

  for (const [frag, realTeam] of ORG_HINT_TEAM) {
    if (org.includes(frag) && realTeam !== t) return true;
  }

  const tokens = teamNameTokens(teamName);
  if (tokens.length >= 2) {
    const orgNorm = org.replace(/-/g, '');
    const brandMatch = tokens.filter((tok) => orgNorm.includes(tok.replace(/-/g, '')));
    if (brandMatch.length >= 2) return false;
  }

  if (tokens.length === 1 && tokens[0].length > 6 && org.includes(tokens[0])) return false;

  return false;
}

function repoEligibleForTeam(fullName, teamNumber, teamName, description) {
  if (repoConflictsWithTeam(fullName, teamNumber, teamName, description)) return false;
  if (isNonPrimaryRobotRepo(fullName, description)) return false;
  return true;
}

function statboticsRowToMeta(row, teamFallback) {
  if (!row) return null;
  const name = row.nickname ?? row.team_name ?? row.name ?? null;
  const normEpa =
    row.norm_epa?.mean ??
    row.norm_epa?.current ??
    row.norm_epa ??
    row.norm_epa_mean ??
    row.epa?.norm ??
    row.total_norm_epa ??
    null;
  if (!name && normEpa == null) return null;
  return {
    name: name ? String(name) : `Team ${teamFallback}`,
    normEpa: normEpa != null ? Number(normEpa) : null,
  };
}

async function fetchStatboticsTeamYear(team) {
  for (const base of STATBOTICS_API_BASES) {
    const urls = [
      `${base}/team_year/${team}/${PROJECT_YEAR}`,
      `${base}/team_years?team=${team}&year=${PROJECT_YEAR}`,
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
        if (!res.ok) continue;
        const data = await res.json();
        const row = Array.isArray(data) ? data[0] : data;
        const meta = statboticsRowToMeta(row, team);
        if (meta) return meta;
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

async function bulkFetchStatbotics2026() {
  for (const base of STATBOTICS_API_BASES) {
    let offset = 0;
    let any = false;
    for (;;) {
      const url = `${base}/team_years?year=${PROJECT_YEAR}&limit=500&offset=${offset}`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
        if (!res.ok) break;
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) break;
        any = true;
        for (const row of data) {
          const team = Number(row.team);
          if (!Number.isFinite(team)) continue;
          const meta = statboticsRowToMeta(row, team);
          if (meta) teamMeta.set(team, meta);
        }
        if (data.length < 500) break;
        offset += 500;
        await sleep(200);
      } catch {
        break;
      }
    }
    if (any) {
      console.log(`Statbotics bulk: ${teamMeta.size} team-years cached`);
      return true;
    }
  }
  return false;
}

async function hydrateTeamMeta(teamNumbers) {
  const bulkOk = await bulkFetchStatbotics2026();
  if (bulkOk) return;
  console.warn(
    'Statbotics bulk API unavailable — norm EPA and nicknames omitted. Re-run fetch later or set STATBOTICS_FORCE_PER_TEAM=1.',
  );
  if (process.env.STATBOTICS_FORCE_PER_TEAM !== '1') return;
  console.log(`Statbotics per-team fallback: ${teamNumbers.length} teams…`);
  let i = 0;
  for (const team of teamNumbers) {
    if (teamMeta.has(team)) continue;
    i++;
    if (i % 50 === 0) console.log(`  statbotics ${i}/${teamNumbers.length}`);
    const meta = await fetchStatboticsTeamYear(team);
    if (meta) teamMeta.set(team, meta);
    await sleep(150);
  }
}

function repoSlugBasename(fullName) {
  return (fullName.split('/').pop() ?? fullName).toLowerCase();
}

/** @param {string} fullName owner/repo */
function isHardRejectedRepo(fullName) {
  const base = repoSlugBasename(fullName);
  const full = fullName.toLowerCase();
  if (/\b2025\b/.test(base)) return true;
  if (/\b2024\b/.test(base)) return true;
  if (/\b2023\b/.test(base)) return true;
  if (/\breefscape\b/.test(base)) return true;
  if (/\bcrescendo\b/.test(base)) return true;
  if (/\bcharged.?up\b/.test(base)) return true;
  if (/\bdeep.?space\b/.test(base)) return true;
  const junkPaths = [
    'visionsamples',
    'advancedcommandbasedexamples',
    'talonfxtest',
    'test_base',
    'b-line-testing',
    'musical-enigma',
    'kraken-music',
    'turret_test',
    'swerve-key',
    'flywheel-prototype',
    'dmistry26/test',
    'mashed26/turret_test',
    'another-person1/talonfxtest',
    'seanl1234/test_base',
    'etvrocks/b-line-testing',
    'aieda1l/flywheel-prototype',
    's-zhdanova/swerve-key',
    'james20902/musical-enigma',
    'vrishabbm/kraken-music',
  ];
  if (junkPaths.some((p) => full === p || full.endsWith(`/${p.split('/')[1]}`))) return true;
  if (/\/test$/i.test(full) || /\/test-/i.test(full)) return true;
  return false;
}

/** Higher = more likely primary 2026 competition robot code. */
function scoreRepoForMain2026(fullName, teamNumber) {
  if (isHardRejectedRepo(fullName)) return -10_000;
  const base = repoSlugBasename(fullName);
  const org = (fullName.split('/')[0] ?? '').toLowerCase();
  let score = 0;

  if (/\b2026\b/.test(base)) score += 55;
  if (/\brebuilt\b|\brebuild\b/i.test(base)) score += 18;
  if (/robot|mainbot|robotcode|robot-code|robot_software|robotsoftware/i.test(base)) score += 28;
  if (/competition|competitionrobot|comp-robot/i.test(base)) score += 24;
  if (/-comp\b|_comp\b|2026-comp/i.test(base)) score += 20;
  if (/c2026|frc-2026|frc2026|robot2026|2026-robot|2026_robot/i.test(base)) score += 22;
  if (/\bpublic\b/i.test(base)) score += 8;
  if (String(teamNumber) && base.includes(String(teamNumber))) score += 14;
  if (org.includes(String(teamNumber))) score += 6;

  const penalties = [
    [/library/i, 40],
    [/framework/i, 38],
    [/template/i, 32],
    [/training/i, 30],
    [/trainer/i, 30],
    [/bootcamp/i, 30],
    [/[-_]class\b/i, 28],
    [/example/i, 32],
    [/sample/i, 28],
    [/scouting/i, 45],
    [/dashboard/i, 45],
    [/prototype/i, 26],
    [/practice/i, 24],
    [/akit_practice/i, 35],
    [/kitbot/i, 28],
    [/starterbot|starter-bot/i, 26],
    [/minibot|mini-bot|minibots/i, 32],
    [/offseason/i, 20],
    [/mainbot-base\b/i, 22],
    [/cookies\b/i, 18],
    [/gibbon\b/i, 22],
    [/frankenstein\b/i, 12],
    [/noodle/i, 15],
    [/good_will_bunting/i, 10],
    [/chasis_who_watches/i, 8],
    [/pulsecrew-prep/i, 25],
    [/hooded-shooter/i, 28],
    [/phil\b/i, 20],
    [/tribecbot/i, 25],
    [/prototypes\b/i, 30],
    [/2027-training/i, 40],
    [/publiccodebank/i, 3],
  ];
  for (const [re, pen] of penalties) {
    if (re.test(base) || re.test(fullName.toLowerCase())) score -= pen;
  }

  if (
    /\b(bravo|charlie|b_bot|kitbot)\b/i.test(base) &&
    !/competition|mainbot|robot2026|c2026|2026-comp/i.test(base)
  ) {
    score -= 10;
  }

  return score;
}

function isLikelyRobotCodeRepo(fullName, teamNumber) {
  if (isHardRejectedRepo(fullName)) return false;
  const base = repoSlugBasename(fullName);
  const score = scoreRepoForMain2026(fullName, teamNumber);

  if (/publiccodebank/i.test(fullName.toLowerCase())) return true;

  if (score < 10) return false;

  if (!/\b2026\b/.test(base) && !/robot|mainbot|c2026|rebuilt|competition/i.test(base)) {
    if (/library|framework|template|training|sample|example|prototype|music|vision|test/i.test(base)) {
      return false;
    }
  }

  return true;
}

/** @param {string[]} slugs @param {number} teamNumber */
function pickBestRepo(slugs, teamNumber) {
  const candidates = [...new Set(slugs)].filter((s) => isLikelyRobotCodeRepo(s, teamNumber));
  if (candidates.length === 0) return null;
  let best = candidates[0];
  let bestScore = scoreRepoForMain2026(best, teamNumber);
  for (const slug of candidates.slice(1)) {
    const s = scoreRepoForMain2026(slug, teamNumber);
    if (s > bestScore) {
      best = slug;
      bestScore = s;
    }
  }
  return bestScore >= 10 ? best : null;
}

function parseLinkList(raw) {
  return String(raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function languageForRepo(fullName) {
  const [owner, repo] = fullName.split('/');
  if (!owner || !repo) return '';
  const prefs = await fetchRawPrefs(owner, repo, 'main');
  return prefs?.language ?? '';
}

function inferTeamFromRepoName(fullName) {
  const m = fullName.match(/\b(?:frc|team)?[_-]?(\d{1,5})\b/i);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 120_000) return n;
  }
  return null;
}

async function discoverReposForTeam(teamNumber) {
  const q = `"teamNumber": ${teamNumber} "projectYear": "${PROJECT_YEAR}" filename:wpilib_preferences.json`;
  let data;
  try {
    data = ghApiJson(`search/code?q=${encodeURIComponent(q)}&per_page=100`);
  } catch {
    return [];
  }
  const slugs = new Set();
  for (const item of data.items ?? []) {
    if (item.repository?.full_name) slugs.add(item.repository.full_name);
  }
  await sleep(300);
  return [...slugs];
}

async function filterSlugsForTeam(slugs, teamNumber, teamName) {
  const unique = [...new Set(slugs)];
  const out = [];
  for (const slug of unique) {
    if (repoConflictsWithTeam(slug, teamNumber, teamName, '')) continue;
    const { description } = await fetchRepoDetails(slug);
    if (repoEligibleForTeam(slug, teamNumber, teamName, description)) out.push(slug);
  }
  return out;
}

async function buildRows() {
  /** @type {Map<number, { teamNumber: number, repos: RepoHit[], languages: Set<string> }>} */
  const byTeam = new Map();
  /** @type {RepoHit[]} */
  const orphanRepos = [];

  for (const hit of reposByFullName.values()) {
    let team = hit.teamNumber;
    if (!team) team = inferTeamFromRepoName(hit.repo);
    if (!team) {
      orphanRepos.push(hit);
      continue;
    }
    let bucket = byTeam.get(team);
    if (!bucket) {
      bucket = { teamNumber: team, repos: [], languages: new Set() };
      byTeam.set(team, bucket);
    }
    bucket.repos.push(hit);
    if (hit.language) bucket.languages.add(hit.language);
  }

  const rows = [];
  for (const bucket of byTeam.values()) {
    if (EXCLUDED_TEAM_NUMBERS.has(bucket.teamNumber)) continue;
    const teamName = teamMeta.get(bucket.teamNumber)?.name ?? `Team ${bucket.teamNumber}`;
    const slugs = [...new Set(bucket.repos.map((r) => r.repo))];
    const eligible = await filterSlugsForTeam(slugs, bucket.teamNumber, teamName);
    const best = pickBestRepo(eligible, bucket.teamNumber);
    if (!best) continue;
    const bestHit = bucket.repos.find((r) => r.repo === best);
    const meta = teamMeta.get(bucket.teamNumber);
    rows.push({
      teamName: meta?.name ?? `Team ${bucket.teamNumber}`,
      teamNumber: bucket.teamNumber,
      normEpa: meta?.normEpa ?? null,
      language: bestHit?.language ?? '',
      linkToCodebases: best,
    });
  }

  const merged = applyManualTeamRows(rows);
  sortRows(merged);

  return { rows: merged, orphanRepos };
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows) {
  const header = ['Team Name', 'Team Number', 'Norm EPA', 'Language', 'Link to codebase'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.teamName),
        csvEscape(r.teamNumber),
        csvEscape(r.normEpa ?? ''),
        csvEscape(r.language),
        csvEscape(r.linkToCodebases),
      ].join(','),
    );
  }
  return lines.join('\n') + '\n';
}

function dropExcludedTeams(rows) {
  return rows.filter((r) => !EXCLUDED_TEAM_NUMBERS.has(r.teamNumber));
}

function applyManualTeamRows(rows) {
  const byTeam = new Map(dropExcludedTeams(rows).map((r) => [r.teamNumber, { ...r }]));
  for (const manual of MANUAL_TEAM_REPOS) {
    if (EXCLUDED_TEAM_NUMBERS.has(manual.teamNumber)) continue;
    const existing = byTeam.get(manual.teamNumber);
    if (existing) {
      Object.assign(existing, manual);
    } else {
      byTeam.set(manual.teamNumber, { ...manual });
    }
  }
  return [...byTeam.values()];
}

function sortRows(rows) {
  rows.sort((a, b) => {
    const hasA = a.normEpa != null;
    const hasB = b.normEpa != null;
    if (hasA && hasB && b.normEpa !== a.normEpa) return b.normEpa - a.normEpa;
    if (hasA && !hasB) return -1;
    if (!hasA && hasB) return 1;
    return a.teamNumber - b.teamNumber;
  });
}

async function curateExistingDataset() {
  const raw = await readFile(OUT_JSON, 'utf8');
  const payload = JSON.parse(raw);
  const priorRows = payload.rows ?? [];
  const curated = [];
  let dropped = 0;
  let rediscovered = 0;

  const teams = [...new Set(priorRows.map((r) => r.teamNumber))].sort((a, b) => a - b);
  teamMeta.clear();
  await hydrateTeamMeta(teams);

  let i = 0;
  for (const row of priorRows) {
    if (EXCLUDED_TEAM_NUMBERS.has(row.teamNumber)) continue;
    i++;
    if (i % 25 === 0) console.log(`  curate ${i}/${priorRows.length}`);
    const teamName = teamMeta.get(row.teamNumber)?.name ?? row.teamName ?? `Team ${row.teamNumber}`;
    let slugs = parseLinkList(row.linkToCodebases);
    let eligible = await filterSlugsForTeam(slugs, row.teamNumber, teamName);
    if (eligible.length === 0 && !curateNoRediscover) {
      const discovered = await discoverReposForTeam(row.teamNumber);
      if (discovered.length > 0) {
        eligible = await filterSlugsForTeam(discovered, row.teamNumber, teamName);
        if (eligible.length > 0) rediscovered++;
      }
    }
    const best = pickBestRepo(eligible, row.teamNumber);
    if (!best) {
      dropped++;
      continue;
    }
    const language = (await languageForRepo(best)) || row.language || '';
    curated.push({
      teamName,
      teamNumber: row.teamNumber,
      normEpa: row.normEpa ?? null,
      language,
      linkToCodebases: best,
    });
  }

  const merged = applyManualTeamRows(curated);
  sortRows(merged);
  payload.generatedAt = new Date().toISOString();
  payload.rowCount = merged.length;
  payload.repoCount = merged.length;
  payload.teamsDroppedByCuration = dropped;
  payload.teamsRediscoveredByIdentityPass = rediscovered;
  payload.methodology =
    'GitHub wpilib_preferences projectYear 2026 discovery; one primary 2026 robot repo per team (name heuristics, org/description team identity, non-primary bots excluded); EPA/names from Statbotics mirror.';
  payload.rows = merged;
  await writeFile(OUT_JSON, JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(OUT_CSV, toCsv(merged), 'utf8');
  console.log(`Curated ${merged.length} teams (dropped ${dropped} with no qualifying repo) →`);
  console.log(`  ${OUT_CSV}`);
}

async function refreshStatboticsOnExistingDataset() {
  const raw = await readFile(OUT_JSON, 'utf8');
  const payload = JSON.parse(raw);
  const rows = payload.rows ?? [];
  const teams = [...new Set(rows.map((r) => r.teamNumber))].sort((a, b) => a - b);
  teamMeta.clear();
  await hydrateTeamMeta(teams);
  for (const row of rows) {
    const meta = teamMeta.get(row.teamNumber);
    if (meta) {
      row.teamName = meta.name;
      row.normEpa = meta.normEpa;
    }
    delete row.includesMainRobotCode;
  }
  const merged = applyManualTeamRows(rows);
  sortRows(merged);
  payload.generatedAt = new Date().toISOString();
  payload.rowCount = merged.length;
  payload.statboticsApi = STATBOTICS_API_BASES[0];
  payload.methodology =
    'GitHub code search for wpilib_preferences projectYear 2026, per-team supplemental search, Chief Delphi search.json github links; EPA/names from Statbotics (api-statbotics.popcornpenguins.com mirror when official API is down).';
  payload.rows = merged;
  await writeFile(OUT_JSON, JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(OUT_CSV, toCsv(merged), 'utf8');
  console.log(`Refreshed Statbotics for ${merged.length} teams (${teamMeta.size} meta hits) →`);
  console.log(`  ${OUT_CSV}`);
}

async function patchManualRowsOnly() {
  const raw = await readFile(OUT_JSON, 'utf8');
  const payload = JSON.parse(raw);
  const merged = applyManualTeamRows(payload.rows ?? []);
  sortRows(merged);
  payload.generatedAt = new Date().toISOString();
  payload.rowCount = merged.length;
  payload.repoCount = merged.length;
  payload.rows = merged;
  await writeFile(OUT_JSON, JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(OUT_CSV, toCsv(merged), 'utf8');
  console.log(`Manual patch: ${merged.length} teams → ${OUT_CSV}`);
}

async function main() {
  if (manualPatch) {
    await patchManualRowsOnly();
    return;
  }
  if (curateOnly) {
    await curateExistingDataset();
    return;
  }
  if (statboticsOnly) {
    await refreshStatboticsOnExistingDataset();
    return;
  }

  await scanBroadGithub();
  await scanChiefDelphi();
  await scanPerTeamNumbers();

  const teams = [
    ...new Set(
      [...reposByFullName.values()]
        .map((r) => r.teamNumber ?? inferTeamFromRepoName(r.repo))
        .filter((t) => t != null),
    ),
  ].sort((a, b) => a - b);

  await hydrateTeamMeta(teams);

  const { rows, orphanRepos } = await buildRows();
  sortRows(rows);
  const generatedAt = new Date().toISOString();

  await mkdir(OUT_DIR, { recursive: true });
  const payload = {
    generatedAt,
    statboticsApi: STATBOTICS_API_BASES[0],
    methodology:
      'GitHub code search for wpilib_preferences projectYear 2026, per-team supplemental search, Chief Delphi search.json github links; EPA/names from Statbotics (api-statbotics.popcornpenguins.com mirror when official API is down).',
    referenceSpreadsheet:
      'https://docs.google.com/spreadsheets/d/1ZOaepojGhez6A-37ZMln_O9KbCgQb--DadE6ziMTAzM/edit?gid=408396042',
    chiefDelphiThread:
      'https://www.chiefdelphi.com/t/i-actually-scraped-github-to-get-3310-public-2025-code-repos/505706',
    rowCount: rows.length,
    repoCount: reposByFullName.size,
    orphanRepoCount: orphanRepos.length,
    rows,
    orphanRepos: orphanRepos.map((r) => r.repo),
  };

  await writeFile(OUT_JSON, JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(OUT_CSV, toCsv(rows), 'utf8');

  console.log(`Wrote ${rows.length} teams (${reposByFullName.size} repos) →`);
  console.log(`  ${OUT_CSV}`);
  console.log(`  ${OUT_JSON}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
