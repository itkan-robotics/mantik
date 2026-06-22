import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeEditorTabs, { tabForCodeFile, type EditorTab } from './CodeEditorTabs';
import ElasticPanel from './ElasticPanel';
import SimulatorPanel from './SimulatorPanel';
import SimControlsBar from './SimControlsBar';
import TeleopBindingsPanel from './TeleopBindingsPanel';
import CodeTourPanel, { getCodeTourStep, CODE_TOUR_STEPS } from './CodeTourPanel';
import TuningGuidePanel, { TUNING_GUIDE_STEPS } from './TuningGuidePanel';
import PidSimLanding from './PidSimLanding';
import type { PidMechanismSim } from '@/lib/pid-sim/physics/simTypes';
import {
  parseElevatorCode,
  patchConstant,
  getTemplateForVendor,
  getRobotTemplateForVendor,
  findConstLine,
} from '@/lib/pid-sim/parser/elevatorParser';
import {
  parseArmCode,
  getArmTemplateForVendor,
  getArmRobotTemplateForVendor,
} from '@/lib/pid-sim/parser/armParser';
import { parsePlantConfig, plantWarnings, findPlantSectionLine, plantsEqual } from '@/lib/pid-sim/parser/plantParser';
import {
  parseArmPlantConfig,
  armPlantWarnings,
  findArmPlantSectionLine,
  armPlantsEqual,
} from '@/lib/pid-sim/parser/armPlantParser';
import { aidLevel, aidTier } from '@/lib/pid-sim/guides/aidLevel';
import { ARM_CODE_TOUR_STEPS } from '@/lib/pid-sim/guides/arm/codeTourSteps';
import { ARM_TUNING_GUIDE_STEPS } from '@/lib/pid-sim/guides/arm/tuningGuideSteps';
import type { PrerequisiteState } from '@/lib/pid-sim/guides/prerequisites';
import { DEFAULT_SETPOINT_ROT, REFERENCE_PLANT } from '@/lib/pid-sim/reference/elevatorReference';
import {
  DEFAULT_ARM_SETPOINT_ROT,
  REFERENCE_ARM_PLANT,
} from '@/lib/pid-sim/reference/armReference';
import {
  TRAVEL_PRESET_FRACTIONS,
  dedupeBindings,
  isLetterKey,
  isTypingInEditor,
  loadTeleopBindings,
  normalizeKeyCode,
  saveTeleopBindings,
  travelFractionToSetpointRot,
} from '@/lib/pid-sim/teleop/travelPresets';
import { travelFractionToSetpointRot as armTravelFractionToSetpointRot } from '@/lib/pid-sim/physics/units/armUnits';
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

function defaultSetpoint(mechanism: MechanismType): number {
  return mechanism === 'arm' ? DEFAULT_ARM_SETPOINT_ROT : DEFAULT_SETPOINT_ROT;
}

