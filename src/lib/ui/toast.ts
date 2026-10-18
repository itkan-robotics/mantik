const STACK_ID = 'mantik-toast-stack';

export interface ShowToastOptions {
  /** Reuse the same id to update message in place. */
  id?: string;
  /** Auto-dismiss after this many ms. Omit or null to keep until dismissed or replaced. */
  durationMs?: number | null;
  extraClass?: string;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

function ensureStack(): HTMLElement {
  let stack = document.getElementById(STACK_ID);
  if (!stack) {
    stack = document.createElement('div');
    stack.id = STACK_ID;
    stack.className = 'mantik-toast-stack';
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
  }
  return stack;
}

function toastElement(id: string): HTMLElement {
  const stack = ensureStack();
  const existing = stack.querySelector<HTMLElement>(`[data-toast-id="${id}"]`);
  if (existing) return existing;
  const el = document.createElement('div');
  el.className = 'notification-popup notification-popup--wide';
  el.setAttribute('role', 'status');
  el.dataset.toastId = id;
  el.tabIndex = 0;
  el.addEventListener('click', () => dismissToast(id));
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      dismissToast(id);
    }
  });
  stack.appendChild(el);
  return el;
}

export function showToast(message: string, options: ShowToastOptions = {}): void {
  if (typeof document === 'undefined') return;
  const id = options.id ?? `toast-${Date.now()}`;
  const el = toastElement(id);
  if (options.extraClass) {
    for (const cls of options.extraClass.split(/\s+/)) {
      if (cls) el.classList.add(cls);
    }
  }
  el.textContent = message;
  requestAnimationFrame(() => el.classList.add('is-visible'));

  const prev = timers.get(id);
  if (prev) clearTimeout(prev);
  if (options.durationMs != null && options.durationMs > 0) {
    timers.set(
      id,
      setTimeout(() => dismissToast(id), options.durationMs),
    );
  }
}

export function dismissToast(id: string): void {
  if (typeof document === 'undefined') return;
  const prev = timers.get(id);
  if (prev) {
    clearTimeout(prev);
    timers.delete(id);
  }
  const el = document.querySelector<HTMLElement>(`[data-toast-id="${id}"]`);
  if (!el) return;
  el.classList.remove('is-visible');
  const remove = () => el.remove();
  el.addEventListener('transitionend', remove, { once: true });
  setTimeout(remove, 250);
}
