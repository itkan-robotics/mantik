// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import static edu.wpi.first.units.Units.MetersPerSecond;
import static edu.wpi.first.units.Units.RotationsPerSecond;

import com.ctre.phoenix6.signals.NeutralModeValue;
import com.pathplanner.lib.auto.AutoBuilder;
import com.pathplanner.lib.auto.NamedCommands;
import com.pathplanner.lib.config.RobotConfig;
import com.pathplanner.lib.events.EventTrigger;
import edu.wpi.first.math.geometry.Pose3d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Rotation3d;
import edu.wpi.first.math.geometry.Transform3d;
import edu.wpi.first.math.geometry.Translation3d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.units.Units;
import edu.wpi.first.wpilibj.RobotBase;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.InstantCommand;
import edu.wpi.first.wpilibj2.command.RunCommand;
import edu.wpi.first.wpilibj2.command.StartEndCommand;
import edu.wpi.first.wpilibj2.command.WaitCommand;
import edu.wpi.first.wpilibj2.command.WaitUntilCommand;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import frc.robot.Constants.Mode;
import frc.robot.commands.AlignToPoseCommand;
import frc.robot.commands.AlignToShootCommand;
import frc.robot.commands.AlignToShootPoseCommand;
import frc.robot.commands.AutoShootCommand;
import frc.robot.commands.FieldAxisAssistCommand;
import frc.robot.commands.IntakeCommand;
import frc.robot.commands.PassToPoseCommand;
import frc.robot.commands.ShootCommandFactory;
import frc.robot.commands.StowCommand;
import frc.robot.commands.VibrateHIDCommand;
import frc.robot.commands.VisionTuningCommands;
import frc.robot.subsystems.can_watchdog.CANWatchdog;
import frc.robot.subsystems.can_watchdog.CANWatchdogIO;
import frc.robot.subsystems.elastic_updater.ElasticUpdater;
import frc.robot.subsystems.intake.IntakeController;
import frc.robot.subsystems.intake.IntakeController.IntakeState;
import frc.robot.subsystems.intake.intake_rack.IntakeRack;
import frc.robot.subsystems.intake.intake_rack.IntakeRackIO;
import frc.robot.subsystems.intake.intake_rack.IntakeRackIOSim;
import frc.robot.subsystems.intake.intake_rack.IntakeRackIOTalonFX;
import frc.robot.subsystems.intake.intake_rollers.IntakeRollers;
import frc.robot.subsystems.intake.intake_rollers.IntakeRollersIO;
import frc.robot.subsystems.intake.intake_rollers.IntakeRollersIOSim;
import frc.robot.subsystems.intake.intake_rollers.IntakeRollersIOTalonFX;
import frc.robot.subsystems.rgb.RGB;
import frc.robot.subsystems.rgb.RGBIO;
import frc.robot.subsystems.shooter.ShooterController;
import frc.robot.subsystems.shooter.ShooterController.ShooterState;
import frc.robot.subsystems.shooter.serializer.Serializer;
import frc.robot.subsystems.shooter.serializer.SerializerIO;
import frc.robot.subsystems.shooter.serializer.SerializerIOTalonFX;
import frc.robot.subsystems.shooter.serializer.SerializerSim;
import frc.robot.subsystems.shooter.shooter_accelerator.ShooterAccelerator;
import frc.robot.subsystems.shooter.shooter_accelerator.ShooterAcceleratorIO;
import frc.robot.subsystems.shooter.shooter_accelerator.ShooterAcceleratorIOSim;
import frc.robot.subsystems.shooter.shooter_accelerator.ShooterAcceleratorIOTalonFX;
import frc.robot.subsystems.shooter.shooter_flywheel.*;
import frc.robot.subsystems.shooter.shooter_hood.*;
import frc.robot.subsystems.shooter.shooter_omniwheel.ShooterOmniwheel;
import frc.robot.subsystems.shooter.shooter_omniwheel.ShooterOmniwheelIO;
import frc.robot.subsystems.shooter.shooter_omniwheel.ShooterOmniwheelIOSim;
import frc.robot.subsystems.shooter.shooter_omniwheel.ShooterOmniwheelIOTalonFX;
import frc.robot.subsystems.swerve.Drive;
import frc.robot.subsystems.swerve.DriveConstants;
import frc.robot.subsystems.swerve.GyroIO;
import frc.robot.subsystems.swerve.GyroIOPigeon2;
import frc.robot.subsystems.swerve.GyroIOSim;
import frc.robot.subsystems.swerve.ModuleIO;
import frc.robot.subsystems.swerve.ModuleIOTalonFXReal;
import frc.robot.subsystems.swerve.ModuleIOTalonFXSim;
import frc.robot.subsystems.vision.Vision;
import frc.robot.subsystems.vision.VisionIO;
import frc.robot.subsystems.vision.VisionIOPhotonvision;
import frc.robot.subsystems.vision.VisionIOPhotonvisionSim;
import frc.robot.utility.ElasticSetpoints;
import org.ironmaple.simulation.SimulatedArena;
import org.ironmaple.simulation.drivesims.SwerveDriveSimulation;
import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.networktables.LoggedDashboardChooser;

