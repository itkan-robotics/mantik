import type { TuningConfig } from '../types';
import type { GuidePrerequisite } from './prerequisites';
import { TUNING_REFERENCE } from '../reference/elevatorReference';

export interface TuningGuideStep {
  id: string;
  title: string;
  body: string;
  prompt?: string;
  checklist?: string[];
  referenceHint?: string;
  learnMore?: { label: string; href: string }[];
  highlight?: { field?: keyof TuningConfig; mechanism?: boolean; graph?: boolean };
  needsSim?: boolean;
  advancePrerequisites?: GuidePrerequisite[];
}

export const TUNING_GUIDE_STEPS: TuningGuideStep[] = [
  {
    id: 'prepare',
    title: 'Start the simulation',
    body: 'Enable Teleoperated in the Sim Controls bar, then click Run Simulation. Watch the Mechanism view and line graph begin updating.',
    prompt: 'Why is Teleoperated required before running?',
    checklist: ['Teleoperated enabled', 'Code has no errors', 'Simulation running'],
    advancePrerequisites: ['teleop', 'simRunning', 'validCode'],
  },
  {
    id: 'unreasonable-setpoint',
    title: 'Set an unreasonable setpoint',
    body: 'Change the setpoint to a value the elevator cannot reach — above its normal travel range in motor rotations. Find kSetpoint in code or use SpringTune (with Live Tuning on). The Mechanism view still shows height in meters.',
    prompt: 'Where did you change the setpoint? Is it outside the mechanism limits shown in the Mechanism view?',
    highlight: { field: 'setpoint', mechanism: true },
    needsSim: true,
    advancePrerequisites: ['simRunning'],
  },
  {
    id: 'tune-kg',
    title: 'Tune kG',
    body: 'Start with a small kG. Increase until the carriage creeps upward, then reduce until position holds steady. Watch the Mechanism view — the carriage should not drift. Changes apply live; you do not need to restart the sim.',
    prompt: 'What is the smallest kG that keeps the carriage from moving?',
    referenceHint: TUNING_REFERENCE.kG.hint,
    checklist: [
      'Carriage stays at one height in Mechanism view',
      'Position graph stays flat',
      'Velocity stays near zero',
    ],
    highlight: { field: 'kG', mechanism: true, graph: true },
    needsSim: true,
    advancePrerequisites: ['simRunning'],
  },
  {
    id: 'valid-setpoint',
    title: 'Set a valid setpoint',
    body: 'Move the setpoint to a reachable height in motor rotations — inside the travel range shown in the Mechanism view (displayed in meters).',
    prompt: 'Pick a reachable height. Where did you set it?',
    highlight: { field: 'setpoint', mechanism: true },
    needsSim: true,
    advancePrerequisites: ['simRunning'],
  },
  {
    id: 'tune-kp',
    title: 'Tune kP',
    body: 'Start with a low kP (try 0.1). Increase until the carriage reaches the setpoint quickly with a sharp rise and flat hold in the graph. Double kP each time until the response looks rectangular.\n\nGravity assists downward moves — for the same height change, descent should finish faster than ascent once kP is high enough.\n\nThis browser sim uses motor-rotation PID (V/rot), matching SparkMax and Talon FX encoder units. Setpoint and motion limits in code are also in motor rotations. TraceView and Mechanism view show height in meters.',
    prompt: 'Does the position trace look rectangular — sharp up, flat across?',
    referenceHint: TUNING_REFERENCE.kP.hint,
    checklist: [
      'Carriage reaches setpoint quickly',
      'Position holds flat at target',
      'No long oscillation or slow taper',
    ],
    highlight: { field: 'kP', mechanism: true, graph: true },
    needsSim: true,
    advancePrerequisites: ['simRunning'],
  },
  {
    id: 'motion-profiling',
    title: 'Try trapezoidal motion profiling',
    body: 'During kP tuning, max velocity and acceleration were 0 — the setpoint jumped instantly. That works for learning position hold, but sharp steps limit how high you can push kP before overshoot or oscillation.\n\nTrapezoidal motion profiling smooths the path: the controller ramps up, cruises, then ramps down instead of stepping. Set non-zero kMaxVelocity (rot/s) and kMaxAccel (rot/s²) in ElevatorSubsystem.java or SpringTune. Watch TraceView — the velocity trace should look like a trapezoid.\n\nWith profiling enabled, you can often raise kP further than during step moves. Feedforward helps during the move: kV (V/(rot/s)) during cruise, kA (V/(rot/s²)) during accel and decel. Tune kV on SpringTune; edit kA in code.\n\nStart with conservative limits, then increase velocity and acceleration until the position trace stays sharp without heavy overshoot.',
    prompt: 'Why can you push kP higher with profiling than with a step setpoint?',
    referenceHint: TUNING_REFERENCE.maxMotion.hint,
    checklist: [
      'Non-zero max velocity and max acceleration set',
      'Velocity trace looks trapezoidal in TraceView',
      'Position reaches setpoint cleanly without heavy overshoot',
    ],
    learnMore: [{ label: 'Trapezoidal motion profiling', href: '/frc/trapezoidal-motion-profiling' }],
    highlight: { field: 'maxVelocity', mechanism: true, graph: true },
    needsSim: true,
    advancePrerequisites: ['simRunning'],
  },
  {
    id: 'complete',
    title: 'Next steps',
    body: 'You practiced the same kG → kP workflow used with Elastic and AdvantageScope on a real robot. kG is plant-specific and depends on your motor vendor (REV NEO vs CTRE Kraken). kP is in volts per motor rotation — the same unit family as vendor tuners.\n\nMotion profiling maps to MAXMotion on SparkMax and Motion Magic on Talon FX — the same kMaxVelocity and kMaxAccel constants in your subsystem code.\n\nFor full WPILib + YAMS simulation on your machine, clone mantik-pid-practice (Tier 2 in the setup lesson).',
  },
];
