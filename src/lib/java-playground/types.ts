export type JavaPlaygroundId = string;

export interface HiddenTest {
  name: string;
  stdin?: string;
  /** Exact expected output, compared after newline/trailing-space normalization. */
  stdout?: string;
  /**
   * Regex source matched against normalized output, for assignments whose output
   * is partly the student's own (a name, a team number). Takes precedence over
   * `stdout`. Pair it with `describe`, since there is no literal to show on failure.
   */
  pattern?: string;
  /** What the test is looking for, shown in place of expected text when it fails. */
  describe?: string;
}

export interface JavaPlaygroundExercise {
  id: JavaPlaygroundId;
  title: string;
  prompt: string;
  starter: string;
  showStdin: boolean;
  tests: HiddenTest[];
  /**
   * Public class the student is asked to write, compiled as `<entryClass>.java`.
   * Defaults to `Main`. Assignments that name a file — `HelloTeam.java` — set it
   * so the editor matches the prose instead of forcing a rename.
   */
  entryClass?: string;
}

export interface RunResult {
  ok: boolean;
  compileFailed: boolean;
  compileOutput: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  /** Example compiled but has no main method, so nothing ran. */
  noMain?: boolean;
}

export interface CheckCaseResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  compileFailed: boolean;
  stderr: string;
}

export interface CheckResult {
  passed: number;
  total: number;
  cases: CheckCaseResult[];
}

export type StatusFn = (message: string) => void;
