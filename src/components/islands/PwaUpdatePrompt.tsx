import { useEffect, useState } from 'react';
import '@/pwa/register';
import { setPwaUpdateListener } from '@/pwa/register';

export default function PwaUpdatePrompt() {
  const [visible, setVisible] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    setPwaUpdateListener((needRefresh) => {
      if (needRefresh) {
        setOfflineReady(false);
        setVisible(true);
      } else {
        setOfflineReady(true);
        setVisible(true);
      }
    });
    return () => setPwaUpdateListener(null);
  }, []);

  if (!visible) return null;

  const isUpdate = !offlineReady;

  return (
    <div className="pwa-update-prompt" role="status" aria-live="polite">
      <p className="pwa-update-prompt__text">
        {isUpdate ? 'A new version of Mantik is ready.' : 'Mantik is ready to use offline.'}
      </p>
      {isUpdate ? (
        <button
          type="button"
          className="pwa-update-prompt__btn"
          onClick={() => {
            void window.__mantikPwaUpdateSW?.(true);
          }}
        >
          Refresh
        </button>
      ) : null}
      <button
        type="button"
        className="pwa-update-prompt__dismiss"
        onClick={() => setVisible(false)}
        aria-label="Dismiss notice"
      >
        ×
      </button>
    </div>
  );
}
