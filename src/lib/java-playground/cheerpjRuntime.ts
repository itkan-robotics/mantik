import preloadResources from './cheerpjPreload.json';
import { ecjClasspath, launcherClasspath, playgroundAppPath } from './assets';
import {
  CHEERPJ_LOADER,
  JRT_FS_FILENAME,
  RELEASE_FILENAME,
  RUNTIME_JAVA_VERSION,
  RUNTIME_SOURCE_LEVEL,
  SERVER_CLASS_DIR,
  SERVER_READY_TIMEOUT_MS,
  SERVER_REQUEST_PATH,
  SERVER_RESPONSE_DIR,
  SERVER_SOURCE_DIR,
  STAGED_JDK,
} from './constants';
import type { JpTimings } from './timing';
import { nowMs } from './timing';
import type { RunResult, StatusFn } from './types';

/**
 * Browser Java, built around one long-lived compiler process.
 *
 * Loading ECJ and indexing the Java 17 module image costs about 30 seconds, and
 * CheerpJ keeps no statics between `cheerpjRunMain` calls — so invoking the
 * compiler per request paid that every single time. Instead `JpServer` is started
 * once and left running: it watches a request file under /str, which JS can rewrite
 * while Java runs, and answers in /files, which JS can read back. Steady-state
 * compiles land around 150 ms.
 */

interface CheerpJGlobals {
  cheerpjInit?: (options?: Record<string, unknown>) => Promise<void>;
  cheerpjRunMain?: (className: string, classPath: string, ...args: string[]) => Promise<number>;
  cheerpOSAddStringFile?: (path: string, content: string) => void;
  cheerpjAddStringFile?: (path: string, content: string) => void;
  cjFileBlob?: (path: string) => Promise<Blob> | Blob;
  cjGetRuntimeResources?: () => string;
}

let initPromise: Promise<void> | null = null;
let cheerpjReady = false;
let initStatus: StatusFn | undefined;
let requestCounter = 0;
/**
 * Response files live in IndexedDB and outlive the page, so every request this
 * session makes is tagged. Without it a reloaded page finds the previous session's
 * answer to request 1 waiting and reports its output as the new result.
 */
const SESSION = Math.random().toString(36).slice(2, 10);
let lastSource: string | null = null;
let lastEntryClass: string | null = null;
const lastTimings: JpTimings = {};

function globals(): CheerpJGlobals {
  return globalThis as unknown as CheerpJGlobals;
}

function canImportScripts(): boolean {
  return typeof (globalThis as unknown as { importScripts?: unknown }).importScripts === 'function';
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Cannot load the Java runtime outside a browser document.'));
      return;
    }
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load the Java runtime from the CheerpJ CDN.'));
    document.head.appendChild(script);
  });
}

async function loadCheerpjLoader(): Promise<void> {
  if (typeof globals().cheerpjInit === 'function') return;
  if (canImportScripts()) {
    (globalThis as unknown as { importScripts: (...urls: string[]) => void }).importScripts(
      CHEERPJ_LOADER,
    );
    return;
  }
  await loadScript(CHEERPJ_LOADER);
}

function addStringFile(path: string, content: string): void {
  const g = globals();
  if (typeof g.cheerpOSAddStringFile === 'function') {
    g.cheerpOSAddStringFile(path, content);
    return;
  }
  if (typeof g.cheerpjAddStringFile === 'function') {
    g.cheerpjAddStringFile(path, content);
    return;
  }
  throw new Error('CheerpJ filesystem is not available.');
}

async function readVfsText(path: string): Promise<string> {
  const g = globals();
  if (typeof g.cjFileBlob !== 'function') return '';
  try {
    const blob = await g.cjFileBlob(path);
    return await blob.text();
  } catch {
    return '';
  }
}

function preloadOption(): Record<string, number[]> | undefined {
  if (!preloadResources || typeof preloadResources !== 'object') return undefined;
  if (Object.keys(preloadResources as object).length === 0) return undefined;
  return preloadResources as Record<string, number[]>;
}

/**
 * Copy CheerpJ's own module image, plus the two files a compiler needs beside it,
 * into the writable mount. Idempotent, and persisted in IndexedDB.
 */
