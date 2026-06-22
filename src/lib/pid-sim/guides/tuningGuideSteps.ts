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
    body: 'Change the setpoint to a height the elevator cannot reach — above its normal travel range. Find kSetpoint in code or use SpringTune (with Live Tuning on).',
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
    body: 'Move the setpoint to a height inside the elevator travel range — between the hard limits shown in the Mechanism view.',
    prompt: 'Pick a reachable height. Where did you set it?',
    highlight: { field: 'setpoint', mechanism: true },
    needsSim: true,
    advancePrerequisites: ['simRunning'],
  },
  {
    id: 'tune-kp',
    title: 'Tune kP',
    body: 'Start with a low kP. Increase until the carriage reaches the setpoint quickly with a sharp rise and flat hold in the graph. Double kP each time until the response looks rectangular.\n\nThis sim uses the same numeric scale as SparkMax and Phoenix tuners in the lesson videos — well-tuned kP is often in the 12–32 range for this plant.',
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
    id: 'complete',
    title: 'Next steps',
    body: 'You practiced the same kG → kP workflow used with Elastic and AdvantageScope on a real robot. kG values transfer closely between this sim and WPILib; kP numbers on vendor tuners use a different scale than this browser sim.\n\nFor full WPILib + YAMS simulation on your machine, clone mantik-pid-practice (Tier 2 in the setup lesson).',
  },
];
