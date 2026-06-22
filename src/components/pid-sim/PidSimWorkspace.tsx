import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeEditorTabs, { tabForCodeFile, type EditorTab } from './CodeEditorTabs';
import ElasticPanel from './ElasticPanel';
import SimulatorPanel from './SimulatorPanel';
import SimControlsBar from './SimControlsBar';
import TeleopBindingsPanel from './TeleopBindingsPanel';
import CodeTourPanel, { getCodeTourStep } from './CodeTourPanel';
import TuningGuidePanel from './TuningGuidePanel';
import type { PidMechanismSim } from '@/lib/pid-sim/physics/simTypes';
import { loadMechanismBundle, type MechanismBundle } from '@/lib/pid-sim/mechanismBundle';
import { aidLevel, aidTier } from '@/lib/pid-sim/guides/aidLevel';
import type { PrerequisiteState } from '@/lib/pid-sim/guides/prerequisites';
import {
  TRAVEL_PRESET_FRACTIONS,
  dedupeBindings,
  isLetterKey,
  isTypingInEditor,
  loadTeleopBindings,
  normalizeKeyCode,
  saveTeleopBindings,
} from '@/lib/pid-sim/teleop/travelPresets';
import type { ArmPlantConfig, MechanismType, PlantConfig, TuningConfig, Vendor } from '@/lib/pid-sim/types';
import { DEFAULT_TUNING } from '@/lib/pid-sim/types';

type GuideMode = 'codeTour' | 'tuning';

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

interface Props {
  mechanism: MechanismType;
  vendor: Vendor;
  onExit: () => void;
}

