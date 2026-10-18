import { registerSW } from 'virtual:pwa-register';

type UpdateListener = (needRefresh: boolean) => void;

let updateListener: UpdateListener | null = null;
let pendingNotice: boolean | null = null;

function notify(needRefresh: boolean): void {
  if (updateListener) {
    updateListener(needRefresh);
    pendingNotice = null;
  } else {
    pendingNotice = needRefresh;
  }
}

export function setPwaUpdateListener(listener: UpdateListener | null): void {
  updateListener = listener;
  if (listener && pendingNotice !== null) {
    listener(pendingNotice);
    pendingNotice = null;
  }
}

function register(): void {
  if (!import.meta.env.PROD) return;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      notify(true);
    },
    onOfflineReady() {
      notify(false);
    },
  });

  window.__mantikPwaUpdateSW = updateSW;
}

register();

document.addEventListener('astro:page-load', () => {
  if (!import.meta.env.PROD) return;
  if (!navigator.serviceWorker?.controller) {
    register();
  }
});

declare global {
  interface Window {
    __mantikPwaUpdateSW?: (reloadPage?: boolean) => Promise<void>;
  }
}