/**
 * This class is where the bulk of the robot should be declared. Since Command-based is a
 * "declarative" paradigm, very little robot logic should actually be handled in the {@link Robot}
 * periodic methods (other than the scheduler calls). Instead, the structure of the robot (including
 * subsystems, commands, and button mappings) should be declared here.
 */
public class RobotContainer {

  // DO NOT DELETE -- this actually does something important
  private RobotState robotState = RobotState.getInstance();

  private ElasticSetpoints elasticSetpoints = ElasticSetpoints.getInstance();

  private boolean defaultZeroing = false;

  private ElasticUpdater matchTimerUpdater = new ElasticUpdater();

  // private SendableChooser<Command> autoChooser;
  private LoggedDashboardChooser<Command> autoChooser;

  private final CommandXboxController driverA = new CommandXboxController(0);
  private final CommandXboxController driverB = new CommandXboxController(1);

  private Drive swerve;
  private Vision vision;
  private RGB rgb;
  private CANWatchdog canWatchdog;
  private IntakeRack intakeRack;
  private IntakeRollers intakeRollers;
  private IntakeController intakeController;
  private Serializer serializer;
  private ShooterFlywheel shooterFlywheels;
  private ShooterHood shooterHood;
  private ShooterController shooterController;
  private ShooterOmniwheel shooterOmniwheel;
  private ShooterAccelerator shooterAccelerator;

