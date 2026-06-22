import { useState } from 'react';
import type { MechanismType, Vendor } from '@/lib/pid-sim/types';

interface Props {
  onStart: (mechanism: MechanismType, vendor: Vendor) => void;
}

const MECHANISM_OPTIONS: { value: MechanismType; label: string; description: string }[] = [
  { value: 'elevator', label: 'Elevator', description: 'Vertical lift — kG then kP' },
  { value: 'arm', label: 'Single-jointed arm', description: 'kG·cos(θ) and motion profiling' },
  { value: 'flywheel', label: 'Flywheel', description: 'Velocity control — kS, kV, then kP' },
];

const VENDOR_OPTIONS: { value: Vendor; label: string; description: string }[] = [
  { value: 'rev', label: 'REV Spark MAX', description: 'On-controller PID via SparkMaxConfig' },
  { value: 'ctre', label: 'CTRE Talon FX', description: 'On-controller PID via Slot0 config' },
];

export default function PidSimLanding({ onStart }: Props) {
  const [mechanism, setMechanism] = useState<MechanismType>('elevator');
  const [vendor, setVendor] = useState<Vendor>('rev');

  const mechanismDesc = MECHANISM_OPTIONS.find((o) => o.value === mechanism)?.description ?? '';
  const vendorDesc = VENDOR_OPTIONS.find((o) => o.value === vendor)?.description ?? '';

  return (
    <div className="pid-sim-app pid-sim-landing">
      <div className="lesson-content" data-pagefind-body>
        <h1>PID Simulation</h1>

        <p>
          Practice PID tuning in your browser. Choose a mechanism and motor vendor, learn what each
          constant in the code means, then tune gains while watching a mechanism view and line graph.
        </p>

        <div className="rules-box">
          <h3>Two ways to practice</h3>
          <ul>
            <li>
              <strong>Tier 1 — Browser (this page):</strong> Zero install. Works on school Chromebooks.
              Edit boilerplate code, use SpringTune sliders, and read TraceView graphs.
            </li>
            <li>
              <strong>Tier 2 — Local WPILib + YAMS:</strong> Clone{' '}
              <a href="https://github.com/itkan-robotics/mantik-pid-practice">mantik-pid-practice</a>,
              run <code>Simulate Robot Code</code> in VS Code, and tune with Elastic + AdvantageScope.
            </li>
          </ul>
        </div>

        <div className="rules-box pid-sim-picker">
          <h3>Choose mechanism and vendor</h3>
          <div className="pid-sim-picker-fields">
            <label className="pid-sim-picker-field" htmlFor="pid-mechanism">
              <span className="pid-sim-picker-label">Mechanism</span>
              <select
                id="pid-mechanism"
                className="pid-sim-picker-select"
                value={mechanism}
                onChange={(e) => setMechanism(e.target.value as MechanismType)}
              >
                {MECHANISM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="pid-sim-picker-hint">{mechanismDesc}</span>
            </label>
            <label className="pid-sim-picker-field" htmlFor="pid-vendor">
              <span className="pid-sim-picker-label">Motor vendor</span>
              <select
                id="pid-vendor"
                className="pid-sim-picker-select"
                value={vendor}
                onChange={(e) => setVendor(e.target.value as Vendor)}
              >
                {VENDOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="pid-sim-picker-hint">{vendorDesc}</span>
            </label>
          </div>
          <button
            type="button"
            className="link-grid-button pid-sim-picker-start"
            onClick={() => onStart(mechanism, vendor)}
          >
            Start simulation
            <span className="link-grid-description">
              {MECHANISM_OPTIONS.find((o) => o.value === mechanism)?.label} with{' '}
              {VENDOR_OPTIONS.find((o) => o.value === vendor)?.label}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
