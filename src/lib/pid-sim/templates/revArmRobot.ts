export function revArmRobotTemplate(): string {
  return `// Robot.java — runs subsystems during teleop (Timed Robot template)
// Read-only reference: this is where your arm subsystem is used.

package frc.robot;

import edu.wpi.first.wpilibj.TimedRobot;
import frc.robot.subsystems.ArmSubsystem;

public class Robot extends TimedRobot {

  private final ArmSubsystem m_arm = new ArmSubsystem();

  @Override
  public void teleopPeriodic() {
    // During driver control, command the arm to its setpoint.
    m_arm.goToSetpoint();
  }

  // Command Robot equivalent (RobotContainer constructor — bind once at init):
  //   CommandXboxController driver = new CommandXboxController(0);
  //   driver.a().onTrue(new InstantCommand(() -> m_arm.goToTravelFraction(0.0), m_arm));
  //   driver.b().onTrue(new InstantCommand(() -> m_arm.goToTravelFraction(0.25), m_arm));
  //   driver.x().onTrue(new InstantCommand(() -> m_arm.goToTravelFraction(0.50), m_arm));
  //   driver.y().onTrue(new InstantCommand(() -> m_arm.goToTravelFraction(0.75), m_arm));
  //   driver.rightBumper().onTrue(new InstantCommand(() -> m_arm.goToTravelFraction(1.0), m_arm));
  // Trigger.onTrue() schedules on rising edge (button press). See WPILib "Binding Commands to Triggers".
  //
  // Browser sim: Teleop Presets panel maps Q/W/E/R/T to soft-limit travel fractions.

  @Override
  public void robotPeriodic() {
    // Runs every 20 ms in all modes — useful for telemetry.
  }
}
`;
}
