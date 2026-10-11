/**
 * Extract ```java fences from Java lesson MDX, wrap like the playground,
 * compile with javac at the browser runtime's source level (RUNTIME_SOURCE_LEVEL,
 * currently Java 17), and run when a main method exists.
 *
 * Usage: npx vite-node scripts/test-java-lesson-examples.ts
 *   JAVA_EXAMPLE_SECTION=java|comp|all (default all)
 *   JAVA_EXAMPLE_MARK_NORUN=1 — add norun to compile/runtime failures (content maintenance)
 *   Set JAVA_HOME if javac is not on PATH (falls back to macOS Homebrew when present)
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import {
  looksLikeRunnableJava,
  wrapExampleSource,
  suggestExampleStdin,
  exampleNeedsStdin,
  type PageContext,
} from '../src/lib/java-playground/exampleSource.ts';
import { RUNTIME_SOURCE_LEVEL } from '../src/lib/java-playground/constants.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CONTENT_ROOT = join(ROOT, 'src/content');
const CONTENT_DIRS: Array<{ section: string; dir: string }> = (() => {
  const mode = (process.env.JAVA_EXAMPLE_SECTION ?? 'all').toLowerCase();
  if (mode === 'java') return [{ section: 'java', dir: join(CONTENT_ROOT, 'java') }];
  if (mode === 'comp') return [{ section: 'comp', dir: join(CONTENT_ROOT, 'comp') }];
  return [
    { section: 'java', dir: join(CONTENT_ROOT, 'java') },
    { section: 'comp', dir: join(CONTENT_ROOT, 'comp') },
  ];
})();
function jdkTool(name: 'javac' | 'java'): string {
  const ext = process.platform === 'win32' ? '.exe' : '';
  const home = process.env.JAVA_HOME;
  if (home) {
    const candidate = join(home, 'bin', `${name}${ext}`);
    if (existsSync(candidate)) return candidate;
  }
  const macFallback = join('/opt/homebrew/opt/openjdk', 'bin', name);
  if (existsSync(macFallback)) return macFallback;
  return name;
}

const JAVAC = jdkTool('javac');
const JAVA = jdkTool('java');
const SKIP_DIRS = new Set(['version-control']);
/** '-17' is ECJ's spelling; javac wants a bare release number. */
const RELEASE = RUNTIME_SOURCE_LEVEL.replace(/^-/, '').replace(/^1\./, '');

export interface ExampleResult {
  file: string;
  index: number;
  line: number;
  preview: string;
  meta: string;
  skipped?: string;
  compileOk?: boolean;
  ran?: boolean;
  noMain?: boolean;
  runtimeOk?: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
}

function walkMdx(dir: string): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      out.push(...walkMdx(p));
    } else if (ent.name.endsWith('.mdx')) {
      out.push(p);
    }
  }
  return out;
}

