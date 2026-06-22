import { lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { LintMessage } from '@/lib/pid-sim/types';
import type { CodeFile } from '@/lib/pid-sim/guides/codeTourSteps';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

export type EditorTab = 'subsystem' | 'robot';

interface Props {
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  subsystemCode: string;
  robotCode: string;
  onSubsystemChange: (code: string) => void;
  errors: LintMessage[];
  highlightLine?: number | null;
  highlightPulse?: boolean;
}

export default function CodeEditorTabs({
  activeTab,
  onTabChange,
  subsystemCode,
  robotCode,
  onSubsystemChange,
  errors,
  highlightLine,
  highlightPulse = false,
}: Props) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const applyMarkers = useCallback(() => {
    const monaco = monacoRef.current;
    const ed = editorRef.current;
    if (!monaco || !ed || activeTab !== 'subsystem') return;
    const model = ed.getModel();
    if (!model) return;

    monaco.editor.setModelMarkers(
      model,
      'pid-sim',
      errors.map((err) => ({
        startLineNumber: err.line,
        startColumn: err.column,
        endLineNumber: err.endLine ?? err.line,
        endColumn: err.endColumn ?? err.column + 1,
        message: err.message,
        severity:
          err.severity === 'error'
            ? monaco.MarkerSeverity.Error
            : monaco.MarkerSeverity.Warning,
      })),
    );
  }, [errors, activeTab]);

  useEffect(() => {
    applyMarkers();
  }, [applyMarkers]);

  useEffect(() => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco || !highlightLine || activeTab !== 'subsystem') return;

    ed.revealLineInCenter(highlightLine);
    ed.setSelection({
      startLineNumber: highlightLine,
      startColumn: 1,
      endLineNumber: highlightLine,
      endColumn: 1,
    });

    if (highlightPulse) {
      ed.deltaDecorations(
        [],
        [
          {
            range: new monaco.Range(highlightLine, 1, highlightLine, 200),
            options: {
              isWholeLine: true,
              className: 'pid-line-highlight',
            },
          },
        ],
      );
    }
  }, [highlightLine, highlightPulse, activeTab]);

  const handleMount = (ed: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;
    applyMarkers();
  };

  const code = activeTab === 'subsystem' ? subsystemCode : robotCode;

  return (
    <div className={`pid-code-editor ${highlightPulse ? 'highlighted' : ''}`}>
      <div className="pid-panel-header pid-editor-tabs">
        <div className="pid-tab-list">
          <button
            type="button"
            className={`pid-file-tab ${activeTab === 'subsystem' ? 'active' : ''}`}
            onClick={() => onTabChange('subsystem')}
          >
            ElevatorSubsystem.java
          </button>
          <button
            type="button"
            className={`pid-file-tab ${activeTab === 'robot' ? 'active' : ''}`}
            onClick={() => onTabChange('robot')}
          >
            Robot.java
          </button>
        </div>
        <span className="pid-panel-sub">
          {activeTab === 'robot' ? 'Read-only reference' : 'Editable'}
        </span>
      </div>
      <Suspense fallback={<p className="pid-editor-loading">Loading code editor…</p>}>
        <MonacoEditor
          key={activeTab}
          height="100%"
          defaultLanguage="java"
          theme="vs-dark"
          value={code}
          onChange={(v) => {
            if (activeTab === 'subsystem') onSubsystemChange(v ?? '');
          }}
          onMount={handleMount}
          options={{
            readOnly: activeTab === 'robot',
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'JetBrains Mono, monospace',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            padding: { top: 12 },
            lineNumbers: 'on',
            renderValidationDecorations: 'on',
          }}
        />
      </Suspense>
    </div>
  );
}

export function tabForCodeFile(file: CodeFile): EditorTab {
  return file === 'robot' ? 'robot' : 'subsystem';
}
