import { useCallback, useEffect, useState } from 'react';
import JavaEditorPane from '@/components/java-playground/JavaEditorPane';
import { getExercise } from '@/lib/java-playground/exercises';
import { preloadJavaRuntimeSoon } from '@/lib/java-playground/preloadJavaRuntime';
import type { CheckResult } from '@/lib/java-playground/types';

interface Props {
  id: string;
}

type Phase = 'idle' | 'working';

export default function JavaPlayground({ id }: Props) {
  const exercise = getExercise(id);

  const [code, setCode] = useState(exercise?.starter ?? '');
  const [stdin, setStdin] = useState('');
  const [status, setStatus] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [consoleText, setConsoleText] = useState('');
  const [consoleKind, setConsoleKind] = useState<'empty' | 'out' | 'error'>('empty');
  const [check, setCheck] = useState<CheckResult | null>(null);

  useEffect(() => {
    preloadJavaRuntimeSoon();
  }, []);

  const busy = phase === 'working';

  const handleStop = useCallback(async () => {
    const { cancel } = await import('@/lib/java-playground/cheerpjRunner');
    cancel('Stopped.');
  }, []);

  const handleRun = useCallback(async () => {
    if (!exercise || busy) return;
    setPhase('working');
    setCheck(null);
    setStatus('Starting…');
    try {
      const { compileAndRun } = await import('@/lib/java-playground/cheerpjRunner');
      const result = await compileAndRun(
        code,
        exercise.showStdin ? stdin : '',
        setStatus,
        exercise.entryClass,
      );
      if (result.compileFailed) {
        setConsoleKind('error');
        setConsoleText(result.compileOutput || 'Compilation failed.');
      } else {
        const parts = [result.stdout, result.stderr.trim() ? result.stderr : '']
          .filter((part) => part.length > 0)
          .join(result.stdout && result.stderr.trim() ? '\n' : '');
        setConsoleKind(result.stderr.trim() ? 'error' : 'out');
        setConsoleText(parts.length > 0 ? parts : '(no output)');
      }
    } catch (err) {
      setConsoleKind('error');
      setConsoleText(err instanceof Error ? err.message : String(err));
    } finally {
      setPhase('idle');
      setStatus('');
    }
  }, [busy, code, exercise, stdin]);

  const handleCheck = useCallback(async () => {
    if (!exercise || busy) return;
    setPhase('working');
    setCheck(null);
    setStatus('Checking…');
    try {
      const { runHiddenTests } = await import('@/lib/java-playground/runChecks');
      const result = await runHiddenTests(code, exercise.tests, setStatus, exercise.entryClass);
      setCheck(result);
      const failed = result.cases.find((c) => !c.passed);
      if (!failed) {
        setConsoleKind('out');
        setConsoleText(result.cases.map((c) => c.actual).join('\n---\n') || '(no output)');
      } else if (failed.compileFailed) {
        setConsoleKind('error');
        setConsoleText(failed.actual);
      } else {
        setConsoleKind('error');
        setConsoleText(failed.stderr.trim() ? failed.stderr : failed.actual || '(no output)');
      }
    } catch (err) {
      setConsoleKind('error');
      setConsoleText(err instanceof Error ? err.message : String(err));
    } finally {
      setPhase('idle');
      setStatus('');
    }
  }, [busy, code, exercise]);

  const handleReset = useCallback(() => {
    if (!exercise || busy) return;
    setCode(exercise.starter);
    setStdin('');
    setConsoleText('');
    setConsoleKind('empty');
    setCheck(null);
    setStatus('');
  }, [busy, exercise]);

  if (!exercise) {
    return (
      <div className="jp-playground">
        <p className="jp-error">Unknown playground id: {id}</p>
      </div>
    );
  }

  return (
    <section className="jp-playground" aria-label={exercise.title}>
      <h3>{exercise.title}</h3>
      <p className="jp-prompt">{exercise.prompt}</p>

      <JavaEditorPane
        fileName={`${exercise.entryClass ?? 'Main'}.java`}
        code={code}
        onChange={setCode}
        status={status}
        busy={busy}
      />

      {exercise.showStdin && (
        <label className="jp-stdin">
          <span>Program input (Run only)</span>
          <textarea
            value={stdin}
            onChange={(event) => setStdin(event.target.value)}
            placeholder="Optional. Sent to System.in when you click Run. Check ignores this box."
            rows={4}
            disabled={busy}
            spellCheck={false}
          />
        </label>
      )}

      <div className="jp-actions">
        <button type="button" className="jp-btn jp-btn-run" onClick={handleRun} disabled={busy}>
          Run
        </button>
        <button type="button" className="jp-btn jp-btn-check" onClick={handleCheck} disabled={busy}>
          Check
        </button>
        {busy ? (
          <button type="button" className="jp-btn jp-btn-stop" onClick={handleStop}>
            Stop
          </button>
        ) : (
          <button type="button" className="jp-btn jp-btn-reset" onClick={handleReset}>
            Reset
          </button>
        )}
      </div>

      <div
        className={`jp-console jp-console-${consoleKind}`}
        aria-live="polite"
        aria-label="Program output"
      >
        <div className="jp-console-header">Console</div>
        <pre>{consoleText || 'Output appears here after Run or Check.'}</pre>
      </div>

      {check && (
        <ul className="jp-results">
          {check.cases.map((testCase) => (
            <li key={testCase.name} className={testCase.passed ? 'jp-pass' : 'jp-fail'}>
              <strong>{testCase.passed ? 'Passed' : 'Not yet'}:</strong> {testCase.name}
              {!testCase.passed && (
                <div className="jp-diff">
                  <div>
                    <span>Expected</span>
                    <pre>{testCase.expected}</pre>
                  </div>
                  <div>
                    <span>Your output</span>
                    <pre>{testCase.stderr.trim() ? testCase.stderr : testCase.actual}</pre>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="jp-footnote">
        Java compiles and runs in your browser. The first Run may download the runtime. Use Stop if a
        program runs too long.
      </p>
    </section>
  );
}
