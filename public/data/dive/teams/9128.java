// Copyright (c) 2021-2026 Littleton Robotics
// http://github.com/Mechanical-Advantage
//
// Use of this source code is governed by a BSD
// license that can be found in the LICENSE file
// at the root directory of this project.

package frc.robot;

import java.util.Optional;

import org.littletonrobotics.junction.networktables.LoggedDashboardChooser;

import com.pathplanner.lib.auto.AutoBuilder;
import com.pathplanner.lib.auto.NamedCommands;
import com.pathplanner.lib.controllers.PPHolonomicDriveController;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.GenericHID;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.InstantCommand;
import edu.wpi.first.wpilibj2.command.ParallelDeadlineGroup;
import edu.wpi.first.wpilibj2.command.WaitCommand;
import edu.wpi.first.wpilibj2.command.button.CommandPS5Controller;
import edu.wpi.first.wpilibj2.command.button.RobotModeTriggers;
import edu.wpi.first.wpilibj2.command.sysid.SysIdRoutine;
import frc.robot.commands.AgitateCommand;
import frc.robot.commands.AutoAlignToHubDuringAuto;
import frc.robot.commands.DistanceBasedShotCommand;
import frc.robot.commands.DriveCommands;
import frc.robot.commands.HubSOTMShotCommand;
import frc.robot.commands.RPMShootCommand;
import frc.robot.commands.SmartShootCommand;
import frc.robot.commands.SotmHeadingOverrideCommand;
import frc.robot.generated.TunerConstants;
import frc.robot.subsystems.conveyor.Conveyor;
import frc.robot.subsystems.drive.Drive;
import frc.robot.subsystems.drive.GyroIO;
import frc.robot.subsystems.drive.GyroIOPigeon2;
import frc.robot.subsystems.drive.ModuleIO;
import frc.robot.subsystems.drive.ModuleIOSim;
import frc.robot.subsystems.drive.ModuleIOTalonFX;
import frc.robot.subsystems.intake.Intake;
import frc.robot.subsystems.shooter.Shooter;
import frc.robot.subsystems.transfer.Transfer;
import frc.robot.subsystems.vision.Vision;
import frc.robot.subsystems.vision.VisionIOLimelight;
import frc.robot.util.HubShiftUtil;
import frc.robot.util.SOTMUtil;

/**
 * This class is where the bulk of the robot should be declared. Since
 * Command-based is a
 * "declarative" paradigm, very little robot logic should actually be handled in
 * the {@link Robot}
 * periodic methods (other than the scheduler calls). Instead, the structure of
 * the robot (including
 * subsystems, commands, and button mappings) should be declared here.
 */
public class RobotContainer {
  // Subsystems
  private final Drive drive;
  private final Vision vision;
  Transfer transfer;
  Intake intake;
  Shooter shooter;
  Conveyor conveyor;
  // Controller
  private final CommandPS5Controller controller = new CommandPS5Controller(0);
  private final CommandPS5Controller operator = new CommandPS5Controller(1);
  private final CommandPS5Controller reset = new CommandPS5Controller(5);

  // Dashboard inputs
  private final LoggedDashboardChooser<Command> autoChooser;

  /**
   * The container for the robot. Contains subsystems, OI devices, and commands.
   */
  public RobotContainer() {
    switch (Constants.currentMode) {
      case REAL:
        // Real robot, instantiate hardware IO implementations
        // ModuleIOTalonFX is intended for modules with TalonFX drive, TalonFX turn, and
        // a CANcoder
        drive = new Drive(
            new GyroIOPigeon2(),
            new ModuleIOTalonFX(TunerConstants.FrontLeft),
            new ModuleIOTalonFX(TunerConstants.FrontRight),
            new ModuleIOTalonFX(TunerConstants.BackLeft),
            new ModuleIOTalonFX(TunerConstants.BackRight));
        break;

      case SIM:
        // Sim robot, instantiate physics sim IO implementations
        drive = new Drive(
            new GyroIO() {
            },
            new ModuleIOSim(TunerConstants.FrontLeft),
            new ModuleIOSim(TunerConstants.FrontRight),
            new ModuleIOSim(TunerConstants.BackLeft),
            new ModuleIOSim(TunerConstants.BackRight));
        break;

      default:
        // Replayed robot, disable IO implementations
        drive = new Drive(
            new GyroIO() {
            },
            new ModuleIO() {
            },
            new ModuleIO() {
            },
            new ModuleIO() {
            },
            new ModuleIO() {
            });

        break;
    }
    intake = new Intake();
    shooter = new Shooter();
    conveyor = new Conveyor();
    transfer = new Transfer();

    vision = new Vision(
        drive::addVisionMeasurement,
        new VisionIOLimelight(Constants.VisionConstants.camera0Name, drive::getRotation));

    registerNamedCommands();

    autoChooser = new LoggedDashboardChooser<>("Auto Choices", AutoBuilder.buildAutoChooser());
    autoChooser.addOption(
        "Drive Wheel Radius Characterization",
        DriveCommands.wheelRadiusCharacterization(drive));
    autoChooser.addOption(
        "Drive Simple FF Characterization", DriveCommands.feedforwardCharacterization(drive));
    autoChooser.addOption(
        "Drive SysId (Quasistatic Forward)",
        drive.sysIdQuasistatic(SysIdRoutine.Direction.kForward));
    autoChooser.addOption(
        "Drive SysId (Quasistatic Reverse)",
        drive.sysIdQuasistatic(SysIdRoutine.Direction.kReverse));
    autoChooser.addOption(
        "Drive SysId (Dynamic Forward)", drive.sysIdDynamic(SysIdRoutine.Direction.kForward));
    autoChooser.addOption(
        "Drive SysId (Dynamic Reverse)", drive.sysIdDynamic(SysIdRoutine.Direction.kReverse));

    // Configure the button bindings
    configureButtonBindings();
  }