async function stageJdk(): Promise<void> {
  const g = globals();
  if (typeof g.cheerpjRunMain !== 'function') {
    throw new Error('CheerpJ loaded, but cheerpjRunMain is missing.');
  }
  const started = nowMs();
  initStatus?.('Preparing the Java compiler…');
  const log = await captureConsole(() =>
    g.cheerpjRunMain!(
      'JpJdkStage',
      launcherClasspath(),
      `/lt/${RUNTIME_JAVA_VERSION}/lib/modules`,
      `${STAGED_JDK}/lib/modules`,
      playgroundAppPath(JRT_FS_FILENAME),
      `${STAGED_JDK}/lib/${JRT_FS_FILENAME}`,
      playgroundAppPath(RELEASE_FILENAME),
      `${STAGED_JDK}/${RELEASE_FILENAME}`,
    ),
  );
  lastTimings.stage = nowMs() - started;

  // A half-staged JDK fails later with an unhelpful message from the compiler,
  // so confirm all three files landed while we still know what we were doing.
  const required = [
    `${STAGED_JDK}/lib/modules`,
    `${STAGED_JDK}/lib/${JRT_FS_FILENAME}`,
    `${STAGED_JDK}/${RELEASE_FILENAME}`,
  ];
  const missing: string[] = [];
  for (const path of required) {
    if (!(await vfsFileSize(path))) missing.push(path);
  }
  if (missing.length > 0) {
    throw new Error(
      `Could not assemble a Java ${RUNTIME_JAVA_VERSION} JDK in the browser. `
        + `Missing: ${missing.join(', ')}. ${log}`.trim(),
    );
  }
}

/** CheerpJ programs print through console.log; capture it for diagnostics. */
async function captureConsole(fn: () => Promise<unknown>): Promise<string> {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.map((a) => (typeof a === 'string' ? a : String(a))).join(' '));
    original.apply(console, args as []);
  };
  try {
    await fn();
  } finally {
    console.log = original;
  }
  return lines.filter((line) => !/cheerpj|cjrtnc|leaningtech/i.test(line)).join(' | ');
}

async function vfsFileSize(path: string): Promise<number> {
  const g = globals();
  if (typeof g.cjFileBlob !== 'function') return 0;
  try {
    const blob = await g.cjFileBlob(path);
    return blob ? blob.size : 0;
  } catch {
    return 0;
  }
}

/** Start JpServer. It never returns, so this promise is deliberately not awaited. */
function startServer(): void {
  const g = globals();
  if (typeof g.cheerpjRunMain !== 'function') {
    throw new Error('CheerpJ loaded, but cheerpjRunMain is missing.');
  }
  void g
    .cheerpjRunMain(
      'JpServer',
      `${launcherClasspath()}:${ecjClasspath()}`,
      STAGED_JDK,
      RUNTIME_SOURCE_LEVEL,
      SERVER_REQUEST_PATH,
      SERVER_RESPONSE_DIR,
      SESSION,
    )
    .catch(() => {
      // The server only returns if something went badly wrong; the next request
      // will time out and surface a clearer message than anything we could add.
    });
}

async function waitForFile(path: string, timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const body = await readVfsText(path);
    if (body.trim()) return body;
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  return null;
}

export async function ensureRuntime(onStatus?: StatusFn): Promise<void> {
  if (onStatus) initStatus = onStatus;
  if (!initPromise) {
    initPromise = (async () => {
      if (!cheerpjReady) {
        initStatus?.('Loading Java runtime…');
        const loaderStarted = nowMs();
        await loadCheerpjLoader();
        lastTimings.loader = nowMs() - loaderStarted;

        const g = globals();
        if (typeof g.cheerpjInit !== 'function') {
          throw new Error('CheerpJ loaded, but cheerpjInit is missing.');
        }
        const initStarted = nowMs();
        const preload = preloadOption();
        await g.cheerpjInit({
          version: RUNTIME_JAVA_VERSION,
          status: 'none',
          ...(preload ? { preloadResources: preload } : {}),
          preloadProgress: (done: number, total: number) => {
            if (total > 0) {
              initStatus?.(`Loading Java runtime… ${Math.round((done / total) * 100)}%`);
            }
          },
        });
        lastTimings.init = nowMs() - initStarted;
        cheerpjReady = true;
      }

      await stageJdk();

      const serverStarted = nowMs();
      initStatus?.('Warming up the compiler…');
      startServer();
      const ready = await waitForFile(
        `${SERVER_RESPONSE_DIR}/resp-${SESSION}-ready.txt`,
        SERVER_READY_TIMEOUT_MS,
      );
      lastTimings.server = nowMs() - serverStarted;
      if (!ready) {
        throw new Error('The Java compiler did not start. Reload the page to try again.');
      }
    })();
  }
  try {
    await initPromise;
  } catch (err) {
    initPromise = null;
    throw err;
  }
}

export function takeTimings(): JpTimings {
  return { ...lastTimings };
}

export function getRuntimeResourcesJson(): string | null {
  const fn = globals().cjGetRuntimeResources;
  if (typeof fn !== 'function') return null;
  try {
    return fn();
  } catch {
    return null;
  }
}

interface ServerResult {
  compiled: boolean;
  compileOutput: string;
  runs: number[];
  id: string;
}