  public RobotContainer() {

    if (Constants.getRobotMode() != Mode.REPLAY) {
      switch (Constants.getRobotType()) {
        case COMP -> {
          swerve =
              new Drive(
                  new GyroIOPigeon2(),
                  new ModuleIOTalonFXReal(DriveConstants.MODULE_CONFIGS[0]),
                  new ModuleIOTalonFXReal(DriveConstants.MODULE_CONFIGS[1]),
                  new ModuleIOTalonFXReal(DriveConstants.MODULE_CONFIGS[2]),
                  new ModuleIOTalonFXReal(DriveConstants.MODULE_CONFIGS[3]));
          intakeRack = new IntakeRack(new IntakeRackIOTalonFX());
          intakeRollers = new IntakeRollers(new IntakeRollersIOTalonFX());
          vision =
              new Vision(
                  new VisionIOPhotonvision("CamC", 0),
                  new VisionIOPhotonvision("CamA", 1),
                  new VisionIOPhotonvision("CamB", 2));
          // new VisionIOPhotonvision("arducam-3", 1));
          // // rgb = new RGB(new RGBIOAddressableLED());
          // // rgb = new RGB(new RGBIOCANdle());
          // // canWatchdog = new CANWatchdog(new CANWatchdogIOComp(), rgb);
          shooterFlywheels = new ShooterFlywheel(new ShooterFlywheelIOTalonFX());
          shooterHood = new ShooterHood(new ShooterHoodIOTalonFX());
          shooterOmniwheel = new ShooterOmniwheel(new ShooterOmniwheelIOTalonFX());
          shooterAccelerator = new ShooterAccelerator(new ShooterAcceleratorIOTalonFX());
          serializer = new Serializer(new SerializerIOTalonFX());
        }
        case VISION -> {
          swerve =
              new Drive(
                  new GyroIOPigeon2(),
                  new ModuleIOTalonFXReal(DriveConstants.MODULE_CONFIGS[0]),
                  new ModuleIOTalonFXReal(DriveConstants.MODULE_CONFIGS[1]),
                  new ModuleIOTalonFXReal(DriveConstants.MODULE_CONFIGS[2]),
                  new ModuleIOTalonFXReal(DriveConstants.MODULE_CONFIGS[3]));
          // vision = new Vision(new VisionIOPhotonvision("arducam-4", 0), new
          // VisionIOPhotonvision("arducam-5", 1));
        }
        case ALPHA -> {
          swerve =
              new Drive(
                  new GyroIOPigeon2(),
                  new ModuleIOTalonFXReal(DriveConstants.MODULE_CONFIGS[0]),
                  new ModuleIOTalonFXReal(DriveConstants.MODULE_CONFIGS[1]),
                  new ModuleIOTalonFXReal(DriveConstants.MODULE_CONFIGS[2]),
                  new ModuleIOTalonFXReal(DriveConstants.MODULE_CONFIGS[3]));
        }
        case SIM -> {
          SwerveDriveSimulation driveSimulation = RobotSimState.getInstance().getDriveSimulation();
          swerve =
              new Drive(
                  new GyroIOSim(driveSimulation.getGyroSimulation()),
                  new ModuleIOTalonFXSim(
                      DriveConstants.MODULE_CONFIGS[0], driveSimulation.getModules()[0]),
                  new ModuleIOTalonFXSim(
                      DriveConstants.MODULE_CONFIGS[1], driveSimulation.getModules()[1]),
                  new ModuleIOTalonFXSim(
                      DriveConstants.MODULE_CONFIGS[2], driveSimulation.getModules()[2]),
                  new ModuleIOTalonFXSim(
                      DriveConstants.MODULE_CONFIGS[3], driveSimulation.getModules()[3]));
          vision =
              new Vision(
                  new VisionIOPhotonvisionSim(
                      "arducam-3", 3, driveSimulation::getSimulatedDriveTrainPose));
          new VisionIOPhotonvisionSim("arducam-4", 4, driveSimulation::getSimulatedDriveTrainPose);

          // INTAKE
          intakeRack = new IntakeRack(new IntakeRackIOSim());
          intakeRollers = new IntakeRollers(new IntakeRollersIOSim());

          serializer = new Serializer(new SerializerSim());

          shooterFlywheels = new ShooterFlywheel(new ShooterFlywheelIOSim());
          shooterHood = new ShooterHood(new ShooterHoodIOSim());
          shooterOmniwheel = new ShooterOmniwheel(new ShooterOmniwheelIOSim());
          shooterAccelerator = new ShooterAccelerator(new ShooterAcceleratorIOSim());
        }
      }
    }

    // SWERVE
    if (swerve == null)
      swerve =
          new Drive(
              new GyroIO() {},
              new ModuleIO() {},
              new ModuleIO() {},
              new ModuleIO() {},
              new ModuleIO() {});

    // VISION
    if (vision == null) vision = new Vision(new VisionIO() {}, new VisionIO() {});

    // CAN WATCHDOG
    if (canWatchdog == null) canWatchdog = new CANWatchdog(new CANWatchdogIO() {}, rgb);

    // RGB
    if (rgb == null) rgb = new RGB(new RGBIO() {});

    // INTAKE
    if (intakeRack == null) intakeRack = new IntakeRack(new IntakeRackIO() {});
    if (intakeRollers == null) intakeRollers = new IntakeRollers(new IntakeRollersIO() {});
    intakeController = new IntakeController(intakeRack, intakeRollers);

    // SERIALIZER
    if (serializer == null) serializer = new Serializer(new SerializerIO() {});

    // SHOOTER
    if (shooterFlywheels == null)
      shooterFlywheels = new ShooterFlywheel(new ShooterFlywheelIO() {});
    if (shooterHood == null) shooterHood = new ShooterHood(new ShooterHoodIO() {});
    if (shooterOmniwheel == null)
      shooterOmniwheel = new ShooterOmniwheel(new ShooterOmniwheelIO() {});
    if (shooterAccelerator == null)
      shooterAccelerator = new ShooterAccelerator(new ShooterAcceleratorIO() {});
    shooterController =
        new ShooterController(
            shooterFlywheels, shooterHood, shooterOmniwheel, shooterAccelerator, serializer);

    // init shooter with testing values
    RobotState.getInstance()
        .initializeShootingAnglePredictor(
            () ->
                ChassisSpeeds.fromRobotRelativeSpeeds(
                    swerve.getRobotSpeeds(),
                    RobotState.getInstance().getEstimatedPose().getRotation()),
            () -> shooterController.getCurrentVelocity(),
            () -> ShooterHoodConstants.BASE_TO_SHOOTER_HOOD_TRANSFORM,
            Units.Degrees.of(-180));

    nameCommands();
    configureAutos();
    configureBindings();
  }