  /**
   * Use this method to define your button->command mappings. Buttons can be
   * created by
   * instantiating a {@link GenericHID} or one of its subclasses ({@link
   * edu.wpi.first.wpilibj.Joystick} or {@link CommandPS5Controller}), and then
   * passing
   * it to a {@link
   * edu.wpi.first.wpilibj2.command.button.JoystickButton}.
   */
  private void configureButtonBindings() {
    // Default command, normal field-relative drive
    drive.setDefaultCommand(
        DriveCommands.joystickMDrive(
            drive,
            () -> -controller.getLeftY(),
            () -> -controller.getLeftX(),
            () -> controller.getRightX(),
            () -> controller.getRightY()));

    // Set default commands
    intake.setDefaultCommand(intake.intakeDefaultCommand());
    transfer.setDefaultCommand(transfer.setTransferCommand(0));
    shooter.setDefaultCommand(shooter.setDutyCycleSetpointCommand(0));
    conveyor.setDefaultCommand(conveyor.setConveyorCommand(0));

    // Reset gyro to 0° when options button is pressed
    controller
        .options()
        .onTrue(
            Commands.runOnce(
                () -> drive.setPose(
                    new Pose2d(drive.getPose()
                        .getTranslation(),
                        Rotation2d.kZero)),
                drive)
                .ignoringDisable(true));

    // If R2 and NOT R1, deploy intake
    controller.R2().and(controller.R1().negate()).and(controller.triangle().negate())
        .whileTrue(intake.deployAndIntakeCommand());

    controller.L2().and(controller.R1().negate())
        .whileTrue(transfer.setTransferCommand(-1).alongWith(conveyor.setConveyorCommand(0.6))
            .alongWith(intake.deployAndOutakeCommand(-1)));

    controller.L1().whileTrue(intake.intakeHomeCommand());

    // Deploy/Home Intake
    controller.povDown().whileTrue(intake.intakeDeployCommand());
    controller.povUp().whileTrue(intake.intakeHomeCommand());

    controller.R1().whileTrue(new SmartShootCommand(drive, shooter, transfer, conveyor))
        .whileTrue(DriveCommands.allianceZoneSotmDriveCommand(
            drive,
            shooter,
            () -> -controller.getLeftY(),
            () -> -controller.getLeftX(),
            () -> controller.getRightX(),
            () -> controller.getRightY()))
        .whileTrue(new AgitateCommand(intake, transfer, controller::R2,
            controller.L2(), () -> 3.5, transfer::getFeedPower));

    controller.triangle().whileTrue(new RPMShootCommand(shooter, transfer, conveyor, () -> 46.75))
        .whileTrue(new AgitateCommand(intake, transfer, controller::R2,
            controller.L2(), () -> 3.5))
        .whileTrue(new InstantCommand(drive::stopWithX));

    controller.square().whileTrue(DriveCommands.trenchAlignDriveCommand(
        drive,
        () -> -controller.getLeftY(),
        () -> -controller.getLeftX(),
        () -> controller.getRightX(),
        () -> controller.getRightY()));

    // Side, used to be 50
    operator.circle().or(controller.circle())
        .whileTrue(new RPMShootCommand(shooter, transfer, conveyor, () -> 47.0))
        .whileTrue(new AgitateCommand(intake, transfer, controller::R2,
            controller.L2(), () -> 3.5))
        .whileTrue(new InstantCommand(drive::stopWithX));

    // Close, used to be 35
    operator.triangle().whileTrue(new RPMShootCommand(shooter, transfer, conveyor, () -> 42.5))
        .whileTrue(new AgitateCommand(intake, transfer, controller::R2,
            controller.L2(), () -> 3.5));

    // Very far, used to be 60
    operator.square().whileTrue(new RPMShootCommand(shooter, transfer, conveyor, () -> 59.5))
        .whileTrue(new AgitateCommand(intake, transfer, controller::R2,
            controller.L2(), () -> 3.5));

    // Tower, used to be 45
    operator.cross().or(controller.cross()).whileTrue(new RPMShootCommand(shooter, transfer, conveyor, () -> 47.6))
        .whileTrue(new AgitateCommand(intake, transfer, controller::R2,
            controller.L2(), () -> 3.5))
        .whileTrue(new InstantCommand(drive::stopWithX));

    operator.R1().and(controller.R1().negate())
        .whileTrue(shooter.setVoltageCommand(4));

    operator.L1().whileTrue(transfer.setTransferCommand(1.0).alongWith(conveyor.setConveyorCommand(-1.0)));
    operator.povUp().whileTrue(shooter.setTunableVelocityBangBangCommand());
    // Testing controller (only bind if connected to avoid per-cycle warning
    // overhead)
    if (DriverStation.isJoystickConnected(5)) {
      reset.cross().onTrue(intake.coastCommand());
      reset.square().onTrue(intake.brakeCommand());
      reset.triangle().onTrue(intake.zeroCommand());

      reset.R1().whileTrue(shooter.setTunableVelocityPIDCommand());
      reset.L1().whileTrue(
          transfer.setTransferCommand(1.0).alongWith(conveyor.setConveyorCommand(1.0)));

    }

    // Reset hub shift timer when enabling
    RobotModeTriggers.teleop().onTrue(Commands.runOnce(HubShiftUtil::initialize));
    RobotModeTriggers.autonomous().onTrue(Commands.runOnce(HubShiftUtil::initialize));
    RobotModeTriggers.disabled()
        .onTrue(Commands.runOnce(HubShiftUtil::initialize).ignoringDisable(true));

    HubShiftUtil.setAllianceWinOverride(
        () -> {
          if (operator.getHID().getRawButton(5)) { // L1
            return Optional.of(false);
          }
          if (operator.getHID().getRawButton(6)) { // R1
            return Optional.of(true);
          }
          return Optional.empty();
        });

  }

