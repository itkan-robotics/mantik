// Copyright (c) 2026 FRC Team 1701 Robocubs
// http://github.com/Robocubs
//
// Use of this source code is governed by an MIT-style
// license that can be found in the LICENSE file at
// the root directory of this project.

package frc.robot;

import java.util.Optional;

import edu.wpi.first.math.filter.Debouncer.DebounceType;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import edu.wpi.first.wpilibj2.command.button.RobotModeTriggers;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import frc.robot.autonomous.AutoRoutines;
import frc.robot.autonomous.LoggedAutoChooser;
import frc.robot.commands.DriveCommands;
import frc.robot.commands.SubsystemScheduler;
import frc.robot.commands.characterization.DriveCharacterization;
import frc.robot.simulation.SimRobotState;
import frc.robot.subsystems.drive.Drive;
import frc.robot.subsystems.drive.DriveIOHardware;
import frc.robot.subsystems.drive.DriveIOReplay;
import frc.robot.subsystems.drive.DriveIOSim;
import frc.robot.subsystems.intake.Intake;
import frc.robot.subsystems.intake.IntakeIO;
import frc.robot.subsystems.intake.IntakeIOHardware;
import frc.robot.subsystems.intake.IntakeIOSim;
import frc.robot.subsystems.leds.LED;
import frc.robot.subsystems.leds.LEDIO;
import frc.robot.subsystems.leds.LEDIOHardware;
import frc.robot.subsystems.superstructure.Superstructure;
import frc.robot.subsystems.superstructure.flywheel.FlywheelIO;
import frc.robot.subsystems.superstructure.flywheel.FlywheelIOHardware;
import frc.robot.subsystems.superstructure.flywheel.FlywheelIOSim;
import frc.robot.subsystems.superstructure.hood.HoodIO;
import frc.robot.subsystems.superstructure.hood.HoodIOHardware;
import frc.robot.subsystems.superstructure.hood.HoodIOSim;
import frc.robot.subsystems.superstructure.indexer.IndexerIO;
import frc.robot.subsystems.superstructure.indexer.IndexerIOHardware;
import frc.robot.subsystems.superstructure.indexer.IndexerIOSim;
import frc.robot.subsystems.superstructure.kicker.KickerIO;
import frc.robot.subsystems.superstructure.kicker.KickerIOHardware;
import frc.robot.subsystems.superstructure.kicker.KickerIOSim;
import frc.robot.subsystems.superstructure.turret.TurretIO;
import frc.robot.subsystems.superstructure.turret.TurretIOHardware;
import frc.robot.subsystems.superstructure.turret.TurretIOSim;
import frc.robot.subsystems.vision.Vision;
import frc.robot.subsystems.vision.VisionConstants;
import frc.robot.subsystems.vision.apriltag.AprilTagIO;
import frc.robot.subsystems.vision.apriltag.AprilTagIOHardware;
import frc.robot.subsystems.vision.apriltag.AprilTagIOSim;
import org.littletonrobotics.junction.AutoLogOutput;

import static edu.wpi.first.wpilibj2.command.Commands.*;

/**
 * This class is where the bulk of the robot should be declared. Since Command-based is a
 * "declarative" paradigm, very little robot logic should actually be handled in the {@link Robot}
 * periodic methods (other than the scheduler calls). Instead, the structure of the robot (including
 * subsystems, commands, and button mappings) should be declared here.
 */
public class RobotContainer {
    // Subsystems
    protected final Drive drive;
    protected final Vision vision;
    protected final Intake intake;
    protected final LED leds;
    protected final Superstructure superstructure;

    // Controller
    private final CommandXboxController driverController = new CommandXboxController(0);

    // Other
    private final RobotState robotState = RobotState.getInstance();
    Optional<SimRobotState> simRobotState = Optional.empty();

    // Brownout Protection
    private boolean enableAutoBrownoutProtection = true;
    private @AutoLogOutput boolean isRunningBrownoutProtection = false;

