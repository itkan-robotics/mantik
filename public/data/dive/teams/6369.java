// Copyright 2021-2025 FRC 6328
// http://github.com/Mechanical-Advantage
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// version 3 as published by the Free Software Foundation or
// available in the root directory of this project.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.

package frc.robot;

import com.pathplanner.lib.auto.AutoBuilder;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.wpilibj.GenericHID;
import edu.wpi.first.wpilibj.XboxController;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.SequentialCommandGroup;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import frc.robot.generated.TunerConstants;
import frc.robot.math.ShooterMathProvider;
import frc.robot.subsystems.drive.Drive.Controllers.HolonomicController;
import frc.robot.subsystems.drive.Drive.Drive;
import frc.robot.subsystems.drive.Drive.Drive.DriveState;
import frc.robot.subsystems.flywheel.Flywheel;
import frc.robot.subsystems.flywheel.FlywheelConstants;
import frc.robot.subsystems.flywheel.FlywheelIOTalonFX;
import frc.robot.subsystems.flywheel.Flywheel.FlywheelState;
import frc.robot.subsystems.index.Index;
import frc.robot.subsystems.index.IndexConstants;
import frc.robot.subsystems.index.IndexIOTalonFX;
import frc.robot.subsystems.index.Index.IndexState;
import frc.robot.subsystems.pivot.Pivot;
import frc.robot.subsystems.pivot.PivotConstants;
import frc.robot.subsystems.pivot.PivotIOTalonFX;
import frc.robot.subsystems.pivot.Pivot.PivotGoal;
import frc.robot.subsystems.pivot.Pivot.PivotState;
import frc.robot.subsystems.turret.Turret;
import frc.robot.subsystems.turret.TurretConstants;
import frc.robot.subsystems.turret.TurretIOTalonFX;
import frc.robot.subsystems.turret.Turret.TurretGoalState;
import frc.robot.subsystems.drive.Drive.GyroIO;
import frc.robot.subsystems.drive.Drive.GyroIOPigeon2;
import frc.robot.subsystems.drive.Drive.ModuleIO;
import frc.robot.subsystems.drive.Drive.ModuleIOSim;
import frc.robot.subsystems.drive.Drive.ModuleIOTalonFX;
import frc.robot.subsystems.vision.CameraIO;
import frc.robot.subsystems.vision.Vision;
import frc.robot.subsystems.vision.VisionConstants;
import frc.robot.subsystems.vision.VisionIOLimelight;
import frc.robot.subsystems.intake.Intake;
import frc.robot.subsystems.intake.IntakeIOTalonFX;
import frc.robot.subsystems.intake.Intake.IntakeFlywheelGoal;
import frc.robot.subsystems.intake.Intake.IntakeGoal;
import frc.robot.subsystems.intake.IntakeConstants;
import frc.robot.subsystems.intake.IntakeFlywheelIOTalonFX;
import frc.robot.subsystems.intake.IntakeFlywheelConstants;
import frc.robot.subsystems.spindexer.Spindexer;
import frc.robot.subsystems.spindexer.SpindexerConstants;
import frc.robot.subsystems.spindexer.SpindexerIOTalonFX;
import frc.robot.subsystems.spindexer.Spindexer.SpindexerState;

import org.littletonrobotics.junction.networktables.LoggedDashboardChooser;

/**
 * This class is where the bulk of the robot should be declared. Since Command-based is a
 * "declarative" paradigm, very little robot logic should actually be handled in the {@link Robot}
 * periodic methods (other than the scheduler calls). Instead, the structure of the robot (including
 * subsystems, commands, and button mappings) should be declared here.
 */
public class RobotContainer {
  // controllers
  public final HolonomicController driveToPoseController = new HolonomicController();
  
  // Math
  public final ShooterMathProvider shooterMath = new ShooterMathProvider();

  // Subsystems

  public final Drive drive;
  public final Vision vision;

  public final Flywheel shooterFlywheels;
  public final Pivot shooterHood;
  public final Turret shooterTurret;
  public final Intake intake;
  public final Spindexer spindexer;

