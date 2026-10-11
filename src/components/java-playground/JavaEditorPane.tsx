import { lazy, Suspense } from 'react';
import { useSiteTheme } from '@/lib/useSiteTheme';

const CodeMirrorJavaEditor = lazy(() => import('@/components/java-playground/CodeMirrorJavaEditor'));

interface Props {
  fileName: string;
  code: string;
  onChange: (value: string) => void;
  status?: string;
  busy?: boolean;
}

export default function JavaEditorPane({
  fileName,
  code,
  onChange,
  status,
  busy = false,
}: Props) {
  const siteTheme = useSiteTheme();

  return (
    <div className="jp-editor">
      <div className="jp-editor-header">
        <span>{fileName}</span>
        <span className="jp-status">{status || 'Editable'}</span>
      </div>
      <div className="jp-editor-body">
        <Suspense fallback={<p className="jp-editor-loading">Loading editor…</p>}>
          <CodeMirrorJavaEditor
            code={code}
            onChange={onChange}
            readOnly={busy}
            theme={siteTheme}
          />
        </Suspense>
      </div>
    </div>
  );
}
