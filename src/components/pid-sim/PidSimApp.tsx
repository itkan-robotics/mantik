import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeEditorTabs, { tabForCodeFile, type EditorTab } from './CodeEditorTabs';
import ElasticPanel from './ElasticPanel';
import SimulatorPanel from './SimulatorPanel';
import SimControlsBar from './SimControlsBar';
import CodeTourPanel, { getCodeTourStep, CODE_TOUR_STEPS } from './CodeTourPanel';
import TuningGuidePanel, { TUNING_GUIDE_STEPS } from './TuningGuidePanel';
import PidSimLanding from './PidSimLanding';
import type { ElevatorSim } from '@/lib/pid-sim/physics/elevatorSim';
import {
  parseElevatorCode,
  patchConstant,
  getTemplateForVendor,
  getRobotTemplateForVendor,
  findConstLine,
} from '@/lib/pid-sim/parser/elevatorParser';
import { aidLevel, aidTier } from '@/lib/pid-sim/guides/aidLevel';
import type { PrerequisiteState } from '@/lib/pid-sim/guides/prerequisites';
import { DEFAULT_SETPOINT_ROT } from '@/lib/pid-sim/reference/elevatorReference';
import type { TuningConfig, Vendor } from '@/lib/pid-sim/types';
import { DEFAULT_TUNING } from '@/lib/pid-sim/types';

type GuideMode = 'codeTour' | 'tuning';

const DEFAULT_WORKSPACE_TUNING: TuningConfig = {
  ...DEFAULT_TUNING,
  setpoint: DEFAULT_SETPOINT_ROT,
};

const FIELD_TO_CONST: Record<keyof TuningConfig, string> = {
  kP: 'kP',
  kI: 'kI',
  kD: 'kD',
  kS: 'kS',
  kG: 'kG',
  kV: 'kV',
  kA: 'kA',
  maxVelocity: 'kMaxVelocity',
  maxAccel: 'kMaxAccel',
  setpoint: 'kSetpoint',
};

const CODE_PATCH_DEBOUNCE_MS = 150;

