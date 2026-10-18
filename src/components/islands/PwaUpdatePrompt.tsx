import { useEffect, useRef, useState } from 'react';

export default function PwaUpdatePrompt() {
  const [visible, setVisible] = useState(false);
  const waitingRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* preview without postbuild sw */
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            waitingRef.current = registration.waiting ?? installing;
            setVisible(true);
          }
        });
      });
    });
  }, []);

  if (!visible) return null;

  return (
    <div className="pwa-update-prompt" role="status" aria-live="polite">
      <p className="pwa-update-prompt__text">A new version of Mantik is ready.</p>
      <button
        type="button"
        className="pwa-update-prompt__btn"
        onClick={() => {
          waitingRef.current?.postMessage({ type: 'SKIP_WAITING' });
        }}
      >
        Refresh
      </button>
      <button
        type="button"
        className="pwa-update-prompt__dismiss"
        onClick={() => setVisible(false)}
        aria-label="Dismiss update notice"
      >
        ×
      </button>
    </div>
  );
}
