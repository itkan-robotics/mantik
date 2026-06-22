/** @module elevatorSim — WPILib-faithful elevator control loop wrapper */
import type { PlantConfig, SimSample, TuningConfig } from '../types';
import { REFERENCE_PLANT, tunerKpToPhysics } from '../reference/elevatorReference';
import { getNeo } from './dcMotor';
import { calculateElevatorFeedforward } from './elevatorFeedforward';
import { ElevatorSimPlant } from './elevatorPlant';
import {
  createProfileState,
  stepTrapezoidProfile,
  type ProfileState,
} from './trapezoidProfile';

export const SIM_DT = 0.02;
const BUFFER_SECONDS = 5;
export const MAX_SAMPLES = Math.ceil(BUFFER_SECONDS / SIM_DT);
const MAX_MOTOR_VOLTAGE = 12;

const GAIN_KEYS: (keyof Pick<TuningConfig, 'kP' | 'kI' | 'kD' | 'kS' | 'kG' | 'kV'>)[] = [
  'kP',
  'kI',
  'kD',
  'kS',
  'kG',
  'kV',
];

type SimListener = () => void;

export class ElevatorSim {
  position = REFERENCE_PLANT.startHeightM;
  velocity = 0;
  setpoint = REFERENCE_PLANT.startHeightM;
  private integral = 0;
  private time = 0;
  private samples: SimSample[] = [];
  private running = false;
  private config: TuningConfig | null = null;
  private enabled = false;
  private plantConfig: PlantConfig;
  private plant: ElevatorSimPlant;
  private profile: ProfileState;
  private listeners = new Set<SimListener>();
  private intervalId?: number;
  private latestSample: SimSample | null = null;

  constructor(plant: PlantConfig = REFERENCE_PLANT) {
    this.plantConfig = plant;
    const motor = getNeo(1);
    this.plant = new ElevatorSimPlant(motor, plant, true);
    this.position = plant.startHeightM;
    this.setpoint = plant.startHeightM;
    this.profile = createProfileState(plant.startHeightM);
  }

  subscribe(listener: SimListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) listener();
  }

  setPlant(plant: PlantConfig) {
    this.plantConfig = plant;
    this.plant.setPlant(plant);
  }

  setConfig(config: TuningConfig) {
    const gainsChanged =
      this.config !== null &&
      GAIN_KEYS.some((k) => this.config![k] !== config[k]);

    this.config = config;
    this.setpoint = config.setpoint;

    if (gainsChanged) {
      this.integral = 0;
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  reset() {
    this.plant.setState(this.plantConfig.startHeightM, 0);
    this.position = this.plantConfig.startHeightM;
    this.velocity = 0;
    this.integral = 0;
    this.time = 0;
    this.samples = [];
    this.latestSample = null;
    this.profile = createProfileState(this.plantConfig.startHeightM);
    if (this.config) this.setpoint = this.config.setpoint;
    this.notify();
  }

  getLatest(): SimSample | null {
    return this.latestSample;
  }

  getSamples(): readonly SimSample[] {
    return this.samples;
  }

  step(): SimSample | null {
    if (!this.config || !this.enabled) return null;

    const cfg = this.config;
    this.setpoint = cfg.setpoint;

    this.profile = stepTrapezoidProfile(
      this.profile,
      cfg.setpoint,
      cfg.maxVelocity,
      cfg.maxAccel,
      SIM_DT,
    );

    const error = this.profile.position - this.position;
    this.integral += error * SIM_DT;
    const derivative = -this.velocity;

    const physicsKp = tunerKpToPhysics(cfg.kP);
    const pidOut =
      physicsKp * error + cfg.kI * this.integral + cfg.kD * derivative;
    const ffOut = calculateElevatorFeedforward(
      cfg,
      this.profile.velocity,
      this.profile.acceleration,
    );
    let voltage = pidOut + ffOut;

    voltage = Math.max(-MAX_MOTOR_VOLTAGE, Math.min(MAX_MOTOR_VOLTAGE, voltage));

    this.plant.setInputVoltage(voltage, MAX_MOTOR_VOLTAGE);
    this.plant.update(SIM_DT);
    this.position = this.plant.getPositionMeters();
    this.velocity = this.plant.getVelocityMetersPerSecond();

    this.time += SIM_DT;
    const sample: SimSample = {
      time: this.time,
      position: this.position,
      velocity: this.velocity,
      setpoint: this.profile.position,
      output: voltage,
    };

    this.latestSample = sample;
    this.samples.push(sample);
    if (this.samples.length > MAX_SAMPLES) this.samples.shift();

    this.notify();
    return sample;
  }

  isRunning(): boolean {
    return this.running;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.intervalId = window.setInterval(() => {
      if (!this.running) return;
      this.step();
    }, SIM_DT * 1000);
  }

  stop() {
    this.running = false;
    if (this.intervalId !== undefined) window.clearInterval(this.intervalId);
  }
}