export default function PidSimApp() {
  const [mechanism, setMechanism] = useState<MechanismType | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [guideMode, setGuideMode] = useState<GuideMode>('codeTour');
  const [codeTourStep, setCodeTourStep] = useState(0);
  const [tuningStep, setTuningStep] = useState(0);
  const [editorTab, setEditorTab] = useState<EditorTab>('subsystem');
  const [code, setCode] = useState('');
  const [robotCode, setRobotCode] = useState('');
  const [config, setConfig] = useState<TuningConfig>({
    ...DEFAULT_TUNING,
    setpoint: DEFAULT_SETPOINT_ROT,
  });
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
  const lastElevatorPlantRef = useRef<PlantConfig | null>(null);
  const lastArmPlantRef = useRef<ArmPlantConfig | null>(null);

  const codeTourSteps = mechanism === 'arm' ? ARM_CODE_TOUR_STEPS : CODE_TOUR_STEPS;
  const tuningGuideSteps = mechanism === 'arm' ? ARM_TUNING_GUIDE_STEPS : TUNING_GUIDE_STEPS;

  const parseResult = useMemo(() => {
    if (!vendor || !mechanism) return { config: null, errors: [] };
    return mechanism === 'arm'
      ? parseArmCode(code, vendor)
      : parseElevatorCode(code, vendor);
  }, [code, vendor, mechanism]);

  const elevatorPlantConfig = useMemo(
    () => (mechanism === 'elevator' ? parsePlantConfig(code) : REFERENCE_PLANT),
    [code, mechanism],
  );

  const armPlantConfig = useMemo(
    () => (mechanism === 'arm' ? parseArmPlantConfig(code) : REFERENCE_ARM_PLANT),
    [code, mechanism],
  );

  const lintMessages = useMemo(() => {
    if (mechanism === 'arm') {
      const plantMsgs = armPlantWarnings(armPlantConfig, parseResult.config?.setpoint).map(
        (message) => ({
          line: 1,
          column: 1,
          message,
          severity: 'warning' as const,
        }),
      );
      return [...parseResult.errors, ...plantMsgs];
    }
    const plantMsgs = plantWarnings(elevatorPlantConfig, parseResult.config?.setpoint).map(
      (message) => ({
        line: 1,
        column: 1,
        message,
        severity: 'warning' as const,
      }),
    );
    return [...parseResult.errors, ...plantMsgs];
  }, [
    mechanism,
    parseResult.errors,
    parseResult.config?.setpoint,
    elevatorPlantConfig,
    armPlantConfig,
  ]);

  const codeTour = getCodeTourStep(codeTourStep, codeTourSteps);
  const tuningGuide = tuningGuideSteps[tuningStep] ?? tuningGuideSteps[0];

  const codeTourAid = aidLevel(codeTourStep, codeTourSteps.length);
  const tuningAid = aidLevel(tuningStep, tuningGuideSteps.length);

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
    if (!vendor || !mechanism) return;

    let cancelled = false;

    async function loadSim() {
      try {
        simRef.current?.stop();
        if (mechanism === 'arm') {
          const mod = await import('@/lib/pid-sim/physics/armSim');
          if (cancelled) return;
          if (typeof mod.ArmSim !== 'function') {
            throw new Error('ArmSim export missing from physics module');
          }
          const sim = new mod.ArmSim(vendor!);
          sim.setPlant(REFERENCE_ARM_PLANT);
          simRef.current = sim;
        } else {
          const mod = await import('@/lib/pid-sim/physics/elevatorSim');
          if (cancelled) return;
          if (typeof mod.ElevatorSim !== 'function') {
            throw new Error('ElevatorSim export missing from physics module');
          }
          const sim = new mod.ElevatorSim(vendor!);
          sim.setPlant(REFERENCE_PLANT);
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
  }, [vendor, mechanism, flushCodePatch]);

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

  const initSession = useCallback((m: MechanismType, v: Vendor) => {
    const initial: TuningConfig = { ...DEFAULT_TUNING, setpoint: defaultSetpoint(m) };
    setMechanism(m);
    setVendor(v);
    if (m === 'arm') {
      setCode(getArmTemplateForVendor(v, initial, REFERENCE_ARM_PLANT));
      setRobotCode(getArmRobotTemplateForVendor(v));
    } else {
      setCode(getTemplateForVendor(v, initial, REFERENCE_PLANT));
      setRobotCode(getRobotTemplateForVendor(v));
    }
    setConfig(initial);
    setGuideMode('codeTour');
    setCodeTourStep(0);
    setTuningStep(0);
    setEditorTab('subsystem');
    lastAutoTabStep.current = -1;
    lastElevatorPlantRef.current = null;
    lastArmPlantRef.current = null;
    setSimRunning(false);
    setTeleopEnabled(false);
    setLiveTuning(false);
    simRef.current?.reset();
  }, []);

  useEffect(() => {
    const sim = simRef.current;
    if (!sim || !mechanism) return;

    if (mechanism === 'arm') {
      if (lastArmPlantRef.current && armPlantsEqual(lastArmPlantRef.current, armPlantConfig)) {
        return;
      }
      lastArmPlantRef.current = armPlantConfig;
      (sim as import('@/lib/pid-sim/physics/armSim').ArmSim).setPlant(armPlantConfig);
    } else {
      if (
        lastElevatorPlantRef.current &&
        plantsEqual(lastElevatorPlantRef.current, elevatorPlantConfig)
      ) {
        return;
      }
      lastElevatorPlantRef.current = elevatorPlantConfig;
      (sim as import('@/lib/pid-sim/physics/elevatorSim').ElevatorSim).setPlant(
        elevatorPlantConfig,
      );
    }
  }, [mechanism, elevatorPlantConfig, armPlantConfig]);

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
      if (fraction === undefined || !mechanism) return;
      const rot =
        mechanism === 'arm'
          ? armTravelFractionToSetpointRot(fraction, armPlantConfig)
          : travelFractionToSetpointRot(fraction, elevatorPlantConfig);
      applySetpointRot(rot);
    },
    [mechanism, armPlantConfig, elevatorPlantConfig, applySetpointRot],
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
    if (h.constName === 'plant') {
      return mechanism === 'arm' ? findArmPlantSectionLine(code) : findPlantSectionLine(code);
    }
    if (h.constName === 'maxVelocity') return findConstLine(code, 'kMaxVelocity');
    if (h.constName === 'maxAccel') return findConstLine(code, 'kMaxAccel');
    return findConstLine(code, FIELD_TO_CONST[h.constName]);
  }, [guideMode, editorTab, codeTour, codeTourAid, code, mechanism]);

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

  const subsystemFileName = mechanism === 'arm' ? 'ArmSubsystem.java' : 'ElevatorSubsystem.java';
  const mechanismLabel = mechanism === 'arm' ? 'Arm' : 'Elevator';

  if (!mechanism || !vendor) {
    return <PidSimLanding onStart={initSession} />;
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
          <span className="pid-badge">{mechanismLabel}</span>
          <span className="pid-badge">{vendor === 'rev' ? 'REV Spark MAX' : 'CTRE Talon FX'}</span>
          <button
            type="button"
            className="pid-link-btn"
            onClick={() => {
              stopSim();
              setMechanism(null);
              setVendor(null);
              setCode('');
              setRobotCode('');
            }}
          >
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
              onSubsystemChange={handleCodeChange}
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
