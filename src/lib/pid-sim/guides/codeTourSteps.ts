import type { TuningConfig } from '../types';
import type { GuidePrerequisite } from './prerequisites';

export type CodeFile = 'subsystem' | 'robot';

export interface CodeTourStep {
  id: string;
  title: string;
  body: string;
  bodyExtra?: string;
  prompt?: string;
  highlight?: { constName?: keyof TuningConfig | 'elastic' | 'plant'; file?: CodeFile; lineHint?: string };
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
    id: 'plant',
    title: 'Simulation plant (optional)',
    body: 'The PLANT block at the top defines the simulated mechanism — mass, travel range, start height, gearing, and drum size. Only the browser physics read these values; they are not sent to a real SparkMax or Talon FX.',
    bodyExtra:
      'You can change them to match your robot or try "what if" scenarios. The defaults mirror a typical practice elevator. Most students should leave them alone until you have a baseline kG and kP tune on the default plant — editing mass or gearing changes hold voltage and how aggressive kP feels.',
    prompt: 'Find kMassLbs and kGearRatio. Which would you change if the carriage got heavier?',
    highlight: { file: 'subsystem', constName: 'plant' },
  },
  {
    id: 'pid',
    title: 'PID gains',
    body: 'PID is feedback control in motor rotations. kP (proportional) is in V/rot — larger position error means more motor output. kI (integral) fixes steady-state error in V·s/rot. kD (derivative) in V/(rot/s) dampens oscillation.',
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
    body: 'The setpoint is the target position in motor rotations — the same unit the SparkMax or Talon FX encoder reports. The browser sim converts to meters for the Mechanism view and TraceView.',
    bodyExtra:
      'During kG tuning, teams often use an unreasonable setpoint — outside normal travel — so gravity dominates and you can see whether kG holds the carriage still. After kG is set, move to a reachable setpoint to tune kP.\n\nWith teleop and the sim running, Teleop Presets jump kSetpoint to 0%, 25%, 50%, 75%, or 100% of plant travel. Default keys are Q W E R T (letters only — click a preset to rebind). On a Command Robot, the same idea is a gamepad trigger bound with Trigger.onTrue() to call goToTravelFraction().',
    prompt: 'Find where the target height is defined. What unit is it in?',
    highlight: { file: 'subsystem', constName: 'setpoint' },
    learnMore: [
      { label: 'Elevator tuning practice', href: '/frc/pid-tuning-practice-elevator' },
      { label: 'Binding Commands to Triggers', href: '/frc/robot-container-and-bindings' },
    ],
  },
  {
    id: 'limits',
    title: 'Motion limits',
    body: 'Max velocity and max acceleration cap how aggressively the mechanism moves. Values are in motor rotations per second and rotations per second squared — matching vendor tuner units.',
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
      'Open the Robot.java tab. Notice how goToSetpoint() is called during teleop — that matches running your elevator while the Driver Station is in Teleoperated mode.\n\nOn a Command Robot, bindings live in RobotContainer: controller buttons are Triggers, and Trigger.onTrue() schedules a command once per press — like binding a preset height to a gamepad button. The commented block in Robot.java shows that pattern. This sim uses the Teleop Presets row (Q/W/E/R/T by default) as a keyboard stand-in for those triggers.',
    prompt: 'In Robot.java, when does the elevator get commanded? How would a gamepad button differ?',
    highlight: { file: 'robot', lineHint: 'teleopPeriodic' },
    learnMore: [
      { label: 'Introduction to motors — Robot.java lifecycle', href: '/frc/intro-to-motors' },
      { label: 'Binding Commands to Triggers', href: 'https://docs.wpilib.org/en/stable/docs/software/commandbased/binding-commands-to-triggers.html' },
      { label: 'RobotContainer & Bindings', href: '/frc/robot-container-and-bindings' },
    ],
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
      'Live Tuning is only required if you want to edit SpringTune sliders. Code edits in the editor always apply to the simulation. Enable Teleoperated now before continuing. Teleop Presets (Q/W/E/R/T) only fire while teleop and the sim are both active.',
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