  public final Index index;
  public final Trigger flywheelsAtGoalTrigger;

  // Controller
  private final CommandXboxController driverController = new CommandXboxController(0);
  private final CommandXboxController operatorController = new CommandXboxController(1);

  // Dashboard inputs
  private final LoggedDashboardChooser<Command> autoChooser;

  /** The container for the robot. Contains subsystems, OI devices, and commands. */
  public RobotContainer() {
    switch (Constants.currentMode) {
      case REAL:
        // Real robot, instantiate hardware IO implementations
        drive =
            new Drive(
                new GyroIOPigeon2(),
                new ModuleIOTalonFX(TunerConstants.FrontLeft),
                new ModuleIOTalonFX(TunerConstants.FrontRight),
                new ModuleIOTalonFX(TunerConstants.BackLeft),
                new ModuleIOTalonFX(TunerConstants.BackRight));

        // Vision subsystem
        vision =
            new Vision(
                new CameraIO[] {
                  new VisionIOLimelight(VisionConstants.camera0Name, () -> drive.getRotation()),
                  new VisionIOLimelight(VisionConstants.camera1Name, () -> drive.getRotation()),
                  new VisionIOLimelight(VisionConstants.camera2Name, () -> drive.getRotation()),
                  new VisionIOLimelight(VisionConstants.camera3Name, () -> drive.getRotation())
                });
 
        // Shooter
        shooterFlywheels =
                new Flywheel(
                  new FlywheelIOTalonFX(FlywheelConstants.kFlywheelHardware, FlywheelConstants.kMotorConfiguration, FlywheelConstants.kFlywheelGains), shooterMath
                );

        shooterHood = 
                new Pivot(
                  new PivotIOTalonFX(PivotConstants.kPivotHardware, PivotConstants.kMotorConfiguration, PivotConstants.kPivotGains, TurretConstants.kMinRadiansLimit, TurretConstants.kMaxRadiansLimit), shooterMath);

        shooterTurret =
                new Turret(
                  new TurretIOTalonFX(TurretConstants.kTurretHardware, TurretConstants.kMotorConfiguration, TurretConstants.kTurretGains, TurretConstants.kMinRadiansLimit, TurretConstants.kMaxRadiansLimit), drive, shooterMath);

        intake =
                new Intake(
                  new IntakeIOTalonFX(IntakeConstants.kIntakeHardware, IntakeConstants.kMotorConfiguration, IntakeConstants.kIntakeGains),
                  new IntakeFlywheelIOTalonFX(IntakeFlywheelConstants.kFlywheelHardware, IntakeFlywheelConstants.kMotorConfiguration, IntakeFlywheelConstants.kFlywheelGains));

        index = 
                new Index(
                  new IndexIOTalonFX(IndexConstants.kIndexHardware, IndexConstants.kMotorConfiguration, IndexConstants.kIndexGains), shooterMath
                );

        spindexer = new Spindexer(
          new SpindexerIOTalonFX(SpindexerConstants.kIndexHardware, SpindexerConstants.kMotorConfiguration, SpindexerConstants.kSpindexIndexGains)
        );
        
        break;

      case SIM:
        // Sim robot, instantiate physics sim IO implementations
        drive =
            new Drive(
                new GyroIO() {},
                new ModuleIOSim(TunerConstants.FrontLeft),
                new ModuleIOSim(TunerConstants.FrontRight),
                new ModuleIOSim(TunerConstants.BackLeft),
                new ModuleIOSim(TunerConstants.BackRight));

        // Vision subsystem
        vision =
            new Vision(
                new CameraIO[] {
                  new VisionIOLimelight(VisionConstants.camera0Name, () -> drive.getRotation()),
                  new VisionIOLimelight(VisionConstants.camera1Name, () -> drive.getRotation()),
                  new VisionIOLimelight(VisionConstants.camera2Name, () -> drive.getRotation()),
                  new VisionIOLimelight(VisionConstants.camera3Name, () -> drive.getRotation())
                });

        // Shooter
        shooterFlywheels =
                new Flywheel(
                  new FlywheelIOTalonFX(FlywheelConstants.kFlywheelHardware, FlywheelConstants.kMotorConfiguration, FlywheelConstants.kFlywheelGains), shooterMath
                );

        shooterHood = 
                new Pivot(
                  new PivotIOTalonFX(PivotConstants.kPivotHardware, PivotConstants.kMotorConfiguration, PivotConstants.kPivotGains, TurretConstants.kMinRadiansLimit, TurretConstants.kMaxRadiansLimit), shooterMath);

        shooterTurret =
                new Turret(
                  new TurretIOTalonFX(TurretConstants.kTurretHardware, TurretConstants.kMotorConfiguration, TurretConstants.kTurretGains, TurretConstants.kMinRadiansLimit, TurretConstants.kMaxRadiansLimit), drive, shooterMath);

        intake =
                new Intake(
                  new IntakeIOTalonFX(IntakeConstants.kIntakeHardware, IntakeConstants.kMotorConfiguration, IntakeConstants.kIntakeGains),
                  new IntakeFlywheelIOTalonFX(IntakeFlywheelConstants.kFlywheelHardware, IntakeFlywheelConstants.kMotorConfiguration, IntakeFlywheelConstants.kFlywheelGains));
        
        index = 
                new Index(
                  new IndexIOTalonFX(IndexConstants.kIndexHardware, IndexConstants.kMotorConfiguration, IndexConstants.kIndexGains), shooterMath
                );

        spindexer = new Spindexer(
          new SpindexerIOTalonFX(SpindexerConstants.kIndexHardware, SpindexerConstants.kMotorConfiguration, SpindexerConstants.kSpindexIndexGains)
        );

        break;

      default:
        // Replayed robot, disable IO implementations
        drive =
            new Drive(
                new GyroIO() {},
                new ModuleIO() {},
                new ModuleIO() {},
                new ModuleIO() {},
                new ModuleIO() {});

        // Vision subsystem
        vision =
            new Vision(
                new CameraIO[] {
                  new VisionIOLimelight(VisionConstants.camera0Name, () -> drive.getRotation()),
                  new VisionIOLimelight(VisionConstants.camera1Name, () -> drive.getRotation()),
                  new VisionIOLimelight(VisionConstants.camera2Name, () -> drive.getRotation()),
                  new VisionIOLimelight(VisionConstants.camera3Name, () -> drive.getRotation())
                });

     
        // Shooter
        shooterFlywheels =
                new Flywheel(
                  new FlywheelIOTalonFX(FlywheelConstants.kFlywheelHardware, FlywheelConstants.kMotorConfiguration, FlywheelConstants.kFlywheelGains), shooterMath
                );

        shooterHood = 
                new Pivot(
                  new PivotIOTalonFX(PivotConstants.kPivotHardware, PivotConstants.kMotorConfiguration, PivotConstants.kPivotGains, PivotConstants.kMinRadians, PivotConstants.kMaxRadians), shooterMath);

        shooterTurret =
                new Turret(
                  new TurretIOTalonFX(TurretConstants.kTurretHardware, TurretConstants.kMotorConfiguration, TurretConstants.kTurretGains, TurretConstants.kMinRadiansLimit, TurretConstants.kMaxRadiansLimit), drive, shooterMath);

        intake =
                new Intake(
                  new IntakeIOTalonFX(IntakeConstants.kIntakeHardware, IntakeConstants.kMotorConfiguration, IntakeConstants.kIntakeGains),
                  new IntakeFlywheelIOTalonFX(IntakeFlywheelConstants.kFlywheelHardware, IntakeFlywheelConstants.kMotorConfiguration, IntakeFlywheelConstants.kFlywheelGains));

        index = 
                new Index(
                  new IndexIOTalonFX(IndexConstants.kIndexHardware, IndexConstants.kMotorConfiguration, IndexConstants.kIndexGains), shooterMath
                );
                
        spindexer = new Spindexer(
          new SpindexerIOTalonFX(SpindexerConstants.kIndexHardware, SpindexerConstants.kMotorConfiguration, SpindexerConstants.kSpindexIndexGains)
        );

        break;
    }

    flywheelsAtGoalTrigger = new Trigger(() -> shooterFlywheels.atSpeed());

    // Create auto routines
    autoChooser = new LoggedDashboardChooser<>("Auto Chooser", AutoBuilder.buildAutoChooser());

    // // Set up SysId routines
    // pathplannerAutoChooser.addOption(
    //     "Drive Wheel Radius Characterization", DriveCommands.wheelRadiusCharacterization(drive));
    // pathplannerAutoChooser.addOption(
    //     "Drive Simple FF Characterization", DriveCommands.feedforwardCharacterization(drive));
    // pathplannerAutoChooser.addOption(
    //     "Drive SysId (Quasistatic Forward)",
    //     drive.sysIdQuasistatic(SysIdRoutine.Direction.kForward));
    // pathplannerAutoChooser.addOption(
    //     "Drive SysId (Quasistatic Reverse)",
    //     drive.sysIdQuasistatic(SysIdRoutine.Direction.kReverse));
    // pathplannerAutoChooser.addOption(
    //     "Drive SysId (Dynamic Forward)", drive.sysIdDynamic(SysIdRoutine.Direction.kForward));
    // pathplannerAutoChooser.addOption(
    //     "Drive SysId (Dynamic Reverse)", drive.sysIdDynamic(SysIdRoutine.Direction.kReverse));

    drive.acceptJoystickInputs(
        () ->
            -Math.copySign(
                driverController.getLeftY() * driverController.getLeftY(),
                driverController.getLeftY()),
        () ->
            -Math.copySign(
                driverController.getLeftX() * driverController.getLeftX(),
                driverController.getLeftX()),
        () -> -driverController.getRightX());

    // Configure the button bindings
    configureButtonBindings();
  }

