import type { FlywheelPlantConfig, TuningConfig } from '../types';
import { flywheelPlantConstantsBlock } from './flywheelPlantConstants';

export function ctreFlywheelTemplate(config: TuningConfig, plant: FlywheelPlantConfig): string {
  return `// CTRE Talon FX flywheel subsystem
// Edit tuning constants below, then run the simulation.
// Velocity setpoint is in MOTOR ROTATIONS PER SECOND (encoder units).

package frc.robot.subsystems;

import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.VelocityVoltage;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.signals.NeutralModeValue;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

public class FlywheelSubsystem extends SubsystemBase {

${flywheelPlantConstantsBlock(plant)}

  // --- TUNING: Slot0 PID (V/(rot/s), V·s/(rot/s), V/(rot/s²)) ---
  private static final double kP = ${config.kP};
  private static final double kI = ${config.kI};
  private static final double kD = ${config.kD};

  // --- TUNING: feedforward (no kG on flywheels) ---
  private static final double kS = ${config.kS};
  private static final double kG = ${config.kG};
  private static final double kV = ${config.kV};
  private static final double kA = ${config.kA};

  // --- TUNING: motion limits (motor rot/s — vendor API parity) ---
  private static final double kMaxVelocity = ${config.maxVelocity};
  private static final double kMaxAccel = ${config.maxAccel};

  // --- TUNING: velocity setpoint (motor rot/s) ---
  private static final double kSetpoint = ${config.setpoint};

  private final TalonFX m_motor = new TalonFX(2);
  private final VelocityVoltage m_request = new VelocityVoltage(0);

  public FlywheelSubsystem() {
    TalonFXConfiguration cfg = new TalonFXConfiguration();
    cfg.MotorOutput.NeutralMode = NeutralModeValue.Coast;
    cfg.Slot0.kP = kP;
    cfg.Slot0.kI = kI;
    cfg.Slot0.kD = kD;
    cfg.Slot0.kS = kS;
    cfg.Slot0.kV = kV;
    cfg.Slot0.kA = kA;
    cfg.MotionMagic.MotionMagicCruiseVelocity = kMaxVelocity;
    cfg.MotionMagic.MotionMagicAcceleration = kMaxAccel;
    m_motor.getConfigurator().apply(cfg);
  }

  /** Run flywheel at configured velocity setpoint (motor rot/s). */
  public void runAtSetpoint() {
    m_motor.setControl(m_request.withVelocity(kSetpoint));
  }

  /** Set velocity to a fraction of max (0 = stop, 1 = full speed). */
  public void runAtVelocityFraction(double fraction) {
    double clamped = Math.max(0, Math.min(1, fraction));
    double maxMotorRotPerSec = (kMaxRpm / 60.0) * kGearRatio;
    m_motor.setControl(m_request.withVelocity(clamped * maxMotorRotPerSec));
  }

  @Override
  public void periodic() {
    // On a real robot, publish velocity telemetry to Phoenix Tuner / AdvantageScope here.
  }
}
`;
}
