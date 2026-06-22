import type { TuningConfig } from '../../types';
import type { CodeTourStep } from '../codeTourSteps';

export const ARM_CODE_TOUR_STEPS: CodeTourStep[] = [
  {
    id: 'overview',
    title: 'What you are looking at',
    body: 'This file defines an arm subsystem — the code that runs one mechanism on your robot. Arms use position control: the motor tries to reach a target angle and hold it. Gravity changes with angle, so arm tuning is harder than an elevator.',
    bodyExtra:
      'Constants marked with TUNING comments are the values you change during live tuning on a real robot. On hardware, the same numbers appear in Phoenix Tuner, REV Hardware Client, or Elastic widgets.',
    prompt: 'Scan the file. Which sections are marked for tuning?',
    highlight: { file: 'subsystem', lineHint: 'TUNING' },
    learnMore: [{ label: 'Arm tuning practice', href: '/frc/pid-tuning-practice-arm' }],
  },
  {
    id: 'plant',
    title: 'Simulation plant (optional)',
    body: 'The PLANT block defines the simulated arm — mass, length, gearing, start angle, and soft limits. Only the browser physics read these values; they are not sent to a real SparkMax or Talon FX.',
    bodyExtra:
      'Hard limits at ±90° are fixed in browser physics and cannot be edited here. Soft limits (default ±60°) can be changed to match your robot. Leave defaults until you have a baseline kG and kP tune.',
    prompt: 'Find kSoftMinDeg and kSoftMaxDeg. What happens if you widen the soft range?',
    highlight: { file: 'subsystem', constName: 'plant' },
  },
  {
    id: 'pid',
    title: 'PID gains',
    body: 'PID is feedback control in motor rotations. kP (proportional) is in V/rot — larger position error means more motor output. kI (integral) fixes steady-state error in V·s/rot. kD (derivative) in V/(rot/s) dampens oscillation.',
    bodyExtra:
      'On a real robot, PID can run on the roboRIO or on the motor controller itself. This template uses on-controller PID, which runs faster and frees roboRIO CPU.',
    prompt: 'Find kP, kI, and kD. What does each one respond to?',
    highlight: { file: 'subsystem', constName: 'kP' },
    learnMore: [{ label: 'PID Control', href: '/frc/frc-pid-control' }],
  },
  {
    id: 'feedforward',
    title: 'Feedforward',
    body: 'Feedforward adds motor output before PID corrects error. For arms, gravity feedforward uses kG multiplied by cos(angle): horizontal needs the most help; vertical needs almost none. kS (static friction) helps at rest. kV and kA help during motion profiling.',
    bodyExtra:
      'Tune kG first at your working setpoint angle. The position trace should stay flat before you move on to kP. kS and kV often stay at zero until later in the tune.',
    prompt: 'Locate kG. Why does an arm need cos(angle) in gravity feedforward?',
    highlight: { file: 'subsystem', constName: 'kG' },
    learnMore: [
      { label: 'PID Control — feedforward tuning', href: '/frc/frc-pid-control' },
      { label: 'Arm tuning practice', href: '/frc/pid-tuning-practice-arm' },
    ],
  },
  {
    id: 'setpoint',
    title: 'Setpoint',
    body: 'The setpoint is the target position in motor rotations — the same unit the SparkMax or Talon FX encoder reports. The browser sim converts to degrees for the Mechanism view and TraceView.',
    bodyExtra:
      'Pick a setpoint inside the soft limits shown in the Mechanism view (dashed red arcs). Avoid commanding too close to soft limits during tuning — simulation can glitch near boundaries.\n\nWith teleop and the sim running, Teleop Presets jump kSetpoint to 0%, 25%, 50%, 75%, or 100% of soft travel. Default keys are Q W E R T (letters only — click a preset to rebind). On a Command Robot, bind Trigger.onTrue() to call goToTravelFraction().',
    prompt: 'Find kSetpoint. What unit is it in? How does that relate to degrees on the graph?',
    highlight: { file: 'subsystem', constName: 'setpoint' },
    learnMore: [
      { label: 'Arm tuning practice', href: '/frc/pid-tuning-practice-arm' },
      { label: 'Binding Commands to Triggers', href: '/frc/robot-container-and-bindings' },
    ],
  },
  {
    id: 'limits',
    title: 'Motion limits',
    body: 'Max velocity and max acceleration cap how aggressively the arm moves. Values are in motor rotations per second and rotations per second squared — matching vendor tuner units.',
    bodyExtra:
      'The arm tuning lesson video may show degrees per second — convert using your gear ratio. Motion profiling uses these limits to generate smooth paths and reduce overshoot near hard stops.',
    prompt: 'What do kMaxVelocity and kMaxAccel limit?',
    highlight: { file: 'subsystem', constName: 'maxVelocity' },
    learnMore: [{ label: 'Trapezoidal motion profiling', href: '/frc/trapezoidal-motion-profiling' }],
  },
  {
    id: 'robot',
    title: 'Robot.java integration',
    body: 'Subsystems define what the mechanism can do. Robot.java decides when subsystems run. During teleop, teleopPeriodic() runs every 20 ms and is where you command mechanisms based on driver input.',
    bodyExtra:
      'Open the Robot.java tab. Notice how goToSetpoint() is called during teleop.\n\nOn a Command Robot, bindings live in RobotContainer: controller buttons are Triggers, and Trigger.onTrue() schedules a command once per press. The commented block in Robot.java shows that pattern. Teleop Presets (Q/W/E/R/T) are a keyboard stand-in for those triggers.',
    prompt: 'In Robot.java, when does the arm get commanded? How would a gamepad button differ?',
    highlight: { file: 'robot', lineHint: 'teleopPeriodic' },
    learnMore: [
      { label: 'Introduction to motors — Robot.java lifecycle', href: '/frc/intro-to-motors' },
      {
        label: 'Binding Commands to Triggers',
        href: 'https://docs.wpilib.org/en/stable/docs/software/commandbased/binding-commands-to-triggers.html',
      },
      { label: 'RobotContainer & Bindings', href: '/frc/robot-container-and-bindings' },
    ],
  },
  {
    id: 'elastic',
    title: 'SpringTune panel',
    body: 'On a real robot, Elastic is a dashboard that connects over NetworkTables and lets you adjust tuning constants with sliders. SpringTune in this app works the same way for the browser simulation.',
    bodyExtra:
      'Each slider maps to a constant in your code. When Live Tuning is enabled, moving a slider updates the value immediately. Enable Live Tuning now so you can try one slider before moving on.',
    prompt: 'Compare a constant in code with its matching slider in SpringTune.',
    highlight: { file: 'subsystem', constName: 'elastic' },
    learnMore: [{ label: 'Elastic basics', href: '/frc/elastic-basics' }],
    advancePrerequisites: ['liveTuning'],
  },
  {
    id: 'sim-controls',
    title: 'Running the simulation',
    body: 'Teleoperated matches driver-controlled mode on a real robot — the sim will not run until it is enabled. That mirrors how tuning happens during teleop on hardware.',
    bodyExtra:
      'Live Tuning is only required for SpringTune sliders. Code edits always apply to the simulation. Enable Teleoperated now. Teleop Presets (Q/W/E/R/T) only fire while teleop and the sim are both active.',
    prompt: 'Find Teleoperated and Live Tuning in the Sim Controls bar.',
    learnMore: [{ label: 'PID tuning practice setup', href: '/frc/pid-tuning-practice-setup' }],
    advancePrerequisites: ['teleop'],
  },
  {
    id: 'ready',
    title: 'Ready to tune',
    body: 'You know where the constants live, how Robot.java calls the subsystem, and how Sim Controls relate to a real setup. The Tuning Guide walks through kG then kP then motion profiling — the same order as the arm tuning lesson.',
    bodyExtra:
      'Keep Teleoperated enabled when you run the sim. Use the Mechanism view in BenchScope to watch the arm angle and TraceView for position and velocity in degrees.',
    learnMore: [{ label: 'Arm tuning practice', href: '/frc/pid-tuning-practice-arm' }],
    advancePrerequisites: ['teleop'],
  },
];