/**
 * Compile once, then run the entry class against each stdin in turn.
 * `stdins` is empty when the caller only wants a compile.
 */
async function ask(options: {
  source: string;
  entryClass: string;
  stdins: string[];
  runMain: boolean;
  onStatus?: StatusFn;
}): Promise<ServerResult> {
  const id = `${SESSION}-${++requestCounter}`;
  const normalized = options.source.replace(/\r\n/g, '\n');
  const sourcePath = `${SERVER_SOURCE_DIR}/${options.entryClass}.java`;
  const outDir = `${SERVER_CLASS_DIR}/${id}`;

  addStringFile(sourcePath, normalized);
  const stdinPaths = options.stdins.map((stdin, index) => {
    if (!stdin) return '-';
    const path = `${SERVER_SOURCE_DIR}/jp-stdin-${id}-${index}.txt`;
    addStringFile(path, stdin.replace(/\r\n/g, '\n'));
    return path;
  });

  const lines = [id, options.entryClass, sourcePath, outDir, String(options.runMain), ...stdinPaths];
  const started = nowMs();
  options.onStatus?.(options.stdins.length > 1 ? 'Checking…' : 'Compiling…');
  addStringFile(SERVER_REQUEST_PATH, `${lines.join('\n')}\n`);

  const response = await waitForFile(`${SERVER_RESPONSE_DIR}/resp-${id}.txt`, SERVER_READY_TIMEOUT_MS);
  lastTimings.compile = nowMs() - started;
  if (!response) {
    throw new Error('The Java compiler stopped responding. Reload the page to try again.');
  }

  const responseLines = response.trim().split('\n');
  const compiled = responseLines[0]?.startsWith('COMPILE ok') ?? false;
  const runs = responseLines
    .filter((line) => line.startsWith('RUN '))
    .map((line) => Number(line.slice(4).trim()) || 0);

  let compileOutput = '';
  if (!compiled) {
    compileOutput = (await readVfsText(`${SERVER_RESPONSE_DIR}/${id}-compile.txt`)).trim();
  }
  lastSource = normalized;
  lastEntryClass = options.entryClass;
  return { compiled, compileOutput, runs, id };
}

function compileFailure(output: string): RunResult {
  return {
    ok: false,
    compileFailed: true,
    compileOutput: output || 'Compilation failed.',
    stdout: '',
    stderr: '',
    exitCode: 1,
  };
}

async function collect(id: string, index: number, exitCode: number): Promise<RunResult> {
  const stdout = await readVfsText(`${SERVER_RESPONSE_DIR}/${id}-${index}-out.txt`);
  const stderr = await readVfsText(`${SERVER_RESPONSE_DIR}/${id}-${index}-err.txt`);
  return {
    ok: exitCode === 0 && !stderr.trim(),
    compileFailed: false,
    compileOutput: '',
    stdout,
    stderr,
    exitCode,
  };
}

export async function compileThenRun(options: {
  source: string;
  entryClass: string;
  stdin: string;
  onStatus?: StatusFn;
  runMain: boolean;
}): Promise<RunResult> {
  await ensureRuntime(options.onStatus);
  const result = await ask({
    source: options.source,
    entryClass: options.entryClass,
    stdins: options.runMain ? [options.stdin] : [],
    runMain: options.runMain,
    onStatus: options.onStatus,
  });
  if (!result.compiled) return compileFailure(result.compileOutput);

  if (!options.runMain) {
    return {
      ok: true,
      compileFailed: false,
      compileOutput: '',
      stdout: '',
      stderr: '',
      exitCode: 0,
      noMain: true,
    };
  }

  options.onStatus?.('Running…');
  const runStarted = nowMs();
  const run = await collect(result.id, 0, result.runs[0] ?? 0);
  lastTimings.run = nowMs() - runStarted;
  return run;
}

export async function compileThenRunCases(options: {
  source: string;
  entryClass: string;
  stdins: string[];
  onStatus?: StatusFn;
}): Promise<RunResult[]> {
  await ensureRuntime(options.onStatus);
  const result = await ask({
    source: options.source,
    entryClass: options.entryClass,
    stdins: options.stdins,
    runMain: true,
    onStatus: options.onStatus,
  });
  if (!result.compiled) return options.stdins.map(() => compileFailure(result.compileOutput));

  const results: RunResult[] = [];
  for (let i = 0; i < options.stdins.length; i++) {
    results.push(await collect(result.id, i, result.runs[i] ?? 0));
  }
  return results;
}

/** Exported for the debug overlay; the server compiles from scratch each request. */
export function lastCompiled(): { source: string | null; entryClass: string | null } {
  return { source: lastSource, entryClass: lastEntryClass };
}
