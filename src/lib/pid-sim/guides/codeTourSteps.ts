import type { TuningConfig } from '../types';
import type { GuidePrerequisite } from './prerequisites';

export type CodeFile = 'subsystem' | 'robot';

export interface CodeTourStep {
  id: string;
  title: string;
  body: string;
  bodyExtra?: string;
  prompt?: string;
  highlight?: { constName?: keyof TuningConfig | 'elastic'; file?: CodeFile; lineHint?: string };
  learnMore?: { label: string; href: string }[];
  advancePrerequisites?: GuidePrerequisite[];
}

export const CODE_TOUR_STEPS: CodeTourStep[] = [
  {
    id: 'overview',
    title: 'What you are looking at',
    body: 'This file defines an elevator subsystem — the code that runs one mechanism on your robot. Elevators use position control: the motor tries to reach a target height and hold it against gravity.',
    bodyExtra:
      'Constants marked with TUNING comments are the values you change during live tuning on a real robot. On hardware, the same numbers appear in Phoenix Tuner, REV Hardware Client, or Elastic widgets.',
    prompt: 'Scan the file. Which sections are marked for tuning?',
    highlight: { file: 'subsystem', lineHint: 'TUNING' },
    learnMore: [{ label: 'Elevator example', href: '/frc/elevator-example' }],
  },
  {
    id: 'pid',
    title: 'PID gains',
    body: 'PID is feedback control. kP (proportional) reacts to how far you are from the target — larger error means more motor output. kI (integral) reacts to error that builds up over time and can fix small steady-state offsets. kD (derivative) reacts to how fast the error is changing and helps dampen oscillation.',
    bodyExtra:
      'On a real robot, PID can run on the roboRIO (WPILib PIDController) or on the motor controller itself. This template uses on-controller PID, which runs faster and frees roboRIO CPU.',
    prompt: 'Find kP, kI, and kD. What does each one respond to?',
    highlight: { file: 'subsystem', constName: 'kP' },
    learnMore: [{ label: 'PID Control', href: '/frc/frc-pid-control' }],
  },
  {
    id: 'feedforward',
    title: 'Feedforward',
    body: 'Feedforward adds motor output before PID corrects error. It handles forces you can predict — like gravity pulling an elevator down. kG (gravity feedforward) adds output to counteract weight. kS (static friction) helps overcome stiction at rest. kV (velocity feedforward) compensates for motion at speed.',
    bodyExtra:
      'For elevators, kG is tuned first because gravity dominates. You find the smallest kG that holds position without creeping upward. kS and kV often stay at zero until later in the tune.',
    prompt: 'Locate kG. Why might an elevator need gravity feedforward?',
    highlight: { file: 'subsystem', constName: 'kG' },
    learnMore: [
      { label: 'PID Control — feedforward tuning', href: '/frc/frc-pid-control' },
      { label: 'Elevator tuning practice', href: '/frc/pid-tuning-practice-elevator' },
    ],
  },
  {
    id: 'setpoint',
    title: 'Setpoint',
    body: 'The setpoint is the height the elevator tries to reach, in meters. When you command a position on a real robot, the controller compares setpoint to measured height and adjusts motor output.',
    bodyExtra:
      'During kG tuning, teams often use an unreasonable setpoint — a height outside normal travel — so gravity dominates and you can see whether kG holds the carriage still. After kG is set, you move to a reachable setpoint to tune kP.',
    prompt: 'Find where the target height is defined. What unit is it in?',
    highlight: { file: 'subsystem', constName: 'setpoint' },
    learnMore: [{ label: 'Elevator tuning practice', href: '/frc/pid-tuning-practice-elevator' }],
  },
  {
    id: 'limits',
    title: 'Motion limits',
    body: 'Max velocity and max acceleration cap how aggressively the mechanism moves. Without limits, a large kP can slam the elevator to the target and cause mechanical stress or oscillation.',
    bodyExtra:
      'Motion profiling (trapezoid or exponential) uses these limits to generate smooth paths. Even without profiling, setting reasonable caps protects your mechanism during tuning.',
    prompt: 'What do kMaxVelocity and kMaxAccel limit?',
    highlight: { file: 'subsystem', constName: 'maxVelocity' },
    learnMore: [{ label: 'Trapezoidal motion profiling', href: '/frc/trapezoidal-motion-profiling' }],
  },
  {
    id: 'robot',
    title: 'Robot.java integration',
    body: 'Subsystems define what the mechanism can do. Robot.java decides when subsystems run. During teleop, teleopPeriodic() runs every 20 ms and is where you command mechanisms based on driver input or autonomous logic.',
    bodyExtra:
      'Open the Robot.java tab. Notice how goToSetpoint() is called during teleop — that matches running your elevator while the Driver Station is in Teleoperated mode.',
    prompt: 'In Robot.java, when does the elevator get commanded?',
    highlight: { file: 'robot', lineHint: 'teleopPeriodic' },
    learnMore: [{ label: 'Introduction to motors — Robot.java lifecycle', href: '/frc/intro-to-motors' }],
  },
  {
    id: 'elastic',
    title: 'SpringTune panel',
    body: 'On a real robot, Elastic is a dashboard that connects over NetworkTables and lets you adjust tuning constants with sliders. SpringTune in this app works the same way for the browser simulation.',
    bodyExtra:
      'Each slider here maps to a constant in your code. When Live Tuning is enabled, moving a slider updates the value immediately. Enable Live Tuning now so you can try one slider before moving on.',
    prompt: 'Compare a constant in code with its matching slider in SpringTune.',
    highlight: { file: 'subsystem', constName: 'elastic' },
    learnMore: [{ label: 'Elastic basics', href: '/frc/elastic-basics' }],
    advancePrerequisites: ['liveTuning'],
  },
  {
    id: 'sim-controls',
    title: 'Running the simulation',
    body: 'Teleoperated matches driver-controlled mode on a real robot — the sim will not run until it is enabled. That mirrors how tuning happens during teleop on hardware, not during autonomous or disabled.',
    bodyExtra:
      'Live Tuning is only required if you want to edit SpringTune sliders. Code edits in the editor always apply to the simulation. Enable Teleoperated now before continuing.',
    prompt: 'Find Teleoperated and Live Tuning in the Sim Controls bar.',
    learnMore: [{ label: 'PID tuning practice setup', href: '/frc/pid-tuning-practice-setup' }],
    advancePrerequisites: ['teleop'],
  },
  {
    id: 'ready',
    title: 'Ready to tune',
    body: 'You know where the constants live, how Robot.java calls the subsystem, and how Sim Controls relate to a real setup. The Tuning Guide walks through kG then kP using the same method as the elevator tuning lesson.',
    bodyExtra:
      'Keep Teleoperated enabled when you run the sim. Use the Mechanism view in BenchScope to watch the carriage and TraceView for position and velocity.',
    learnMore: [{ label: 'Elevator tuning practice', href: '/frc/pid-tuning-practice-elevator' }],
    advancePrerequisites: ['teleop'],
  },
];
