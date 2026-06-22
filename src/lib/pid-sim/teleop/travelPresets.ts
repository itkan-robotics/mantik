import type { PlantConfig } from '../types';
import { heightMToMotorRotations } from '../physics/units/encoderUnits';

export const TRAVEL_PRESET_FRACTIONS = [0, 0.25, 0.5, 0.75, 1] as const;

export const TRAVEL_PRESET_LABELS = ['0%', '25%', '50%', '75%', '100%'] as const;

/** Default QWERTY home-row bindings (letters only). */
export const DEFAULT_TELEOP_BINDINGS: readonly string[] = [
  'KeyQ',
  'KeyW',
  'KeyE',
  'KeyR',
  'KeyT',
];

const STORAGE_KEY = 'mantik-pid-sim-teleop-bindings';

export function travelFractionToSetpointRot(fraction: number, plant: PlantConfig): number {
  const clamped = Math.max(0, Math.min(1, fraction));
  const heightM = plant.minHeightM + clamped * (plant.maxHeightM - plant.minHeightM);
  return heightMToMotorRotations(heightM, plant);
}

export function isLetterKey(code: string): boolean {
  return /^Key[A-Z]$/.test(code);
}

export function formatKeyLabel(code: string): string {
  if (isLetterKey(code)) return code.slice(3);
  return code;
}

export function normalizeKeyCode(event: KeyboardEvent): string | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  const { code } = event;
  if (code === 'Escape' || code.startsWith('Arrow') || code.startsWith('F')) return code;
  return code;
}

export function isTypingInEditor(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return true;
  }
  return !!el.closest('.monaco-editor');
}

export function sanitizeTeleopBindings(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length !== TRAVEL_PRESET_FRACTIONS.length) {
    return [...DEFAULT_TELEOP_BINDINGS];
  }
  const out: string[] = [];
  for (let i = 0; i < TRAVEL_PRESET_FRACTIONS.length; i++) {
    const code = raw[i];
    if (typeof code === 'string' && isLetterKey(code)) {
      out.push(code);
    } else {
      return [...DEFAULT_TELEOP_BINDINGS];
    }
  }
  return out;
}

function sanitizeBindings(raw: unknown): string[] {
  return sanitizeTeleopBindings(raw);
}

export function loadTeleopBindings(): string[] {
  if (typeof localStorage === 'undefined') return [...DEFAULT_TELEOP_BINDINGS];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [...DEFAULT_TELEOP_BINDINGS];
    return sanitizeBindings(JSON.parse(stored));
  } catch {
    return [...DEFAULT_TELEOP_BINDINGS];
  }
}

export function saveTeleopBindings(bindings: readonly string[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
}

/** Remove duplicate keys; displaced presets revert to their default letter. */
export function dedupeBindings(bindings: readonly string[], changedIndex: number, newCode: string): string[] {
  const next = [...bindings];
  next[changedIndex] = newCode;
  for (let i = 0; i < next.length; i++) {
    if (i !== changedIndex && next[i] === newCode) {
      next[i] = DEFAULT_TELEOP_BINDINGS[i] ?? '';
    }
  }
  return next;
}
