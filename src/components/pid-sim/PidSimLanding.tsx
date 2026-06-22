import type { Vendor } from '@/lib/pid-sim/types';

interface Props {
  onSelectVendor: (vendor: Vendor) => void;
}

export default function PidSimLanding({ onSelectVendor }: Props) {
  return (
    <div className="pid-sim-app pid-sim-landing">
      <div className="lesson-content" data-pagefind-body>
        <h1>PID Simulation</h1>

        <p>
          Practice elevator PID tuning in your browser. Choose a motor vendor, learn what each constant
          in the code means, then tune kG and kP while watching a mechanism view and line graph.
        </p>

        <div className="rules-box">
          <h3>Two ways to practice</h3>
          <ul>
            <li>
              <strong>Tier 1 — Browser (this page):</strong> Zero install. Works on school Chromebooks.
              Edit boilerplate code, use SpringTune sliders, and read TraceView graphs. Best for whole-class
              labs and first-time tuning.
            </li>
            <li>
              <strong>Tier 2 — Local WPILib + YAMS:</strong> Clone{' '}
              <a href="https://github.com/itkan-robotics/mantik-pid-practice">mantik-pid-practice</a>,
              run <code>Simulate Robot Code</code> in VS Code, and tune with Elastic + AdvantageScope.
              Same workflow as the FRC lesson videos; requires WPILib installed.
            </li>
          </ul>
        </div>

        <div className="rules-box">
          <h3>How this works</h3>
          <ul>
            <li>
              <strong>Code Tour</strong> explains what each tuning constant does — no answers given.
            </li>
            <li>
              <strong>Tuning Guide</strong> walks you through kG then kP tuning, like the FRC elevator
              lesson.
            </li>
            <li>
              <strong>SpringTune panel</strong> mirrors live tuning sliders on a real robot (like Elastic).
            </li>
            <li>
              <strong>kG</strong> values match desktop sim closely. <strong>kP</strong> uses WPILib units
              (V/m) — SparkMax and Phoenix tuner numbers differ; retune kP here even if you watched the
              lesson video.
            </li>
            <li>
              Use one browser tab during lab — Monaco editor is the main memory cost on low-RAM machines.
            </li>
          </ul>
        </div>

        <h3>Choose motor vendor</h3>
        <div className="link-grid">
          <button type="button" className="link-grid-button" onClick={() => onSelectVendor('rev')}>
            REV Spark MAX
            <span className="link-grid-description">On-controller PID via SparkMaxConfig</span>
          </button>
          <button type="button" className="link-grid-button" onClick={() => onSelectVendor('ctre')}>
            CTRE Talon FX
            <span className="link-grid-description">On-controller PID via Slot0 config</span>
          </button>
        </div>
      </div>
    </div>
  );
}
