import type { RunResult } from './types';
import type { JpTimings } from './timing';

export type WorkerRequestType = 'init' | 'compile-run' | 'compile-run-cases' | 'dump-resources';

export interface WorkerRequestBase {
  id: number;
  type: WorkerRequestType;
}

export interface InitRequest extends WorkerRequestBase {
  type: 'init';
}

export interface CompileRunRequest extends WorkerRequestBase {
  type: 'compile-run';
  source: string;
  entryClass: string;
  stdin: string;
  runMain: boolean;
}

export interface CompileRunCasesRequest extends WorkerRequestBase {
  type: 'compile-run-cases';
  source: string;
  entryClass: string;
  stdins: string[];
}

export interface DumpResourcesRequest extends WorkerRequestBase {
  type: 'dump-resources';
}

export type WorkerRequest =
  | InitRequest
  | CompileRunRequest
  | CompileRunCasesRequest
  | DumpResourcesRequest;

export type WorkerRequestPayload = WorkerRequest extends infer Request
  ? Request extends WorkerRequest
    ? Omit<Request, 'id'>
    : never
  : never;

export interface StatusReply {
  id: number;
  type: 'status';
  message: string;
}

export interface ResultReply {
  id: number;
  type: 'result';
  result: RunResult | RunResult[] | string | null;
  timings?: JpTimings;
}

export interface ErrorReply {
  id: number;
  type: 'error';
  message: string;
}

export type WorkerReply = StatusReply | ResultReply | ErrorReply;

export function isRunPhaseStatus(message: string): boolean {
  return /^(Running|Checking)\b/.test(message);
}