  public void containerMatchStarting() {
    // runs when match starts
    canWatchdog.matchStarting();
  }

  /** Use this method to define the named commands for all of the autos */
  private void nameCommands() {
    // Register Command Names in this method

    new EventTrigger("Intake down")
        .onTrue(
            new InstantCommand(
                () -> {
                  intakeController.setTargetState(IntakeState.INTAKE);
                  shooterController.setTargetState(ShooterState.INTAKE);
                }));
    new EventTrigger("Intake stow")
        .onTrue(
            new InstantCommand(() -> intakeController.setTargetState(IntakeState.SHOOTING_STOW)));
    new EventTrigger("Spin up shooter")
        .onTrue(
            new InstantCommand(
                () -> {
                  shooterController.setTargetState(ShooterState.COMPACT_SPIN_UP);
                }));
    new EventTrigger("Intake off")
        .onTrue(new InstantCommand(() -> intakeController.setTargetState(IntakeState.IDLE)));

    NamedCommands.registerCommand("Smart zero", new InstantCommand(() -> swerve.smartZeroGyro()));
    NamedCommands.registerCommand(
        "Intake down",
        intakeController
            .setTargetStateCommand(IntakeState.INTAKE)
            .alongWith(shooterController.setTargetStateCommand(ShooterState.FLYWHEEL_SPIN_UP)));
    // probably have to change this, come back later
    NamedCommands.registerCommand(
        "Intake stow", intakeController.setTargetStateCommand(IntakeState.SHOOTING_STOW));
    NamedCommands.registerCommand(
        "Spin up shooter", shooterController.setTargetStateCommand(ShooterState.COMPACT_SPIN_UP));
    NamedCommands.registerCommand(
        "Shoot", shooterController.setTargetStateCommand(ShooterState.SHOOT));
    NamedCommands.registerCommand(
        "Stop shooting", shooterController.setTargetStateCommand(ShooterState.FLYWHEEL_SPIN_UP));
    NamedCommands.registerCommand(
        "Align to shoot", new AlignToShootCommand(swerve, shooterController));
    NamedCommands.registerCommand(
        "Shoot full hopper",
        new InstantCommand(
                () ->
                    swerve.setTargetHeading(
                        RobotState.getInstance()
                            .calculateTargetShootingState()
                            .drivebaseYaw()
                            .plus(new Rotation2d(Math.toRadians(RobotBase.isReal() ? 0 : 180)))))
            .alongWith(shooterController.setTargetStateCommand(ShooterState.TOTAL_SPIN_UP))
            .alongWith(
                new InstantCommand(
                    () -> shooterController.setTargetStateCommand(ShooterState.SHOOT)))
            .alongWith(new WaitCommand(1))
            .alongWith(
                new InstantCommand(
                    () -> intakeController.setTargetState(IntakeState.SHOOTING_STOW)))
            .alongWith(new WaitCommand(7))
            .andThen(
                new InstantCommand(
                    () -> intakeController.setTargetStateCommand(IntakeState.INTAKE)))
            .andThen(
                new InstantCommand(
                    () -> shooterController.setTargetStateCommand(ShooterState.FLYWHEEL_SPIN_UP))));

    NamedCommands.registerCommand(
        "Auto shoot full hopper",
        new AutoShootCommand(swerve, shooterController, intakeController, matchTimerUpdater, true));
    NamedCommands.registerCommand(
        "Align and auto shoot full hopper",
        new AlignToShootPoseCommand(swerve, true)
            .withDeadline(
                new AutoShootCommand(
                    swerve, shooterController, intakeController, matchTimerUpdater, true)));
    NamedCommands.registerCommand(
        "Align and auto shoot full hopper (no intake)",
        new AlignToShootPoseCommand(swerve, true)
            .withDeadline(new WaitUntilCommand(() -> !RobotState.getInstance().isUnderTrench()))
            .andThen(
                (new AlignToShootCommand(swerve, shooterController))
                    .withDeadline(
                        new WaitCommand(0.2)
                            .andThen(
                                new AutoShootCommand(
                                    swerve,
                                    shooterController,
                                    intakeController,
                                    matchTimerUpdater,
                                    false)))));
    NamedCommands.registerCommand(
        "Auto shoot full hopper (no intake)",
        new AutoShootCommand(
            swerve, shooterController, intakeController, matchTimerUpdater, false));
    NamedCommands.registerCommand(
        "Shoot preloaded hopper",
        new AlignToPoseCommand(swerve, () -> RobotState.getInstance().getShootingPose(), true, true)
            .alongWith(shooterController.setTargetStateCommand(ShooterState.TOTAL_SPIN_UP))
            .andThen(new WaitCommand(0.6))
            .andThen(
                new InstantCommand(
                    () -> shooterController.setTargetStateCommand(ShooterState.SHOOT)))
            .andThen(new WaitCommand(2))
            .andThen(
                new InstantCommand(
                    () -> intakeController.setTargetStateCommand(IntakeState.INTAKE)))
            .andThen(
                new InstantCommand(
                    () -> shooterController.setTargetStateCommand(ShooterState.FLYWHEEL_SPIN_UP))));
  }

