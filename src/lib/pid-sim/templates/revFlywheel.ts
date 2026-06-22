import type { FlywheelPlantConfig, TuningConfig } from '../types';
import { flywheelPlantConstantsBlock } from './flywheelPlantConstants';

export function revFlywheelTemplate(config: TuningConfig, plant: FlywheelPlantConfig): string {
  return `// REV Spark MAX flywheel subsystem
// Edit tuning constants below, then run the simulation.
// Velocity setpoint is in MOTOR ROTATIONS PER SECOND (encoder units).

package frc.robot.subsystems;

import com.revrobotics.spark.SparkMax;
import com.revrobotics.spark.SparkLowLevel.MotorType;
import com.revrobotics.spark.SparkClosedLoopController;
import com.revrobotics.spark.config.SparkMaxConfig;
import com.revrobotics.spark.config.SparkBaseConfig.IdleMode;
import com.revrobotics.spark.SparkBase.ResetMode;
import com.revrobotics.spark.SparkBase.PersistMode;
import com.revrobotics.spark.ClosedLoopController.ControlType;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

public class FlywheelSubsystem extends SubsystemBase {

${flywheelPlantConstantsBlock(plant)}

  // --- TUNING: closed-loop PID (V/(rot/s), V·s/(rot/s), V/(rot/s²)) ---
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

  private final SparkMax m_motor = new SparkMax(2, MotorType.kBrushless);
  private final SparkClosedLoopController m_pid = m_motor.getClosedLoopController();

  public FlywheelSubsystem() {
    SparkMaxConfig cfg = new SparkMaxConfig();
    cfg.idleMode(IdleMode.kCoast);
    cfg.closedLoop.p(kP).i(kI).d(kD);
    cfg.closedLoop.maxMotion.maxVelocity(kMaxVelocity).maxAcceleration(kMaxAccel);
    m_motor.configure(cfg, ResetMode.kResetSafeParameters, PersistMode.kPersistParameters);
  }

  /** Run flywheel at configured velocity setpoint (motor rot/s). */
  public void runAtSetpoint() {
    m_pid.setReference(kSetpoint, ControlType.kVelocity);
  }

  /** Set velocity to a fraction of max (0 = stop, 1 = full speed). */
  public void runAtVelocityFraction(double fraction) {
    double clamped = Math.max(0, Math.min(1, fraction));
    double maxMotorRotPerSec = (kMaxRpm / 60.0) * kGearRatio;
    m_pid.setReference(clamped * maxMotorRotPerSec, ControlType.kVelocity);
  }

  @Override
  public void periodic() {
    // On a real robot, publish velocity telemetry to SmartDashboard / AdvantageScope here.
  }
}
`;
}