    public RobotContainer() {
        switch (Constants.currentMode) {
            case REAL:
                drive = new Drive(new DriveIOHardware());
                vision = new Vision(new AprilTagIO[] {
                    new AprilTagIOHardware(VisionConstants.turretCameraConfig),
                    new AprilTagIOHardware(VisionConstants.fixedCameraConfig)
                });
                intake = new Intake(new IntakeIOHardware());
                leds = new LED(new LEDIOHardware());
                superstructure = new Superstructure(
                        new FlywheelIOHardware(),
                        new HoodIOHardware(),
                        new TurretIOHardware(),
                        new IndexerIOHardware(),
                        new KickerIOHardware());
                break;
            case SIM:
                var simRobotState = new SimRobotState();
                this.simRobotState = Optional.of(simRobotState);
                drive = new Drive(new DriveIOSim(simRobotState));
                vision = new Vision(new AprilTagIO[] {
                    new AprilTagIOSim(VisionConstants.turretCameraConfig, simRobotState),
                    new AprilTagIOSim(VisionConstants.fixedCameraConfig, simRobotState)
                });
                leds = new LED(new LEDIO() {});
                intake = new Intake(new IntakeIOSim(simRobotState));
                superstructure = new Superstructure(
                        new FlywheelIOSim(simRobotState),
                        new HoodIOSim(simRobotState),
                        new TurretIOSim(simRobotState),
                        new IndexerIOSim(simRobotState),
                        new KickerIOSim(simRobotState) {});
                break;
            default:
                drive = new Drive(new DriveIOReplay());
                vision = new Vision(new AprilTagIO[] {
                    () -> VisionConstants.turretCameraConfig, () -> VisionConstants.fixedCameraConfig
                });
                intake = new Intake(new IntakeIO() {});
                leds = new LED(new LEDIO() {});
                superstructure = new Superstructure(
                        new FlywheelIO() {}, new HoodIO() {}, new TurretIO() {}, new IndexerIO() {}, new KickerIO() {});
                break;
        }

        SmartDashboard.putData(drive);
        SmartDashboard.putData(intake);
        SmartDashboard.putData(superstructure);

        // Set up auto routines
        configureAutoRoutines();
        configureButtonBindings();
    }

    private void configureAutoRoutines() {
        var autoChooser = new LoggedAutoChooser("Autonomous");
        RobotModeTriggers.autonomous()
                .whileTrue(autoChooser.selectedCommandScheduler().withName("Autonomous"));

        var superstructureScheduler = new SubsystemScheduler<Superstructure>(superstructure, superstructure.stop());
        var intakeScheduler = new SubsystemScheduler<Intake>(intake, intake.stop());

        var autoRoutines = new AutoRoutines(drive, superstructureScheduler, intakeScheduler);

        autoChooser.addRoutine("Left2PassStraightStraight", autoRoutines::left2PassStraightStraight);
        autoChooser.addRoutine("Right2PassStraightStraight", autoRoutines::right2PassStraightStraight);
        autoChooser.addRoutine("Left2PassStraightInside", autoRoutines::left2PassStraightInside);
        autoChooser.addRoutine("Right2PassStraightInside", autoRoutines::right2PassStraightInside);
        autoChooser.addRoutine("FollowLeft", autoRoutines::followLeft);
        autoChooser.addRoutine("FastLeftWithDepot", autoRoutines::fastLeftWithDepot);
        autoChooser.addRoutine("FastLeft", autoRoutines::fastLeft);
        autoChooser.addRoutine("FastRight", autoRoutines::fastRight);
        autoChooser.addRoutine("NewLeftFinalVersion", autoRoutines::newLeftFinalVersion);
        autoChooser.addRoutine("NewRightFinalVersion", autoRoutines::newRightFinalVersion);
        autoChooser.addRoutine("StationToBump", autoRoutines::stationToBump);
        autoChooser.addRoutine("Depot", autoRoutines::depot);
        autoChooser.addRoutine("ShootInPlace", autoRoutines::shootInPlace);
        autoChooser.addRoutine("HairpinDepot", autoRoutines::hairpinDepot);

        if (Constants.characterizationEnabled) {
            var characterizationChooser = new LoggedAutoChooser("Characterization");
            autoChooser.addCmd("Characterization", characterizationChooser::selectedCommandScheduler);

            characterizationChooser.addCmd("Drive Wheel Radius", () -> DriveCharacterization.wheelRadius(drive));
            DriveCharacterization.translationSysId(drive).addAutos(characterizationChooser, "Drive Translation");
            DriveCharacterization.steerSysId(drive).addAutos(characterizationChooser, "Drive Steer");
            DriveCharacterization.rotationSysId(drive).addAutos(characterizationChooser, "Drive Rotation");

            superstructure.flywheelSysId().addAutos(characterizationChooser, "Superstructure Flywheel");
            superstructure.hoodSysId().addAutos(characterizationChooser, "Superstructure Hood");
            superstructure.turretSysId().addAutos(characterizationChooser, "Superstructure Turret");
            superstructure.indexerSysId().addAutos(characterizationChooser, "Superstructure Indexer");
            superstructure.kickerSysId().addAutos(characterizationChooser, "Superstructure Kicker");

            intake.extensionSysId().addAutos(characterizationChooser, "Intake Extension");
        }
    }