  private void configureBindings() {
    // -----Driver Controls-----
    swerve.setDefaultCommand(
        swerve
            .run(
                () -> {
                  swerve.driveTeleopController(
                      -driverA.getLeftY(),
                      -driverA.getLeftX(),
                      driverA.getLeftTriggerAxis() - driverA.getRightTriggerAxis(),
                      DriveConstants.DRIVE_CONFIG.maxLinearAcceleration());
                  if ((Math.abs(driverA.getLeftTriggerAxis()) > 0.1
                          || Math.abs(driverA.getRightTriggerAxis()) > 0.1)
                      && !swerve.getIsScoped()) {
                    swerve.clearHeadingControl();
                  }
                })
            .withName("Drive Teleop"));
    // adjust this for x swerve

    configureDriverAButtons();
    configureDriverBButtons();
    new Trigger(() -> (int) matchTimerUpdater.getTimeUntilOurHubShifts() == 7)
        .onTrue(new VibrateHIDCommand(driverB.getHID(), 1, 0.4));

    new Trigger(() -> vision.getMultiTags() && !defaultZeroing)
        .onTrue(new InstantCommand(() -> swerve.smartZeroGyro()));

    // // Stop running serializer button
    // new Trigger(
    //         () ->
    //             serializer.serializerStalling()
    //                 && intakeController.getTargetState() == IntakeState.INTAKE
    //                 && shooterController.getTargetState()
    //                     == ShooterState.INTAKE) // TODO: make these constants
    //     .onTrue(
    //         new InstantCommand(
    //             () -> shooterController.setTargetState(ShooterState.FLYWHEEL_SPIN_UP)));

    // Use pov down and left for testing buttons please!! (Drivers get annoyed when we use other
    // buttons)
  }