  public void registerNamedCommands() {
    NamedCommands.registerCommand("SpinUp", shooter.setBangBangSetpointCommand(43)); // TODO Find this value
    NamedCommands.registerCommand("Intake_Fuel", intake.deployAndIntakeCommand());
    NamedCommands.registerCommand("AlignToHub",
        new AutoAlignToHubDuringAuto(drive, () -> 0, () -> 0, shooter, false));
    NamedCommands.registerCommand("Shoot_Fuel",
        new DistanceBasedShotCommand(drive, shooter, intake, transfer, conveyor, 1.5));
    NamedCommands.registerCommand("Shoot_Fuel_Depot",
        new DistanceBasedShotCommand(drive, shooter, intake, transfer, conveyor, 2.0));
    NamedCommands.registerCommand("Stop_Shoot",
        new ParallelDeadlineGroup(
            new WaitCommand(.01),
            shooter.setBangBangSetpointCommand(0),
            transfer.setTransferCommand(0),
            conveyor.setConveyorCommand(0)));

    NamedCommands.registerCommand("SOTM_Heading",
        new SotmHeadingOverrideCommand(drive, shooter));

    NamedCommands.registerCommand("SOTM_Heading_Stop",
        new InstantCommand(PPHolonomicDriveController::clearRotationFeedbackOverride));

    NamedCommands.registerCommand("SOTM_Shoot",
        new HubSOTMShotCommand(drive, shooter, transfer, conveyor, () -> false,
            () -> false,
            () -> 3.0)
            .alongWith(new AgitateCommand(intake, transfer, () -> false, () -> false, () -> 3.0, true)));

    NamedCommands.registerCommand("Intake_Home", intake.intakeHomeCommand().withTimeout(0.01));

  }

  /**
   * Use this to pass the autonomous command to the main {@link Robot} class.
   *
   * @return the command to run in autonomous
   */
  public Command getAutonomousCommand() {
    return autoChooser.get();
  }
}