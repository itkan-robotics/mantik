import type { TuningConfig } from '../../types';
import type { TuningGuideStep } from '../tuningGuideSteps';
import { ARM_TUNING_REFERENCE } from '../../reference/armReference';

export const ARM_TUNING_GUIDE_STEPS: TuningGuideStep[] = [
  {
    id: 'prepare',
    title: 'Start the simulation',
    body: 'Enable Teleoperated in the Sim Controls bar, then click Run Simulation. Watch the Mechanism view and line graph begin updating.',
    prompt: 'Why is Teleoperated required before running?',
    checklist: ['Teleoperated enabled', 'Code has no errors', 'Simulation running'],
    advancePrerequisites: ['teleop', 'simRunning', 'validCode'],
  },
  {
    id: 'setpoint-in-range',
    title: 'Set a valid setpoint',
    body: 'Change the setpoint to a position inside the arm soft limits — between the dashed red arcs in the Mechanism view. Find kSetpoint in code or use SpringTune (with Live Tuning on). TraceView shows degrees.',
    prompt: 'Where did you set the setpoint? Is it inside the soft limits?',
    highlight: { field: 'setpoint', mechanism: true },
    needsSim: true,
    advancePrerequisites: ['simRunning'],
  },
  {
    id: 'tune-kg',
    title: 'Tune kG',
    body: 'Start with a small kG. Increase until the arm creeps, then reduce until position holds steady at your setpoint angle. Use binary search for 2–3 decimal places. Watch for wiggles — if they appear, use the lower value.\n\nRemember: feedforward applies kG · cos(angle). Tune at the angle you plan to hold.',
    prompt: 'What is the smallest kG that keeps the arm still at your setpoint?',
    referenceHint: ARM_TUNING_REFERENCE.kG.hint,
    checklist: [
      'Arm stays at setpoint angle in Mechanism view',
      'Position graph stays flat',
      'Velocity stays near zero',
    ],
    highlight: { field: 'kG', mechanism: true, graph: true },
    needsSim: true,
    advancePrerequisites: ['simRunning'],
  },
  {
    id: 'tune-kp',
    title: 'Tune kP',
    body: 'Start with a low kP (try 0.1). Command a reachable setpoint if needed. Double kP until the arm reaches the target with a sharp rise and flat hold. Watch for overshoot — it is dangerous near hard stops.\n\nThis browser sim uses motor-rotation PID (V/rot). TraceView and Mechanism view show degrees.',
    prompt: 'Does the position trace look rectangular — sharp up, flat across?',
    referenceHint: ARM_TUNING_REFERENCE.kP.hint,
    checklist: [
      'Arm reaches setpoint quickly',
      'Position holds flat at target',
      'Overshoot is minimal',
    ],
    highlight: { field: 'kP', mechanism: true, graph: true },
    needsSim: true,
    advancePrerequisites: ['simRunning'],
  },
  {
    id: 'motion-profiling',
    title: 'Try trapezoidal motion profiling',
    body: 'During kP tuning, max velocity and acceleration were 0 — the setpoint jumped instantly. Motion profiling smooths the path so you can push kP further without overshoot.\n\nSet non-zero kMaxVelocity (rot/s) and kMaxAccel (rot/s²). Max acceleration is usually higher than max velocity so the arm reaches cruise speed in under one second. Watch TraceView — velocity should look trapezoidal.\n\nFine-tune kP and profile limits together until motion is sharp up, flat hold, sharp down with little overshoot.',
    prompt: 'Why does profiling help prevent overshoot near hard stops?',
    referenceHint: ARM_TUNING_REFERENCE.maxMotion.hint,
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
    body: 'You practiced kG → kP → motion profiling for an arm — the same workflow as Elastic and AdvantageScope on a real robot. kG uses cos(angle) feedforward; kP is in volts per motor rotation.\n\nFor full WPILib + YAMS simulation on your machine, clone mantik-pid-practice (Tier 2 in the setup lesson).',
  },
];