  private void configureDriverAButtons() {
    driverA.rightStick().whileTrue(new FieldAxisAssistCommand(swerve));

    // driverA.leftStick().whileTrue(new PassToPoseCommand(swerve));
    // driverA.rightStick().onTrue(new HappyBirthdayCommand());
    driverA
        .povLeft()
        .onTrue(
            new InstantCommand(() -> intakeController.setTargetState(IntakeState.SHOOTING_STOW)));
    // ZERO GYRO
    driverA
        .start()
        .onTrue(
            swerve.zeroGyroCommand().alongWith(new InstantCommand(() -> defaultZeroing = true)));
    // SMART ZERO GYRO
    // driverA.x().onTrue(new InstantCommand(() -> swerve.smartZeroGyro()));
    // INTAKE
    driverA.b().onTrue(new IntakeCommand(intakeController, shooterController));
    // STOW ROBOT
    driverA.y().onTrue(new StowCommand(intakeController, shooterController));

    // SHOOTING COMMAND
    ShootCommandFactory shootCommand =
        new ShootCommandFactory(
            shooterController,
            intakeController,
            matchTimerUpdater,
            swerve::getShootingError); // TODO: Change degrees in fromDegrees
    driverA.a().whileTrue(shootCommand.whileHeld());
    driverA.a().onFalse(shootCommand.onRelease());

    // DEFENSE MODE
    driverA.povUp().whileTrue(new RunCommand(() -> swerve.setDefenseMode(), swerve));

    // PASS
    driverA
        .povRight()
        .whileTrue(new PassToPoseCommand(swerve).alongWith(shootCommand.whileHeldPassing()));

    driverA.povRight().onFalse(shootCommand.onRelease());

    // DEFENSE POSE SHOOT
    driverA
        .x()
        .whileTrue(
            new AlignToShootPoseCommand(swerve, true)
                .alongWith(
                    (new WaitUntilCommand(() -> swerve.almostReachedAutoAlignTarget())
                        .andThen(
                            shooterController.setTargetStateCommand(ShooterState.TOTAL_SPIN_UP))))
                .alongWith(
                    new WaitUntilCommand(() -> swerve.reachedAutoAlignTarget())
                        .andThen(shootCommand.whileHeld())))
        .onFalse(shootCommand.onRelease());

    // DEFAULT SHOOT
    driverA
        .rightBumper()
        .whileTrue(
            new StartEndCommand(
                () -> {
                  shooterController.setTargetState(ShooterState.DEFAULT_SHOOT);
                  intakeController.setTargetState(IntakeState.IDLE);
                },
                () -> shooterController.setTargetState(ShooterState.TOTAL_SPIN_UP)));

    // DEFAULT TRENCH SHOOT
    driverA
        .povDown()
        .whileTrue(
            new StartEndCommand(
                () -> {
                  shooterController.setTargetState(ShooterState.TRENCH_SHOOT);
                  intakeController.setTargetState(IntakeState.IDLE);
                },
                () -> shooterController.setTargetState(ShooterState.TOTAL_SPIN_UP)));

    // ARC ALIGN
    // driverA
    //     .leftBumper()
    //     .whileTrue(
    //         new AlignToPoseCommand(swerve, () -> RobotState.getInstance().getShootingPose(),
    // true)
    //             .alongWith(
    //                 new WaitUntilCommand(
    //                         () ->
    //                             RobotState.getInstance()
    //                                     .getEstimatedPose()
    //                                     .getTranslation()
    //                                     .getDistance(
    //                                         RobotState.getInstance()
    //                                             .getAlignPose()
    //                                             .getTranslation())
    //                                 < 1)
    //                     .andThen(
    //
    // shooterController.setTargetStateCommand(ShooterState.TOTAL_SPIN_UP))));

    // ALIGN TO SHOOT
    driverA
        .leftBumper()
        .whileTrue(
            new AlignToShootCommand(swerve, shooterController).alongWith(shootCommand.whileHeld()))
        .onFalse(shootCommand.onRelease());

    driverB
        .b()
        .onTrue(shootCommand.setJustShootCommand(true))
        .onFalse(shootCommand.setJustShootCommand(false));
  }

  private void configureDriverBButtons() {
    driverB
        .leftBumper()
        .onTrue(
            intakeController
                .setTargetStateCommand(IntakeState.REVERSE)
                .alongWith(shooterController.setTargetStateCommand(ShooterState.REVERSE)));

    driverB
        .x()
        .onTrue(
            shooterController
                .setStoppedCommand(true)
                .alongWith(intakeController.setStoppedCommand(true)));
    driverB.a().onTrue(intakeController.setTargetStateCommand(IntakeState.SHOOTING_STOW));

    driverB.rightBumper().onTrue(intakeController.setTargetStateCommand(IntakeState.INTAKE));

    driverB.povLeft().onTrue(intakeController.zeroCommand());
    driverB.povLeft().onFalse(intakeController.stopZeroingCommand());

    driverB.povDown().onTrue(shooterController.zeroCommand());
    driverB.povDown().onFalse(shooterController.stopZeroingCommand());

    driverB.rightTrigger().onTrue(new InstantCommand(() -> swerve.setIsBeingDefended(true)));
    driverB.leftTrigger().onTrue(new InstantCommand(() -> swerve.setIsBeingDefended(false)));

    driverB.y().onTrue(intakeController.setTargetStateCommand(IntakeState.INTAKE_SLOW));
  }

