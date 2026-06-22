import { memo } from 'react';
import type { TuningConfig } from '@/lib/pid-sim/types';
import { KP_SLIDER_MAX } from '@/lib/pid-sim/reference/elevatorReference';

interface Props {
  config: TuningConfig;
  onChange: (key: keyof TuningConfig, value: number) => void;
  onChangeCommit?: (key: keyof TuningConfig, value: number) => void;
  liveTuning: boolean;
  highlightedField?: keyof TuningConfig;
  onSliderFocus?: () => void;
}

const FIELDS: { key: keyof TuningConfig; label: string; min: number; max: number; step: number }[] = [
  { key: 'kG', label: 'kG (gravity FF, V)', min: 0, max: 5, step: 0.01 },
  { key: 'kP', label: 'kP (V/rot)', min: 0, max: KP_SLIDER_MAX, step: 0.05 },
  { key: 'kI', label: 'kI (V·s/rot)', min: 0, max: 5, step: 0.01 },
  { key: 'kD', label: 'kD (V/(rot/s))', min: 0, max: 5, step: 0.01 },
  { key: 'kS', label: 'kS (static FF, V)', min: 0, max: 2, step: 0.01 },
  { key: 'kV', label: 'kV (V/(rot/s))', min: 0, max: 10, step: 0.01 },
  { key: 'setpoint', label: 'Setpoint (motor rot)', min: 0, max: 260, step: 0.5 },
  { key: 'maxVelocity', label: 'Max velocity (rot/s)', min: 0, max: 50, step: 0.5 },
  { key: 'maxAccel', label: 'Max accel (rot/s²)', min: 0, max: 200, step: 1 },
];

function ElasticPanel({
  config,
  onChange,
  onChangeCommit,
  liveTuning,
  highlightedField,
  onSliderFocus,
}: Props) {
  const commit = onChangeCommit ?? onChange;

  return (
    <div className="pid-elastic-panel">
      <div className="pid-panel-header">
        <span>SpringTune</span>
        <span className="pid-panel-sub">
          {liveTuning ? 'Live tuning active' : 'Enable Live Tuning in Sim Controls to use sliders'}
        </span>
      </div>

      <div className="pid-widget-grid">
        {FIELDS.map(({ key, label, min, max, step }) => (
          <div
            key={key}
            className={`pid-widget ${highlightedField === key ? 'highlighted' : ''}`}
          >
            <label htmlFor={`field-${key}`}>{label}</label>
            <div className="pid-widget-inputs">
              <input
                id={`field-${key}`}
                type="number"
                min={min}
                max={max}
                step={step}
                value={config[key]}
                disabled={!liveTuning}
                onFocus={onSliderFocus}
                onChange={(e) => onChange(key, parseFloat(e.target.value) || 0)}
                onBlur={(e) => commit(key, parseFloat(e.target.value) || 0)}
              />
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={config[key]}
                disabled={!liveTuning}
                onFocus={onSliderFocus}
                onChange={(e) => onChange(key, parseFloat(e.target.value))}
                onPointerUp={(e) =>
                  commit(key, parseFloat((e.target as HTMLInputElement).value))
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(ElasticPanel);
