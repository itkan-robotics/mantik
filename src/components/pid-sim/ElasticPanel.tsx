import { memo } from 'react';
import type { TuningConfig } from '@/lib/pid-sim/types';

interface Props {
  config: TuningConfig;
  onChange: (key: keyof TuningConfig, value: number) => void;
  onChangeCommit?: (key: keyof TuningConfig, value: number) => void;
  liveTuning: boolean;
  highlightedField?: keyof TuningConfig;
  onSliderFocus?: () => void;
}

const FIELDS: { key: keyof TuningConfig; label: string; min: number; max: number; step: number }[] = [
  { key: 'kG', label: 'kG (gravity FF)', min: 0, max: 5, step: 0.01 },
  { key: 'kP', label: 'kP', min: 0, max: 64, step: 1 },
  { key: 'kI', label: 'kI', min: 0, max: 5, step: 0.01 },
  { key: 'kD', label: 'kD', min: 0, max: 5, step: 0.01 },
  { key: 'kS', label: 'kS (static FF)', min: 0, max: 2, step: 0.01 },
  { key: 'kV', label: 'kV (velocity FF)', min: 0, max: 10, step: 0.01 },
  { key: 'setpoint', label: 'Setpoint (m)', min: 0, max: 3, step: 0.05 },
  { key: 'maxVelocity', label: 'Max velocity (m/s)', min: 0, max: 5, step: 0.1 },
  { key: 'maxAccel', label: 'Max accel (m/s²)', min: 0, max: 10, step: 0.1 },
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
