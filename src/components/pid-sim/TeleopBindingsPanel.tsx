import { memo } from 'react';
import {
  TRAVEL_PRESET_LABELS,
  formatKeyLabel,
} from '@/lib/pid-sim/teleop/travelPresets';

interface Props {
  bindings: readonly string[];
  captureIndex: number | null;
  active: boolean;
  rejectHint: string | null;
  presetLabels?: readonly string[];
  onStartCapture: (index: number) => void;
  onCancelCapture: () => void;
}

function TeleopBindingsPanel({
  bindings,
  captureIndex,
  active,
  rejectHint,
  presetLabels,
  onStartCapture,
  onCancelCapture,
}: Props) {
  return (
    <div className={`pid-teleop-bindings ${active ? '' : 'inactive'}`}>
      <div className="pid-teleop-bindings-header">
        <span>Teleop presets</span>
        <span className="pid-panel-sub">
          {active ? 'QWERTY letters — keyboard stand-in for gamepad triggers' : 'Enable teleop and run sim'}
        </span>
      </div>
      <div className="pid-teleop-bindings-grid">
        {(presetLabels ?? TRAVEL_PRESET_LABELS).map((label, index) => {
          const keyCode = bindings[index] ?? '';
          const capturing = captureIndex === index;
          return (
            <button
              key={label}
              type="button"
              className={`pid-teleop-bind-btn ${capturing ? 'capturing' : ''}`}
              disabled={false}
              onClick={() => {
                if (capturing) onCancelCapture();
                else onStartCapture(index);
              }}
            >
              <span className="pid-teleop-preset-label">{label}</span>
              <span className="pid-teleop-key-label">
                {capturing ? '…' : keyCode ? formatKeyLabel(keyCode) : '—'}
              </span>
            </button>
          );
        })}
      </div>
      {captureIndex !== null && (
        <p className="pid-teleop-capture-hint">Press a letter key to bind (QWERTY). Escape to cancel.</p>
      )}
      {rejectHint && <p className="pid-teleop-reject-hint">{rejectHint}</p>}
    </div>
  );
}

export default memo(TeleopBindingsPanel);