function extractFences(source: string): Array<{ code: string; meta: string; line: number }> {
  const fences: Array<{ code: string; meta: string; line: number }> = [];
  const re = /```java([^\n]*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const before = source.slice(0, m.index);
    const line = before.split('\n').length;
    fences.push({
      meta: (m[1] ?? '').trim(),
      code: m[2] ?? '',
      line,
    });
  }
  return fences;
}

function preview(code: string): string {
  return code.trim().split('\n')[0]?.slice(0, 80) ?? '';
}

function compileAndRun(
  source: string,
  stdin: string,
  context?: PageContext,
): Omit<ExampleResult, 'file' | 'index' | 'line' | 'preview' | 'meta'> {
  const wrapped = wrapExampleSource(source, context);
  const work = join(tmpdir(), `jp-ex-${process.pid}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(work, { recursive: true });
  try {
    const javaFile = join(work, `${wrapped.entryClass}.java`);
    writeFileSync(javaFile, wrapped.source, 'utf8');
    const compile = spawnSync(
      JAVAC,
      ['--release', RELEASE, '-encoding', 'UTF-8', '-Xlint:-options', javaFile],
      {
      encoding: 'utf8',
      timeout: 15000,
    });
    if (compile.status !== 0) {
      return {
        compileOk: false,
        error: (compile.stderr || compile.stdout || 'javac failed').trim().slice(0, 2000),
      };
    }
    if (!wrapped.hasMain) {
      return { compileOk: true, noMain: true, ran: false };
    }
    const run = spawnSync(JAVA, ['-cp', work, wrapped.entryClass], {
      encoding: 'utf8',
      input: stdin,
      timeout: 4000,
      maxBuffer: 512 * 1024,
    });
    const timedOut = run.error && (run.error as NodeJS.ErrnoException).code === 'ETIMEDOUT';
    const stderr = (run.stderr || '').trim();
    const stdout = (run.stdout || '').trim();
    if (timedOut) {
      return {
        compileOk: true,
        ran: true,
        runtimeOk: false,
        stdout: stdout.slice(0, 500),
        stderr: stderr.slice(0, 500),
        error: 'Timed out (possible infinite loop or blocking stdin)',
      };
    }
    if (run.status !== 0 || stderr) {
      return {
        compileOk: true,
        ran: true,
        runtimeOk: false,
        stdout: stdout.slice(0, 800),
        stderr: stderr.slice(0, 1200),
        error: stderr || `exit ${run.status}`,
      };
    }
    return {
      compileOk: true,
      ran: true,
      runtimeOk: true,
      stdout: stdout.slice(0, 800),
    };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

export function testAll(): ExampleResult[] {
  const filter = process.env.JAVA_EXAMPLE_FILTER ?? '';
  const needles = filter
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const files: string[] = [];
  for (const { dir } of CONTENT_DIRS) {
    files.push(...walkMdx(dir));
  }
  const filtered = files.filter((file) => {
    if (needles.length === 0) return true;
    const rel = relative(CONTENT_ROOT, file);
    return needles.some((needle) => rel.includes(needle));
  });
  const results: ExampleResult[] = [];
  for (const file of filtered) {
    const rel = relative(CONTENT_ROOT, file);
    const text = readFileSync(file, 'utf8');
    const fences = extractFences(text);
    fences.forEach((fence, index) => {
      const base: ExampleResult = {
        file: rel,
        index,
        line: fence.line,
        preview: preview(fence.code),
        meta: fence.meta,
      };
      if (/\bnorun\b/i.test(fence.meta)) {
        results.push({ ...base, skipped: 'norun' });
        return;
      }
      if (!looksLikeRunnableJava(fence.code)) {
        results.push({ ...base, skipped: 'not-runnable' });
        return;
      }
      // "racy": the example demonstrates a data race and is *meant* to fail
      // unpredictably, so its outcome cannot be checked — it still gets a Run button.
      if (/\bracy\b/i.test(fence.meta)) {
        results.push({ ...base, skipped: 'racy' });
        return;
      }
      const stdin = exampleNeedsStdin(fence.code) ? suggestExampleStdin(fence.code) : '';
      // Mirrors rehype-runnable-java: norun fences keep their slot but add no context.
      const pageFences = fences.map((f) => (/\bnorun\b/i.test(f.meta) ? '' : f.code));
      const outcome = compileAndRun(fence.code, stdin, { fences: pageFences, index });
      results.push({ ...base, ...outcome });
    });
  }
  return results;
}

const results = testAll();
const tested = results.filter((r) => !r.skipped);
const compileFail = tested.filter((r) => r.compileOk === false);
const runtimeFail = tested.filter((r) => r.compileOk && r.ran && r.runtimeOk === false);
const compileOk = tested.filter((r) => r.compileOk);
const ranOk = tested.filter((r) => r.runtimeOk);
const noMain = tested.filter((r) => r.noMain);
const skipped = results.filter((r) => r.skipped);

const summary = {
  files: new Set(results.map((r) => r.file)).size,
  fences: results.length,
  skipped: skipped.length,
  tested: tested.length,
  compileOk: compileOk.length,
  compileFail: compileFail.length,
  noMain: noMain.length,
  ranOk: ranOk.length,
  runtimeFail: runtimeFail.length,
};

console.log(JSON.stringify(summary, null, 2));
console.log('\n=== COMPILE FAILURES ===');
for (const r of compileFail) {
  console.log(`\n${r.file}:${r.line} [${r.index}] ${r.preview}`);
  console.log(r.error);
}
console.log('\n=== RUNTIME FAILURES ===');
for (const r of runtimeFail) {
  console.log(`\n${r.file}:${r.line} [${r.index}] ${r.preview}`);
  console.log(r.error);
  if (r.stderr) console.log('stderr:', r.stderr.slice(0, 400));
}

const filterTag = (process.env.JAVA_EXAMPLE_FILTER ?? 'all').replace(/[^\w.-]+/g, '_');
const outPath =
  process.env.JAVA_EXAMPLE_RESULTS ?? join(tmpdir(), `java-example-results-${filterTag}.json`);
writeFileSync(outPath, JSON.stringify({ summary, results }, null, 2));
console.log(`\nWrote ${outPath}`);

if (process.env.JAVA_EXAMPLE_MARK_NORUN === '1') {
  const mark = [...compileFail, ...runtimeFail];
  const byFile = new Map<string, ExampleResult[]>();
  for (const r of mark) {
    const list = byFile.get(r.file) ?? [];
    list.push(r);
    byFile.set(r.file, list);
  }
  let patched = 0;
  for (const [rel, entries] of byFile) {
    const filePath = join(CONTENT_ROOT, rel.replace(/\\/g, '/'));
    const lines = readFileSync(filePath, 'utf8').split('\n');
    for (const r of entries) {
      const idx = r.line - 1;
      const line = lines[idx];
      if (!line?.startsWith('```java')) {
        console.warn(`skip mark norun (no fence): ${rel}:${r.line}`);
        continue;
      }
      if (/\bnorun\b/i.test(line)) continue;
      lines[idx] = line.replace(/^```java\b/, '```java norun');
      patched += 1;
    }
    writeFileSync(filePath, lines.join('\n'), 'utf8');
  }
  console.log(`Marked ${patched} fence(s) with norun across ${byFile.size} file(s)`);
}