export default function PidSimApp() {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [guideMode, setGuideMode] = useState<GuideMode>('codeTour');
  const [codeTourStep, setCodeTourStep] = useState(0);
  const [tuningStep, setTuningStep] = useState(0);
  const [editorTab, setEditorTab] = useState<EditorTab>('subsystem');
  const [code, setCode] = useState('');
  const [robotCode, setRobotCode] = useState('');
  const [config, setConfig] = useState<TuningConfig>(DEFAULT_WORKSPACE_TUNING);
  const [liveTuning, setLiveTuning] = useState(false);
  const [teleopEnabled, setTeleopEnabled] = useState(false);
  const [paused, setPaused] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [simReady, setSimReady] = useState(false);
  const [simLoadError, setSimLoadError] = useState<string | null>(null);

  const simRef = useRef<ElevatorSim | null>(null);
  const lastAutoTabStep = useRef(-1);
  const codePatchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<{ key: keyof TuningConfig; value: number } | null>(null);

  const parseResult = useMemo(() => parseElevatorCode(code, vendor ?? 'rev'), [code, vendor]);

  const codeTour = getCodeTourStep(codeTourStep);
  const tuningGuide = TUNING_GUIDE_STEPS[tuningStep];

  const codeTourAid = aidLevel(codeTourStep, CODE_TOUR_STEPS.length);
  const tuningAid = aidLevel(tuningStep, TUNING_GUIDE_STEPS.length);

  const prerequisiteState: PrerequisiteState = {
    teleopEnabled,
    liveTuning,
    simRunning,
    codeValid: !!parseResult.config,
  };

  const applyConfigToSim = useCallback((next: TuningConfig) => {
    simRef.current?.setConfig(next);
  }, []);

  const flushCodePatch = useCallback(() => {
    if (codePatchTimer.current) {
      clearTimeout(codePatchTimer.current);
      codePatchTimer.current = null;
    }
    const pending = pendingPatch.current;
    if (!pending) return;
    pendingPatch.current = null;
    const constName = FIELD_TO_CONST[pending.key];
    setCode((prev) => patchConstant(prev, constName, pending.value));
  }, []);

  useEffect(() => {
    if (!vendor) return;

    let cancelled = false;

    async function loadSim() {
      try {
        simRef.current?.stop();
        const mod = await import('@/lib/pid-sim/physics/elevatorSim');
        if (cancelled) return;
        if (typeof mod.ElevatorSim !== 'function') {
          throw new Error('ElevatorSim export missing from physics module');
        }
        simRef.current = new mod.ElevatorSim(vendor);
        setSimReady(true);
        setSimLoadError(null);
      } catch (err) {
        if (!cancelled) setSimLoadError(String(err));
      }
    }

    setSimReady(false);
    loadSim();
    return () => {
      cancelled = true;
      flushCodePatch();
      simRef.current?.stop();
    };
  }, [vendor, flushCodePatch]);

  useEffect(() => {
    if (!vendor) {
      setEditorReady(false);
      return;
    }
    let cancelled = false;
    const mountEditor = () => {
      if (!cancelled) setEditorReady(true);
    };
    if (typeof requestIdleCallback !== 'undefined') {
      const idleId = requestIdleCallback(mountEditor, { timeout: 400 });
      return () => {
        cancelled = true;
        cancelIdleCallback(idleId);
      };
    }
    const timerId = window.setTimeout(mountEditor, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [vendor]);

  const initVendor = useCallback((v: Vendor) => {
    const initial = { ...DEFAULT_WORKSPACE_TUNING };
    setVendor(v);
    setCode(getTemplateForVendor(v, initial));
    setRobotCode(getRobotTemplateForVendor(v));
    setConfig(initial);
    setGuideMode('codeTour');
    setCodeTourStep(0);
    setTuningStep(0);
    setEditorTab('subsystem');
    lastAutoTabStep.current = -1;
    setSimRunning(false);
    setTeleopEnabled(false);
    setLiveTuning(false);
    simRef.current?.reset();
  }, []);

  useEffect(() => {
    if (parseResult.config) {
      setConfig(parseResult.config);
      setParseError(null);
      applyConfigToSim(parseResult.config);
    } else if (parseResult.errors.some((e) => e.severity === 'error')) {
      setParseError(parseResult.errors.find((e) => e.severity === 'error')?.message ?? 'Parse error');
    }
  }, [parseResult, applyConfigToSim]);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
  }, []);

  const patchCodeConstant = useCallback((key: keyof TuningConfig, value: number) => {
    const constName = FIELD_TO_CONST[key];
    setCode((prev) => patchConstant(prev, constName, value));
  }, []);

  const handleElasticChange = useCallback(
    (key: keyof TuningConfig, value: number) => {
      setEditorTab('subsystem');
      setConfig((prev) => {
        const next = { ...prev, [key]: value };
        applyConfigToSim(next);
        return next;
      });

      pendingPatch.current = { key, value };
      if (codePatchTimer.current) clearTimeout(codePatchTimer.current);
      codePatchTimer.current = setTimeout(() => {
        codePatchTimer.current = null;
        const pending = pendingPatch.current;
        if (!pending) return;
        pendingPatch.current = null;
        patchCodeConstant(pending.key, pending.value);
      }, CODE_PATCH_DEBOUNCE_MS);
    },
    [applyConfigToSim, patchCodeConstant],
  );

  const handleElasticCommit = useCallback(
    (key: keyof TuningConfig, value: number) => {
      pendingPatch.current = { key, value };
      flushCodePatch();
    },
    [flushCodePatch],
  );

  const startSim = () => {
    if (!parseResult.config || !teleopEnabled || !simRef.current) return;
    const sim = simRef.current!;
    sim.reset();
    sim.setConfig(parseResult.config);
    sim.setEnabled(true);
    setSimRunning(true);
    sim.start();
  };

  const stopSim = () => {
    simRef.current?.stop();
    simRef.current?.setEnabled(false);
    setSimRunning(false);
  };

  useEffect(() => {
    if (guideMode !== 'codeTour') return;
    if (codeTourStep === lastAutoTabStep.current) return;
    lastAutoTabStep.current = codeTourStep;
    if (codeTour.highlight?.file) {
      setEditorTab(tabForCodeFile(codeTour.highlight.file));
    }
  }, [guideMode, codeTourStep, codeTour.highlight?.file]);

  const handleCodeTourStepChange = (index: number) => {
    lastAutoTabStep.current = -1;
    setCodeTourStep(index);
  };

  const highlightLine = useMemo(() => {
    if (guideMode !== 'codeTour' || editorTab !== 'subsystem') return null;
    const tier = aidTier(codeTourAid);
    if (tier === 'minimal') return null;
    const h = codeTour.highlight;
    if (!h?.constName || h.constName === 'elastic') return null;
    if (h.constName === 'maxVelocity') return findConstLine(code, 'kMaxVelocity');
    if (h.constName === 'maxAccel') return findConstLine(code, 'kMaxAccel');
    return findConstLine(code, FIELD_TO_CONST[h.constName]);
  }, [guideMode, editorTab, codeTour, codeTourAid, code]);

  const tuningElasticField =
    guideMode === 'tuning' && aidTier(tuningAid) !== 'minimal'
      ? tuningGuide.highlight?.field
      : undefined;

  const highlightMechanism =
    guideMode === 'tuning' &&
    aidTier(tuningAid) !== 'minimal' &&
    !!tuningGuide.highlight?.mechanism;

  const highlightGraph =
    guideMode === 'tuning' &&
    aidTier(tuningAid) !== 'minimal' &&
    !!tuningGuide.highlight?.graph;

  const editorPulse =
    guideMode === 'codeTour' &&
    aidTier(codeTourAid) === 'full' &&
    !!codeTour.highlight &&
    codeTour.highlight.constName !== 'elastic';

  if (!vendor) {
    return <PidSimLanding onSelectVendor={initVendor} />;
  }

  if (simLoadError) {
    return (
      <div className="pid-sim-app pid-sim-landing">
        <div className="lesson-content">
          <h1>PID Simulation</h1>
          <p className="pid-sim-load-error">Physics engine failed to load. Refresh the page.</p>
          <p className="pid-sim-load-error-detail">{simLoadError}</p>
        </div>
      </div>
    );
  }

  if (!simReady) {
    return (
      <div className="pid-sim-app pid-sim-landing">
        <div className="lesson-content">
          <p className="pid-editor-loading">Loading physics engine…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pid-sim-app pid-sim-workspace">
      <div className="pid-sim-toolbar">
        <div className="pid-sim-toolbar-left">
          <span className="pid-badge">Elevator</span>
          <span className="pid-badge">{vendor === 'rev' ? 'REV Spark MAX' : 'CTRE Talon FX'}</span>
          <button
            type="button"
            className="pid-link-btn"
            onClick={() => {
              stopSim();
              setVendor(null);
              setCode('');
              setRobotCode('');
            }}
          >
            Change vendor
          </button>
        </div>
      </div>

      <SimControlsBar
        teleopEnabled={teleopEnabled}
        onTeleopChange={setTeleopEnabled}
        liveTuning={liveTuning}
        onLiveTuningChange={setLiveTuning}
        simRunning={simRunning}
        codeValid={!!parseResult.config && simReady}
        onRun={startSim}
        onStop={stopSim}
        parseError={parseError}
      />

      <div className="pid-sim-grid">
        <aside className="pid-guide-sidebar">
          <div className="pid-guide-mode-tabs">
            <button
              type="button"
              className={guideMode === 'codeTour' ? 'active' : ''}
              onClick={() => setGuideMode('codeTour')}
            >
              Code Tour
            </button>
            <button
              type="button"
              className={guideMode === 'tuning' ? 'active' : ''}
              onClick={() => setGuideMode('tuning')}
            >
              Tuning Guide
            </button>
          </div>
          {guideMode === 'codeTour' ? (
            <CodeTourPanel
              stepIndex={codeTourStep}
              onStepChange={handleCodeTourStepChange}
              onComplete={() => {
                setGuideMode('tuning');
                setTuningStep(0);
              }}
              highlightPulse={editorPulse}
              prerequisiteState={prerequisiteState}
            />
          ) : (
            <TuningGuidePanel
              stepIndex={tuningStep}
              onStepChange={setTuningStep}
              simRunning={simRunning}
              highlightPulse={aidTier(tuningAid) === 'full'}
              prerequisiteState={prerequisiteState}
            />
          )}
        </aside>

        <div className="pid-editor-panel">
          {editorReady ? (
            <CodeEditorTabs
              activeTab={editorTab}
              onTabChange={setEditorTab}
              subsystemCode={code}
              robotCode={robotCode}
              onSubsystemChange={handleCodeChange}
              errors={parseResult.errors}
              highlightLine={highlightLine}
              highlightPulse={editorPulse}
            />
          ) : (
            <div className="pid-code-editor pid-code-editor-placeholder">
              <div className="pid-panel-header pid-editor-tabs">
                <div className="pid-tab-list">
                  <span className="pid-file-tab active">ElevatorSubsystem.java</span>
                </div>
              </div>
              <p className="pid-editor-loading">Loading code editor…</p>
            </div>
          )}
        </div>
      </div>

      <div className="pid-bottom-row">
        <ElasticPanel
          config={config}
          onChange={handleElasticChange}
          onChangeCommit={handleElasticCommit}
          liveTuning={liveTuning}
          highlightedField={tuningElasticField}
          onSliderFocus={() => {
            if (guideMode === 'tuning') setLiveTuning(true);
          }}
        />
        <SimulatorPanel
          simRef={simRef}
          setpoint={config.setpoint}
          paused={paused}
          onPausedChange={setPaused}
          highlightMechanism={highlightMechanism}
          highlightGraph={highlightGraph}
        />
      </div>
    </div>
  );
}
