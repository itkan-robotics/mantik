export function revFlywheelRobotTemplate(): string {
  return `// Robot.java — runs subsystems during teleop (Timed Robot template)
// Read-only reference: this is where your flywheel subsystem is used.

package frc.robot;

import edu.wpi.first.wpilibj.TimedRobot;
import frc.robot.subsystems.FlywheelSubsystem;

public class Robot extends TimedRobot {

  private final FlywheelSubsystem m_flywheel = new FlywheelSubsystem();

  @Override
  public void teleopPeriodic() {
    // During driver control, run the flywheel at the configured velocity setpoint.
    m_flywheel.runAtSetpoint();
  }

  // Command Robot equivalent (RobotContainer constructor — bind once at init):
  //   CommandXboxController driver = new CommandXboxController(0);
  //   driver.a().onTrue(new InstantCommand(() -> m_flywheel.runAtVelocityFraction(0.0), m_flywheel));
  //   driver.b().onTrue(new InstantCommand(() -> m_flywheel.runAtVelocityFraction(0.25), m_flywheel));
  //   driver.x().onTrue(new InstantCommand(() -> m_flywheel.runAtVelocityFraction(0.50), m_flywheel));
  //   driver.y().onTrue(new InstantCommand(() -> m_flywheel.runAtVelocityFraction(0.75), m_flywheel));
  //   driver.rightBumper().onTrue(new InstantCommand(() -> m_flywheel.runAtVelocityFraction(1.0), m_flywheel));
  //
  // Browser sim: Teleop Presets panel maps Q/W/E/R/T to velocity fractions of max RPM.

  @Override
  public void robotPeriodic() {
    // Runs every 20 ms in all modes — useful for telemetry.
  }
}
`;
}
