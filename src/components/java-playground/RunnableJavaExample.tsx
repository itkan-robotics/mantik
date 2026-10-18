import { useCallback, useEffect, useState } from 'react';
import JavaEditorPane from '@/components/java-playground/JavaEditorPane';
import { exampleNeedsStdin, suggestExampleStdin, type PageContext } from '@/lib/java-playground/exampleSource';
import { javaFileName } from '@/lib/java-playground/sourceChecks';
import type { RunResult } from '@/lib/java-playground/types';

const NO_MAIN_MESSAGE =
  'This example compiled. It has no main method, so nothing printed. Click Edit to add main and try it.';

interface Props {
  id: string;
  original: string;
  context?: PageContext;
  inExercise: boolean;
  showFootnote: boolean;
  onEditingChange: (id: string, editing: boolean) => void;
}

type ConsoleKind = 'empty' | 'out' | 'error';

function resultToConsole(result: RunResult): { kind: ConsoleKind; text: string } {
  if (result.compileFailed) {
    return { kind: 'error', text: result.compileOutput || 'Compilation failed.' };
  }
  if (result.noMain) {
    return { kind: 'empty', text: NO_MAIN_MESSAGE };
  }
  const parts = [result.stdout, result.stderr.trim() ? result.stderr : ''].filter(
    (part) => part.length > 0,
  );
  const joined = parts.join(result.stdout && result.stderr.trim() ? '\n' : '');
  return {
    kind: result.stderr.trim() ? 'error' : 'out',
    text: joined.length > 0 ? joined : '(no output)',
  };
}

export default function RunnableJavaExample({
  id,
  original,
  context,
  inExercise,
  showFootnote,
  onEditingChange,
}: Props) {
  const [code, setCode] = useState(original);
  const [editing, setEditing] = useState(inExercise);
  const sampleStdin = suggestExampleStdin(original);
  const needsStdin = exampleNeedsStdin(code);
  const [stdin, setStdin] = useState(sampleStdin);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [consoleText, setConsoleText] = useState('');
  const [consoleKind, setConsoleKind] = useState<ConsoleKind>('empty');
  const [consoleOpen, setConsoleOpen] = useState(inExercise);

  useEffect(() => {
    onEditingChange(id, editing);
  }, [editing, id, onEditingChange]);

  const showEditor = inExercise || editing;
  const fileName = javaFileName(code);

  const handleEdit = () => {
    const next = !editing;
    setEditing(next);
  };

  const handleReset = () => {
    if (busy) return;
    setCode(original);
    setStdin(sampleStdin);
    setConsoleText('');
    setConsoleKind('empty');
    if (!inExercise) setConsoleOpen(false);
    setStatus('');
  };

  const handleStop = useCallback(async () => {
    const { cancel } = await import('@/lib/java-playground/cheerpjRunner');
    cancel('Stopped.');
  }, []);

  const handleRun = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setStatus('Starting…');
    setConsoleOpen(true);
    try {
      const { compileAndRunExample } = await import('@/lib/java-playground/cheerpjRunner');
      const result = await compileAndRunExample(code, needsStdin ? stdin : '', setStatus, context);
      const shown = resultToConsole(result);
      setConsoleKind(shown.kind);
      setConsoleText(shown.text);
    } catch (err) {
      setConsoleKind('error');
      setConsoleText(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setStatus('');
    }
  }, [busy, code, needsStdin, stdin]);

  return (
    <div className="jp-example-tools">
      {showEditor && (
        <JavaEditorPane
          fileName={fileName}
          code={code}
          onChange={setCode}
          status={status}
          busy={busy}
        />
      )}

      {needsStdin && (
        <label className="jp-stdin jp-example-stdin">
          Sample input
          <textarea
            value={stdin}
            onChange={(event) => setStdin(event.target.value)}
            rows={Math.min(8, Math.max(3, stdin.split('\n').length + 1))}
            disabled={busy}
            spellCheck={false}
            aria-label="Sample input for this example"
          />
        </label>
      )}

      <div className="jp-actions jp-example-actions">
        <button type="button" className="jp-btn jp-btn-run" onClick={handleRun} disabled={busy}>
          Run
        </button>
        {!inExercise && (
          <button type="button" className="jp-btn jp-btn-reset" onClick={handleEdit} disabled={busy}>
            {editing ? 'Hide editor' : 'Edit'}
          </button>
        )}
        {busy ? (
          <button type="button" className="jp-btn jp-btn-stop" onClick={handleStop}>
            Stop
          </button>
        ) : (
          <button type="button" className="jp-btn jp-btn-reset" onClick={handleReset}>
            Reset
          </button>
        )}
        {status && !showEditor ? <span className="jp-status jp-example-status">{status}</span> : null}
      </div>

      {consoleOpen && (
        <div
          className={`jp-console jp-example-console jp-console-${consoleKind}`}
          aria-live="polite"
          aria-label="Program output"
        >
          <div className="jp-console-header">Console</div>
          <pre>
            {consoleText ||
              (inExercise ? 'Output appears here after Run.' : '')}
          </pre>
        </div>
      )}

      {showFootnote && (
        <p className="jp-footnote jp-example-note">
          Runs in the browser as Java 17. Robot libraries are not included. Use Stop if a program runs
          too long.
        </p>
      )}
    </div>
  );
}
