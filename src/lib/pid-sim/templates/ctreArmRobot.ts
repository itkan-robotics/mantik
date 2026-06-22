export function ctreArmRobotTemplate(): string {
  return `// Robot.java — runs subsystems during teleop (Timed Robot template)
// Read-only reference: this is where your arm subsystem is used.

package frc.robot;

import edu.wpi.first.wpilibj.TimedRobot;
import frc.robot.subsystems.ArmSubsystem;

public class Robot extends TimedRobot {

  private final ArmSubsystem m_arm = new ArmSubsystem();

  @Override
  public void teleopPeriodic() {
    m_arm.goToSetpoint().schedule();
  }

  // Command Robot equivalent (RobotContainer):
  //   driver.a().onTrue(m_arm.goToTravelFraction(0.0));
  // Browser sim: Teleop Presets Q/W/E/R/T map to the same travel fractions.

  @Override
  public void robotPeriodic() {}
}
`;
}