  public Command getTeleopCommand() {
    return new SequentialCommandGroup(drive.setDriveStateCommand(Drive.DriveState.TELEOP));
  }

  /**
   * Use this method to define your button->command mappings. Buttons can be created by
   * instantiating a {@link GenericHID} or one of its subclasses ({@link
   * edu.wpi.first.wpilibj.Joystick} or {@link XboxController}), and then passing it to a {@link
   * edu.wpi.first.wpilibj2.command.button.JoystickButton}.
   */
  private void configureButtonBindings() {


    drive.setDefaultCommand(
        Commands.run(
            () ->
                drive.acceptJoystickInputs(
                    () ->
                        -Math.copySign(
                            driverController.getLeftY() * driverController.getLeftY(),
                            driverController.getLeftY()),
                    () ->
                        -Math.copySign(
                            driverController.getLeftX() * driverController.getLeftX(),
                            driverController.getLeftX()),
                    () -> -driverController.getRightX()),
            drive));

    driverController.pov(0).whileTrue(
      Commands.runEnd(() -> {drive.acceptJoystickInputs(()->0.4, ()->0.0, ()->0.0);}, () -> {drive.acceptJoystickInputs(()->0.0, ()->0.0, ()->0.0);})
    );

    driverController.pov(90).whileTrue(
      Commands.runEnd(() -> {drive.acceptJoystickInputs(()->0.0, ()->-0.4, ()->0.0);}, () -> {drive.acceptJoystickInputs(()->0.0, ()->0.0, ()->0.0);})
    );

    driverController.pov(270).whileTrue(
      Commands.runEnd(() -> {drive.acceptJoystickInputs(()->0.0, ()->0.4, ()->0.0);}, () -> {drive.acceptJoystickInputs(()->0.0, ()->0.0, ()->0.0);})
    );
    
    driverController.pov(180).whileTrue(
      Commands.runEnd(() -> {drive.acceptJoystickInputs(()->-0.4, ()->0.0, ()->0.0);}, () -> {drive.acceptJoystickInputs(()->0.0, ()->0.0, ()->0.0);})
    );

    // prepare for climb
    driverController
        .back()
        .onTrue(drive.setDriveStateCommandContinued(DriveState.DRIVETOCLIMB))
        .onFalse(drive.setDriveStateCommand(DriveState.TELEOP));

    // driverController
    //     .x()
    //     .onTrue(drive.setDriveStateCommandContinued(DriveState.DRIVETOPOSEPROFILED))
    //     .onFalse(drive.setDriveStateCommandContinued(DriveState.TELEOP));

    // SignalLogger.start(); // sysid
    // operatorController.a().whileTrue(
    //     drive.sysIdQuasistatic(Direction.kForward));
    // operatorController.b().whileTrue(
    //     drive.sysIdQuasistatic(Direction.kReverse));
    // operatorController.x().whileTrue(
    //   drive.sysIdDynamic(Direction.kForward));
    // operatorController.y().whileTrue(
    //   drive.sysIdDynamic(Direction.kReverse));

    // Reset gyro to 0° when B button is pressed
    driverController
        .b()
        .onTrue(
            Commands.runOnce(
                    () ->
                        drive.setPose(
                            new Pose2d(drive.getPose().getTranslation(), new Rotation2d())),
                    drive)
                .ignoringDisable(true));

    // driverController
    //     .leftBumper()
    //     .onTrue(
    //         Commands.runOnce(
    //             () -> {
    //               if (drive.getDriveState() == DriveState.POINTANDDRIVE) {
    //                 drive.setDriveStateCommandContinued(DriveState.TELEOP).schedule();
    //               } else {
    //                 drive.setDriveStateCommandContinued(DriveState.POINTANDDRIVE).schedule();
    //               }
    //             }));
    
    // Reset everything to stowed position
    driverController.a().onTrue(Commands.runOnce(() -> {
      intake.setIntakeGoal(IntakeGoal.kStow);
      intake.setFlywheelGoal(IntakeFlywheelGoal.kStop);
      shooterFlywheels.setFlywheelState(FlywheelState.STOP);
      shooterTurret.setTurretState(TurretGoalState.HOME);
      index.setIndexState(IndexState.STOP);
      spindexer.setIndexState(SpindexerState.STOP);
      shooterHood.setGoal(PivotGoal.STOW);
      shooterHood.setPivotState(PivotState.STOW);
    }, intake));

    // intake mode
    driverController.leftBumper().onTrue(Commands.runOnce(() -> {
      intake.setIntakeGoal(IntakeGoal.kOut);
      intake.setFlywheelGoal(IntakeFlywheelGoal.kRunning);
      shooterFlywheels.setFlywheelState(FlywheelState.STOP);
      index.setIndexState(IndexState.STOP);
      spindexer.setIndexState(SpindexerState.STOP);
      shooterTurret.setTurretState(TurretGoalState.PROVIDED);
      shooterHood.setGoal(PivotGoal.STOW);
      shooterHood.setPivotState(PivotState.STOW);
    }, intake));
    
    // Shooting Mode
    driverController.rightBumper().onTrue(Commands.runOnce(() -> {
      intake.setIntakeGoal(IntakeGoal.kOut);
      intake.setFlywheelGoal(IntakeFlywheelGoal.kStop);
      shooterFlywheels.setFlywheelState(FlywheelState.PROVIDED);
      shooterTurret.setTurretState(TurretGoalState.PROVIDED);
      shooterHood.setGoal(PivotGoal.PROVIDED);
      shooterHood.setPivotState(PivotState.PROVIDED);
    }, intake));

    driverController.y().onTrue(Commands.runOnce(() -> {
      intake.setIntakeGoal(IntakeGoal.kOut);
      intake.setFlywheelGoal(IntakeFlywheelGoal.kStop);
      shooterFlywheels.setFlywheelState(FlywheelState.FIXED);
      shooterFlywheels.setCustomSpeedRPS(50);
      shooterTurret.setTurretState(TurretGoalState.PROVIDED);
      shooterHood.setGoal(PivotGoal.PROVIDED);
      shooterHood.setPivotState(PivotState.PROVIDED);
    }, intake));

    flywheelsAtGoalTrigger.onTrue(Commands.runOnce(() -> {
      if (shooterFlywheels.currentState == FlywheelState.PROVIDED) {
        index.setIndexState(IndexState.PROVIDED);
        spindexer.setIndexState(SpindexerState.RUNNING);
      }
    }));

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
