/// <reference lib="webworker" />

import {
  compileThenRun,
  compileThenRunCases,
  ensureRuntime,
  getRuntimeResourcesJson,
  takeTimings,
} from '../cheerpjRuntime';
import type { WorkerReply, WorkerRequest } from '../protocol';
import type { StatusFn } from '../types';

function reply(message: WorkerReply): void {
  self.postMessage(message);
}

function statusFn(id: number): StatusFn {
  return (message) => reply({ id, type: 'status', message });
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const data = event.data;
  if (!data || typeof data.id !== 'number' || !data.type) return;

  void (async () => {
    const onStatus = statusFn(data.id);
    try {
      if (data.type === 'init') {
        await ensureRuntime(onStatus);
        reply({ id: data.id, type: 'result', result: null, timings: takeTimings() });
        return;
      }
      if (data.type === 'compile-run') {
        const result = await compileThenRun({
          source: data.source,
          entryClass: data.entryClass,
          stdin: data.stdin,
          runMain: data.runMain,
          onStatus,
        });
        reply({ id: data.id, type: 'result', result, timings: takeTimings() });
        return;
      }
      if (data.type === 'compile-run-cases') {
        const result = await compileThenRunCases({
          source: data.source,
          entryClass: data.entryClass,
          stdins: data.stdins,
          onStatus,
        });
        reply({ id: data.id, type: 'result', result, timings: takeTimings() });
        return;
      }
      if (data.type === 'dump-resources') {
        await ensureRuntime(onStatus);
        reply({ id: data.id, type: 'result', result: getRuntimeResourcesJson() });
        return;
      }
      const unknownData = data as { id: number; type: string };
      reply({
        id: unknownData.id,
        type: 'error',
        message: `Unknown worker request: ${unknownData.type}`,
      });
    } catch (err) {
      reply({
        id: data.id,
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  })();
};
