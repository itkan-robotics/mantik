/**
 * Java level the in-browser runner compiles and runs at.
 *
 * Students install **Java 25** locally and every JavaDoc link targets it. The
 * browser runs **Java 17**, the newest CheerpJ offers (8, 11 and 17), which covers
 * records, `var`, text blocks and arrow `switch`. Anything added after 17 — pattern
 * matching in `switch`, for instance — is out of reach. Assignments must work at
 * both levels; `npm run verify:assignments` compiles against each.
 *
 * ### Assembling a JDK the compiler can use
 *
 * From Java 9 on the class library is a jimage rather than `rt.jar`. ECJ decides a
 * directory is a JDK by reading `release` for a JAVA_VERSION, then opens the image
 * through `lib/jrt-fs.jar`. CheerpJ's Java 17 runtime ships `/lt/17/lib/modules`
 * and neither of the other two, and `/lt` is read-only — so JpJdkStage copies all
 * three into `STAGED_JDK` under the writable `/files` mount on first use. That
 * persists in IndexedDB, so it happens once per browser.
 *
 * Measured: the copy runs at ~175 MB/s and random reads cost ~0.03 ms, so the
 * filesystem is not why compiling is expensive — see JpServer for what is.
 */
export const RUNTIME_JAVA_VERSION = 17;
export const RUNTIME_SOURCE_LEVEL = '-17';
export const STAGED_JDK = '/files/jp-jdk17';
export const JRT_FS_FILENAME = 'jrt-fs.jar';
export const RELEASE_FILENAME = 'release';

/** Where JS leaves a request and JpServer leaves the answer. */
export const SERVER_REQUEST_PATH = '/str/jp-request.txt';
export const SERVER_RESPONSE_DIR = '/files/jp';
export const SERVER_CLASS_DIR = '/files/jp/classes';
export const SERVER_SOURCE_DIR = '/str';

/** How long to wait for the server's first answer, which includes its warm-up. */
export const SERVER_READY_TIMEOUT_MS = 180_000;

export const CHEERPJ_LOADER = 'https://cjrtnc.leaningtech.com/4.3/loader.js';
export const CHEERPJ_ORIGIN = 'https://cjrtnc.leaningtech.com';
export const ECJ_MAIN = 'org.eclipse.jdt.internal.compiler.batch.Main';
export const ECJ_FILENAME = 'ecj-3.46.100.jar';
export const LAUNCHER_CLASS = 'JpStdioLauncher';
export const WARMUP_CLASS = 'JpWarmup';

export const STDIN_PATH = '/str/jp-stdin.txt';
export const STDOUT_PATH = '/files/jp-stdout.txt';
export const STDERR_PATH = '/files/jp-stderr.txt';
export const EXIT_PATH = '/files/jp-exit.txt';
export const CLASS_DIR = '/files/jp-classes';

/** Kill an in-flight student run after this many ms in the Running/Checking phase. */
export const RUN_TIMEOUT_MS = 20_000;
/** Safety cap for CheerpJ init + first compile (downloads can be slow). */
export const INIT_TIMEOUT_MS = 180_000;

export function timeoutMessage(ms: number): string {
  return `Program stopped after ${Math.round(ms / 1000)} s`;
}

export class JavaRunCancelledError extends Error {
  constructor(message = 'Stopped.') {
    super(message);
    this.name = 'JavaRunCancelledError';
  }
}