    private void configureButtonBindings() {
        DriverStation.silenceJoystickConnectionWarning(true);

        // Default commands
        drive.setDefaultCommand(DriveCommands.joystickDrive(
                drive,
                () -> -driverController.getLeftY(),
                () -> -driverController.getLeftX(),
                () -> -driverController.getRightX(),
                driverController.rightTrigger(),
                driverController.leftTrigger()));

        intake.setDefaultCommand(intake.defaultCommand());

        superstructure.setDefaultCommand(superstructure.defaultCommand());

        driverController.rightBumper().whileTrue(drive.brake());

        driverController
                .start()
                .onTrue(runOnce(() ->
                                robotState.resetHeading(RobotState.isBlue() ? Rotation2d.kZero : Rotation2d.k180deg))
                        .withName("ResetHeading"));

        driverController.back().onTrue(superstructure.stop());
        driverController.back().onTrue(intake.stop());

        driverController.rightTrigger().whileTrue(superstructure.shoot());
        driverController
                .leftTrigger()
                .and(() -> !robotState.inAllianceZone() && !robotState.onAllianceBump())
                .whileTrue(superstructure.feed());

        driverController.leftBumper().whileTrue(superstructure.shootWithTuning());

        driverController.y().onTrue(intake.agitate());
        driverController.a().onTrue(intake.stop());
        driverController.x().onTrue(intake.zeroRoutine());
        driverController.b().onTrue(intake.stow());
        driverController.povDown().whileTrue(intake.reverse());
        driverController.povUp().whileTrue(superstructure.unjam());
        driverController
                .povRight()
                .whileTrue(parallel(intake.reverse(), superstructure.reverse()).withName("ReverseAll"));

        driverController
                .povLeft()
                .onTrue(runOnce(() -> {
                            enableAutoBrownoutProtection = false;
                            isRunningBrownoutProtection = !isRunningBrownoutProtection;
                            drive.setBrownoutProtection(isRunningBrownoutProtection);
                            intake.setBrownoutProtection(isRunningBrownoutProtection);
                            superstructure.setBrownoutProtection(isRunningBrownoutProtection);
                        })
                        .ignoringDisable(true)
                        .withName("ToggleBrownoutProtection"));

        new Trigger(() -> RobotController.isBrownedOut() && enableAutoBrownoutProtection)
                .debounce(5.0, DebounceType.kFalling)
                .onTrue(runOnce(() -> {
                            isRunningBrownoutProtection = true;
                            drive.setBrownoutProtection(true);
                            intake.setBrownoutProtection(true);
                            superstructure.setBrownoutProtection(true);
                        })
                        .ignoringDisable(true)
                        .withName("EnableBrownoutProtection"))
                .onFalse(runOnce(() -> {
                            isRunningBrownoutProtection = false;
                            drive.setBrownoutProtection(false);
                            intake.setBrownoutProtection(false);
                            superstructure.setBrownoutProtection(false);
                        })
                        .ignoringDisable(true)
                        .unless(() -> !enableAutoBrownoutProtection)
                        .withName("DisableBrownoutProtection"));

        // Dashboard bindings
        SmartDashboard.putData("ZeroIntake", intake.zeroRoutine());
        SmartDashboard.putData("ZeroSuperstructure", superstructure.zero());
    }
}