export default function PidSimWorkspace({ mechanism, vendor, onExit }: Props) {
  const [bundle, setBundle] = useState<MechanismBundle | null>(null);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [guideMode, setGuideMode] = useState<GuideMode>('codeTour');
  const [codeTourStep, setCodeTourStep] = useState(0);
  const [tuningStep, setTuningStep] = useState(0);
  const [editorTab, setEditorTab] = useState<EditorTab>('subsystem');
  const [code, setCode] = useState('');
  const [robotCode, setRobotCode] = useState('');
  const [config, setConfig] = useState<TuningConfig>({ ...DEFAULT_TUNING, setpoint: 0 });
  const [liveTuning, setLiveTuning] = useState(false);
  const [teleopEnabled, setTeleopEnabled] = useState(false);
  const [paused, setPaused] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [simReady, setSimReady] = useState(false);
  const [simLoadError, setSimLoadError] = useState<string | null>(null);
  const [teleopBindings, setTeleopBindings] = useState<string[]>(() => loadTeleopBindings());
  const [bindingCaptureIndex, setBindingCaptureIndex] = useState<number | null>(null);
  const [bindingRejectHint, setBindingRejectHint] = useState<string | null>(null);

  const simRef = useRef<PidMechanismSim | null>(null);
  const lastAutoTabStep = useRef(-1);
  const codePatchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<{ key: keyof TuningConfig; value: number } | null>(null);
  const lastPlantRef = useRef<PlantConfig | ArmPlantConfig | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setBundle(null);
    setBundleError(null);
    initializedRef.current = false;

    loadMechanismBundle(mechanism)
      .then((loaded) => {
        if (!cancelled) setBundle(loaded);
      })
      .catch((err) => {
        if (!cancelled) setBundleError(String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [mechanism]);

  useEffect(() => {
    if (!bundle || initializedRef.current) return;
    initializedRef.current = true;
    const initial: TuningConfig = { ...DEFAULT_TUNING, setpoint: bundle.defaultSetpointRot };
    setCode(bundle.getSubsystemTemplate(vendor, initial, bundle.referencePlant));
    setRobotCode(bundle.getRobotTemplate(vendor));
    setConfig(initial);
  }, [bundle, vendor]);

  const plantConfig = useMemo(() => {
    if (!bundle || !code) return bundle?.referencePlant ?? null;
    return bundle.parsePlantFromCode(code);
  }, [bundle, code]);

  const parseResult = useMemo(() => {
    if (!bundle) return { config: null, errors: [] };
    return bundle.parseCode(code, vendor);
  }, [bundle, code, vendor]);

  const lintMessages = useMemo(() => {
    if (!bundle || !plantConfig) return parseResult.errors;
    const plantMsgs = bundle.plantWarningsFor(plantConfig, parseResult.config?.setpoint).map(
      (message) => ({
        line: 1,
        column: 1,
        message,
        severity: 'warning' as const,
      }),
    );
    return [...parseResult.errors, ...plantMsgs];
  }, [bundle, plantConfig, parseResult.errors, parseResult.config?.setpoint]);

  const codeTourSteps = bundle?.codeTourSteps ?? [];
  const tuningGuideSteps = bundle?.tuningGuideSteps ?? [];
  const codeTour = getCodeTourStep(codeTourStep, codeTourSteps);
  const tuningGuide = tuningGuideSteps[tuningStep] ?? tuningGuideSteps[0];

  const codeTourAid = aidLevel(codeTourStep, codeTourSteps.length || 1);
  const tuningAid = aidLevel(tuningStep, tuningGuideSteps.length || 1);

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
    if (!bundle) return;
    if (codePatchTimer.current) {
      clearTimeout(codePatchTimer.current);
      codePatchTimer.current = null;
    }
    const pending = pendingPatch.current;
    if (!pending) return;
    pendingPatch.current = null;
    const constName = FIELD_TO_CONST[pending.key];
    setCode((prev) => bundle.patchConstant(prev, constName, pending.value));
  }, [bundle]);

  useEffect(() => {
    if (!bundle) return;

    let cancelled = false;

    async function loadSim() {
      try {
        simRef.current?.stop();
        if (mechanism === 'arm') {
          const mod = await import('@/lib/pid-sim/physics/armSim');
          if (cancelled) return;
          const sim = new mod.ArmSim(vendor);
          sim.setPlant(bundle!.referencePlant as ArmPlantConfig);
          simRef.current = sim;
        } else {
          const mod = await import('@/lib/pid-sim/physics/elevatorSim');
          if (cancelled) return;
          const sim = new mod.ElevatorSim(vendor);
          sim.setPlant(bundle!.referencePlant as PlantConfig);
          simRef.current = sim;
        }
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
  }, [vendor, mechanism, bundle, flushCodePatch]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    const sim = simRef.current;
    if (!sim || !bundle || !plantConfig) return;
    if (lastPlantRef.current && bundle.plantsEqual(lastPlantRef.current, plantConfig)) return;
    lastPlantRef.current = plantConfig;
    if (mechanism === 'arm') {
      (sim as import('@/lib/pid-sim/physics/armSim').ArmSim).setPlant(plantConfig as ArmPlantConfig);
    } else {
      (sim as import('@/lib/pid-sim/physics/elevatorSim').ElevatorSim).setPlant(
        plantConfig as PlantConfig,
      );
    }
  }, [mechanism, plantConfig, bundle]);

  useEffect(() => {
    if (parseResult.config) {
      setConfig(parseResult.config);
      setParseError(null);
      applyConfigToSim(parseResult.config);
    } else if (parseResult.errors.some((e) => e.severity === 'error')) {
      setParseError(parseResult.errors.find((e) => e.severity === 'error')?.message ?? 'Parse error');
    }
  }, [parseResult, applyConfigToSim]);

  const patchCodeConstant = useCallback(
    (key: keyof TuningConfig, value: number) => {
      if (!bundle) return;
      const constName = FIELD_TO_CONST[key];
      setCode((prev) => bundle.patchConstant(prev, constName, value));
    },
    [bundle],
  );

  const applySetpointRot = useCallback(
    (rot: number) => {
      setEditorTab('subsystem');
      setConfig((prev) => {
        const next = { ...prev, setpoint: rot };
        applyConfigToSim(next);
        return next;
      });
      patchCodeConstant('setpoint', rot);
    },
    [applyConfigToSim, patchCodeConstant],
  );

  const applyTravelPreset = useCallback(
    (presetIndex: number) => {
      const fraction = TRAVEL_PRESET_FRACTIONS[presetIndex];
      if (fraction === undefined || !bundle || !plantConfig) return;
      applySetpointRot(bundle.travelFractionToSetpoint(fraction, plantConfig));
    },
    [bundle, plantConfig, applySetpointRot],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const keyCode = normalizeKeyCode(event);
      if (!keyCode) return;

      if (bindingCaptureIndex !== null) {
        if (keyCode === 'Escape') {
          setBindingCaptureIndex(null);
          setBindingRejectHint(null);
          return;
        }
        if (!isLetterKey(keyCode)) {
          setBindingRejectHint('Letters only — try QWERTY row (Q W E R T).');
          return;
        }
        const next = dedupeBindings(teleopBindings, bindingCaptureIndex, keyCode);
        setTeleopBindings(next);
        saveTeleopBindings(next);
        setBindingCaptureIndex(null);
        setBindingRejectHint(null);
        event.preventDefault();
        return;
      }

      if (!teleopEnabled || !simRunning || isTypingInEditor()) return;

      const presetIndex = teleopBindings.indexOf(keyCode);
      if (presetIndex < 0) return;

      applyTravelPreset(presetIndex);
      event.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bindingCaptureIndex, teleopBindings, teleopEnabled, simRunning, applyTravelPreset]);

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
    const sim = simRef.current;
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

  const handleExit = () => {
    stopSim();
    flushCodePatch();
    onExit();
  };

  useEffect(() => {
    if (guideMode !== 'codeTour' || !codeTour) return;
    if (codeTourStep === lastAutoTabStep.current) return;
    lastAutoTabStep.current = codeTourStep;
    if (codeTour.highlight?.file) {
      setEditorTab(tabForCodeFile(codeTour.highlight.file));
    }
  }, [guideMode, codeTourStep, codeTour?.highlight?.file]);

  const handleCodeTourStepChange = (index: number) => {
    lastAutoTabStep.current = -1;
    setCodeTourStep(index);
  };

  const highlightLine = useMemo(() => {
    if (!bundle || guideMode !== 'codeTour' || editorTab !== 'subsystem') return null;
    const tier = aidTier(codeTourAid);
    if (tier === 'minimal') return null;
    const h = codeTour?.highlight;
    if (!h?.constName || h.constName === 'elastic') return null;
    if (h.constName === 'plant') return bundle.findPlantLine(code);
    if (h.constName === 'maxVelocity') return bundle.findConstLine(code, 'kMaxVelocity');
    if (h.constName === 'maxAccel') return bundle.findConstLine(code, 'kMaxAccel');
    return bundle.findConstLine(code, FIELD_TO_CONST[h.constName]);
  }, [bundle, guideMode, editorTab, codeTour, codeTourAid, code]);

  const tuningElasticField =
    guideMode === 'tuning' && aidTier(tuningAid) !== 'minimal'
      ? tuningGuide?.highlight?.field
      : undefined;

  const highlightMechanism =
    guideMode === 'tuning' &&
    aidTier(tuningAid) !== 'minimal' &&
    !!tuningGuide?.highlight?.mechanism;

  const highlightGraph =
    guideMode === 'tuning' &&
    aidTier(tuningAid) !== 'minimal' &&
    !!tuningGuide?.highlight?.graph;

  const editorPulse =
    guideMode === 'codeTour' &&
    aidTier(codeTourAid) === 'full' &&
    !!codeTour?.highlight &&
    codeTour.highlight.constName !== 'elastic';

  const subsystemFileName = mechanism === 'arm' ? 'ArmSubsystem.java' : 'ElevatorSubsystem.java';
  const mechanismLabel = mechanism === 'arm' ? 'Arm' : 'Elevator';

  if (bundleError) {
    return (
      <div className="pid-sim-app pid-sim-landing">
        <div className="lesson-content">
          <h1>PID Simulation</h1>
          <p className="pid-sim-load-error">Failed to load simulation modules. Refresh the page.</p>
          <p className="pid-sim-load-error-detail">{bundleError}</p>
        </div>
      </div>
    );
  }

  if (!bundle || !simReady) {
    return (
      <div className="pid-sim-app pid-sim-landing">
        <div className="lesson-content">
          <p className="pid-editor-loading">Loading simulation…</p>
        </div>
      </div>
    );
  }

  if (simLoadError) {
    return (
      <div className="pid-sim-app pid-sim-landing">
        <div className="lesson-content">
          <h1>PID Simulation</h1>
          <p className="pid-sim-load-error">Physics failed to load. Refresh the page.</p>
          <p className="pid-sim-load-error-detail">{simLoadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pid-sim-app pid-sim-workspace">
      <div className="pid-sim-toolbar">
        <div className="pid-sim-toolbar-left">
          <span className="pid-badge">{mechanismLabel}</span>
          <span className="pid-badge">{vendor === 'rev' ? 'REV Spark MAX' : 'CTRE Talon FX'}</span>
          <button type="button" className="pid-link-btn" onClick={handleExit}>
            Change mechanism
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

      <TeleopBindingsPanel
        bindings={teleopBindings}
        captureIndex={bindingCaptureIndex}
        active={teleopEnabled && simRunning}
        rejectHint={bindingRejectHint}
        onStartCapture={(index) => {
          setBindingRejectHint(null);
          setBindingCaptureIndex(index);
        }}
        onCancelCapture={() => {
          setBindingCaptureIndex(null);
          setBindingRejectHint(null);
        }}
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
              steps={codeTourSteps}
            />
          ) : (
            <TuningGuidePanel
              stepIndex={tuningStep}
              onStepChange={setTuningStep}
              simRunning={simRunning}
              highlightPulse={aidTier(tuningAid) === 'full'}
              prerequisiteState={prerequisiteState}
              steps={tuningGuideSteps}
              mechanism={mechanism}
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
              onSubsystemChange={setCode}
              errors={lintMessages}
              highlightLine={highlightLine}
              highlightPulse={editorPulse}
              subsystemFileName={subsystemFileName}
            />
          ) : (
            <div className="pid-code-editor pid-code-editor-placeholder">
              <div className="pid-panel-header pid-editor-tabs">
                <div className="pid-tab-list">
                  <span className="pid-file-tab active">{subsystemFileName}</span>
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
          mechanism={mechanism}
          onSliderFocus={() => {
            if (guideMode === 'tuning') setLiveTuning(true);
          }}
        />
        <SimulatorPanel
          simRef={simRef}
          setpoint={config.setpoint}
          paused={paused}
          onPausedChange={setPaused}
          mechanism={mechanism}
          highlightMechanism={highlightMechanism}
          highlightGraph={highlightGraph}
        />
      </div>
    </div>
  );
}