  private void configureAutos() {
    RobotConfig robotConfig;
    try {
      robotConfig = RobotConfig.fromGUISettings();
    } catch (Exception e) {
      e.printStackTrace();
      robotConfig = null;
    }

    var passRobotConfig = robotConfig; // workaround TODO: is it necessary?

    AutoBuilder.configure(
        () -> RobotState.getInstance().getEstimatedPose(),
        (pose) -> RobotState.getInstance().resetPose(pose),
        () -> swerve.getRobotSpeeds(),
        (speeds) -> {
          swerve.setTrajectorySpeeds(speeds);
        },
        DriveConstants.HOLONOMIC_DRIVE_CONTROLLER,
        passRobotConfig,
        () -> RobotState.isAllianceRed(),
        swerve);

    autoChooser =
        new LoggedDashboardChooser<Command>("Auto Chooser", AutoBuilder.buildAutoChooser());
    VisionTuningCommands.addTuningCommandsToAutoChooser(vision, autoChooser);
    SmartDashboard.putData("Auto Chooser", autoChooser.getSendableChooser());
  }

  public Command getAutoCommand() {
    return autoChooser.get();
  }

  // runs when auto starts
  public void autoInit() {
    // Smart zero the robot
    CommandScheduler.getInstance().schedule(new InstantCommand(() -> swerve.smartZeroGyro()));
    intakeController.stopZeroing();
  }

  // runs when teleop starts
  public void teleopInit() {
    CommandScheduler.getInstance().schedule(new VibrateHIDCommand(driverB.getHID(), 5, .5));
    swerve.setNeutralMode(NeutralModeValue.Brake);
  }

  /** Ran when periodic disabled */
  public void updateDashboardStatus() {
    // TODO: Define all of the dashboard outputs here
    var selectedAuto = autoChooser.get();
    SmartDashboard.putString(
        "Current Auto", selectedAuto != null ? selectedAuto.getName() : "None");
  }

  public static double doubleToDegrees(double angle) {
    return (angle % 360 + 360) % 360;
  }

  public static double relativeAngularDifference(double currentAngle, double newAngle) {
    return (doubleToDegrees(newAngle - currentAngle) + 180) % 360 - 180;
  }

  /** Ran every 20 milliseconds */
  public void updateSimulation() {
    if (Constants.getRobotMode() != Constants.Mode.SIM) return;

    Logger.recordOutput("Testing/Blank Pose3d", new Pose3d());

    SimulatedArena.getInstance().simulationPeriodic();
    RobotSimState.getInstance().getFuelSim().updateSim();
    Logger.recordOutput(
        "Field Simulation/Robot Position",
        RobotSimState.getInstance().getDriveSimulation().getSimulatedDriveTrainPose());
    Logger.recordOutput(
        "Field Simulation/Robot Fuel", RobotSimState.getInstance().getIntakeGamePieces());
    Logger.recordOutput("Field Simulation/Fuel Count", RobotSimState.getInstance().getFuelCount());

    // Update the shooting logic with the correct rollers
    RobotSimState.getInstance()
        .setShooterRunning(
            shooterFlywheels.getCurrentVelocity().in(MetersPerSecond) > 1.0
                && shooterAccelerator.getCurrentVelocity().in(RotationsPerSecond) > 1.0
                && shooterOmniwheel.getCurrentVelocity().in(RotationsPerSecond) > 1.0,
            20.0,
            Units.Rotations.of(.25).minus(Units.Rotations.of(shooterHood.getPosition())),
            ShooterHoodConstants.BASE_TO_SHOOTER_HOOD_TRANSFORM.plus(
                new Transform3d(new Translation3d(), new Rotation3d(0, 0, -Math.PI / 2))),
            shooterFlywheels.getCurrentVelocity(),
            Units.Inches.of(26));

    // Handle automatic shooter firing
    RobotSimState.getInstance().periodicShooter();
  }
}
