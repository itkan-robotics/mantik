// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import java.util.Set;
import java.util.function.DoubleSupplier;
import java.util.function.Supplier;
import choreo.auto.AutoChooser;
import choreo.auto.AutoFactory;
import com.spamrobotics.util.AllianceZone;
import com.spamrobotics.util.DoubleFunction;
import com.spamrobotics.util.Helpers;
import com.spamrobotics.util.JoystickInputs;
import com.spamrobotics.util.StatusSignalLoop;
import com.spamrobotics.util.Zone;
import edu.wpi.first.epilogue.Logged;
import edu.wpi.first.epilogue.NotLogged;
import edu.wpi.first.epilogue.Logged.Importance;
import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.filter.Debouncer.DebounceType;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.wpilibj.PowerDistribution;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.RobotState;
import edu.wpi.first.wpilibj.Timer;
import edu.wpi.first.wpilibj.GenericHID.RumbleType;
import edu.wpi.first.wpilibj.PowerDistribution.ModuleType;
import edu.wpi.first.wpilibj.smartdashboard.SendableChooser;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import edu.wpi.first.wpilibj2.command.button.RobotModeTriggers;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import frc.robot.generated.TunerConstants;
import frc.robot.subsystems.DrivetrainSubsystem;
import frc.robot.subsystems.Flashlight;
import frc.robot.subsystems.hood.HoodSubystem;
import frc.robot.subsystems.indexer.IndexerSubsystem;
import frc.robot.subsystems.intake.IntakeSubsystem;
import frc.robot.subsystems.intake_extension.IntakeExtensionSubsystem;
import frc.robot.subsystems.intake_extension.IntakeExtensionSubsystem.Position;
import frc.robot.subsystems.kicker.KickerSubsystem;
import frc.robot.subsystems.prekicker.Prekicker;
import frc.robot.subsystems.turret.TurretSubsystem;
import frc.robot.subsystems.turret.TurretSubsystem.GoalTarget;
import frc.robot.subsystems.vision.VisionSubsystem;
import frc.robot.util.ShotTables;
import frc.robot.util.simulation.SimUtils;
import frc.robot.subsystems.shooter.ShooterSubsystem;
import frc.robot.commands.ClosestAngleCommand;
import frc.robot.commands.DefaultDriveCommand;
import frc.robot.commands.RumbleCommand;

@Logged(importance = Logged.Importance.INFO)
public class RobotContainer {

    public static final double DEADBAND = 0.025;
    public static RobotContainer instance;

    public static final double NO_CAMERA_DEFAULT_DISTANCE = 3.2 - .05;

    private final Telemetry logger = new Telemetry();

    public final CommandXboxController driverController = new CommandXboxController(0);
    private final JoystickInputs inputs = new JoystickInputs();

    private final StatusSignalLoop statusSignalLoop = new StatusSignalLoop(250.0, "TurretThread");

    private final PowerDistribution pdh;

    // Define all subsystems here
    public final DrivetrainSubsystem drivetrain;
    @Logged
    public final TurretSubsystem turret;
    public final IntakeSubsystem intake;
    public final IntakeExtensionSubsystem intakeExtension;
    @Logged
    public final ShooterSubsystem shooter;
    public final KickerSubsystem kicker;
    public final HoodSubystem hood;
    @Logged(name = "Vision")
    public final VisionSubsystem vision;
    @Logged
    public final IndexerSubsystem indexer;
    @Logged
    public final Prekicker prekicker;
    public final Flashlight flashlight;

    /* Path follower */
    private final AutoFactory autoFactory;
    private final AutoRoutines autoRoutines;
    @NotLogged
    private final AutoChooser autoChooser = new AutoChooser();
    @NotLogged
    final SendableChooser<Boolean> feedPriorityChooser = new SendableChooser<>();

    public boolean receivedAutoWinner = false;
    public boolean hasAppliedAutoWinnerOverride = false;
    public boolean autoWinnerBlue = false;
    public boolean choreoWarmedUp = false;

    public Command autoWinnerBlueCommand = Commands.runOnce(() -> {
        autoWinnerBlue = true;
        hasAppliedAutoWinnerOverride = true;
    }).ignoringDisable(true);

    public Command autoWinnerRedCommand = Commands.runOnce(() -> {
        autoWinnerBlue = false;
        hasAppliedAutoWinnerOverride = true;
    }).ignoringDisable(true);


    public Trigger inAllianceZone;
    public Trigger shooterAtSetpoint;
    public Trigger hoodAtSetpoint;
    public Trigger shootReady;
    @Logged(importance = Importance.CRITICAL)
    public Trigger smartShoot;
    public Trigger noFuelFlowing;
    
    public Trigger inBottomFeedZone;

    public RobotContainer() {
        instance = this;

        pdh = new PowerDistribution(1, ModuleType.kRev);
        pdh.setSwitchableChannel(false);
    
        drivetrain = TunerConstants.createDrivetrain();
        turret = new TurretSubsystem();
        vision = new VisionSubsystem();
        intake = new IntakeSubsystem();
        intakeExtension = new IntakeExtensionSubsystem();
        shooter = new ShooterSubsystem();
        kicker = new KickerSubsystem();
        hood = new HoodSubystem();
        indexer = new IndexerSubsystem();
        prekicker = new Prekicker();
        flashlight = new Flashlight(true, pdh);

        autoFactory = drivetrain.createAutoFactory();
        autoRoutines = new AutoRoutines(autoFactory);


        autoChooser.addRoutine("L BUMP High -> Low", autoRoutines::leftHighBumpLow);
        autoChooser.addRoutine("R BUMP High -> Low", autoRoutines::rightHighBumpLow);
        autoChooser.addRoutine("L High -> Low", autoRoutines::leftHighLow);
        autoChooser.addRoutine("L Mid -> Low", autoRoutines::leftMidLow);
        autoChooser.addRoutine("R High -> Low", autoRoutines::rightHighLow);
        autoChooser.addRoutine("R Mid -> Low", autoRoutines::rightMidLow);
        autoChooser.addRoutine("M Hub", autoRoutines::middleHub);
        autoChooser.addRoutine("L Follow", autoRoutines::leftFollow);

        SmartDashboard.putData("Auto Chooser", autoChooser);

        feedPriorityChooser.setDefaultOption("Right", true);
        feedPriorityChooser.addOption("Left", false);

        SmartDashboard.putData("Blue Auto Override", autoWinnerBlueCommand);
        SmartDashboard.putData("Red Auto Override", autoWinnerRedCommand);
        SmartDashboard.putData("Feed Priority", feedPriorityChooser);

        SmartDashboard.putData("Flashlight On", flashlight.enable());
        SmartDashboard.putData("Flashlight Off", flashlight.disable());

        SmartDashboard.putData("Shoot Add Percent", changeShooterPercent(0.01));
        SmartDashboard.putData("Shoot Lower Percent", changeShooterPercent(-0.01));

        SmartDashboard.putNumber("FollowWait", 4.5);

        statusSignalLoop.register(turret);
        statusSignalLoop.start();

        configureBindings();
        RobotController.setBrownoutVoltage(6);

        // Choreo warmup
        if (RobotState.isDisabled()) {
            CommandScheduler.getInstance().schedule(Helpers.fastSequence(
                Commands.print("Choreo warmup beginning..."),
                autoFactory.trajectoryCmd("DriveStraight_2_5_m_one").ignoringDisable(true),
                Commands.print("Choreo warmup complete!").alongWith(Commands.runOnce(() -> choreoWarmedUp = true))
            ).ignoringDisable(true));
        }
    }

    private void configureBindings() {
        final Trigger testMode = RobotModeTriggers.test();
        final Trigger auto = RobotModeTriggers.autonomous();
        final Trigger enabled = RobotModeTriggers.disabled().negate();
        final Trigger notTestMode = testMode.negate();
        final Trigger turretCameraConnected = new Trigger(vision::isTurretCameraConnected);

        noFuelFlowing = new Trigger(() -> kicker.getSecondsSinceLostTarget() >= 0.75);

        Zone blueBottomFeedZone = new Zone(
            new Translation2d(5.299, 3.468),
            new Translation2d(11.245, 6.083),
            new Translation2d(16.7225, 8.313),
            new Translation2d(16.8602, -0.2744),
            new Translation2d(4.886, -0.4395),
            new Translation2d(5.299, 3.468)
        );

        AllianceZone bottomFeedZone = AllianceZone.fromBlue(blueBottomFeedZone);
        AllianceZone topFeedZone = AllianceZone.fromBlue(blueBottomFeedZone.yFlip());
        inBottomFeedZone = new Trigger(() -> {
            boolean feedBottom = feedPriorityChooser.getSelected();
            if (feedBottom) {
                return isTurretInZone(bottomFeedZone.get());
            } else {
                return !isTurretInZone(topFeedZone.get());
            }
        });

        inAllianceZone = new Trigger(() -> isInAllianceZone(Robot.isBlue()));


        // Remapped buttons on the controller
        final Trigger topLeftPaddle = driverController.povLeft();
        final Trigger bottomLeftPaddle = driverController.povRight();
        final Trigger m1 = driverController.leftStick();
        final Trigger m2 = driverController.rightStick();


        final Trigger shootButton = driverController.rightBumper();
        final Trigger smartShootWanted = driverController.rightTrigger();
        final Trigger slowMode = shootButton.or(smartShootWanted);

        final Trigger turretHome = driverController.x(); 
        final Trigger intakeButton = driverController.leftTrigger().and(driverController.y().negate()).and(enabled);
        final Trigger intakeSpit = driverController.leftTrigger().and(driverController.y()).and(enabled);
        final Trigger intakeRetract = m1.and(m2);   
        final Trigger intakeZero = driverController.a();
        final Trigger hoodZero = driverController.b();

        shooterAtSetpoint = new Trigger(shooter::atLaunchTargetVelocity).debounce(0.4, DebounceType.kFalling);
        hoodAtSetpoint = new Trigger(hood::atTarget).debounce(0.2, DebounceType.kFalling);


        turret.setDefaultCommand(turret.defaultCommand());
        hood.setDefaultCommand(hood.stow());

        turretHome.whileTrue(turret.runControlled(() -> {
            return modifyAxis(driverController.getRightX()) * 0.1;
        }).alongWith(drivetrain.idle()));

        hoodZero.whileTrue(hood.rezero());


        final DoubleFunction axisToLinearSpeed = (axis) -> {
            double speed = modifyAxis(axis) * DrivetrainSubsystem.MAX_SPEED;
            if (slowMode.getAsBoolean()) {
                double limit = 0.25;
                speed *= inAllianceZone.getAsBoolean() ? limit : 0.4;
            }
            return speed;
        };

        final Supplier<JoystickInputs> joystickInputsSupplier = () -> {
            return inputs.of(-driverController.getLeftY(), -driverController.getLeftX())
                            .deadband(DEADBAND)
                            .polarDistanceTransform(JoystickInputs.SQUARE_KEEP_SIGN)
                            .clamp(1)
                            .transform(axisToLinearSpeed);
        };

        final DoubleSupplier rotationSupplier = () -> {
            double axis = -modifyAxis(driverController.getRightX());
            axis *= 0.8;
            return axis * DrivetrainSubsystem.MAX_ANGULAR_RATE;
        };

        drivetrain.setDefaultCommand(new DefaultDriveCommand(drivetrain, joystickInputsSupplier, rotationSupplier, slowMode::getAsBoolean).withSlowMode(slowMode));
        driverController.back().onTrue(Commands.runOnce(drivetrain::zeroGyroscope));
        
        bottomLeftPaddle.whileTrue(new ClosestAngleCommand(drivetrain, 45, 135, -45, -135));
        topLeftPaddle.whileTrue(new ClosestAngleCommand(drivetrain, 0, 180));


        SmartDashboard.putData("Table Copy", turret.t_copyTableToTuning());
        SmartDashboard.putNumber("Hood Degrees", 10);
        SmartDashboard.putNumber("Shooter RPS", 30);

        Command hoodDashboard = Commands.defer(() -> {
            return hood.targetDegrees(SmartDashboard.getNumber("Hood Degrees", 20));
        }, Set.of(hood));

        Command shooterDashboard = Commands.defer(() -> {
            return shooter.runVelocity(SmartDashboard.getNumber("Shooter RPS", 50));
        }, Set.of(shooter));

        double hubProcessTimeStart = 0.5;
        double hubProcessTimeEnd = 1.32; // higher = stop shoot sooner
        double hubStartProcessing = 0 + hubProcessTimeStart;
        double hubEndProcessing = 3 - hubProcessTimeEnd;

        smartShoot = new Trigger(() -> {
            if (Robot.hubActive() || turret.isTargetingFeed()) return true;

            double timeOfFlight = ShotTables.getHubShotTable().getTimeOfFlight(turret.getSimpleDistanceToHub());
            double timeSinceActive = Timer.getFPGATimestamp() - Robot.lastShiftActiveTime();
            boolean preshoot = Robot.timeUntilNextActiveShift() - hubStartProcessing <= timeOfFlight;
            boolean endshoot = hubEndProcessing - timeSinceActive >= timeOfFlight;
            return preshoot || endshoot;
        });

        Trigger shootWanted = shootButton.or(smartShootWanted);

        shootWanted.whileTrue(flashlight.enabledWhenAppropriate());

        shootWanted.and(turret::isTargetingHub)
            .whileTrue(drivetrain.centerOfRotation(TurretSubsystem.ROBOT_TO_TURRET.getTranslation()));

        Command prepareShooter = Commands.parallel(
            shooter.runVelocityShotTable(),
            hood.targetDegreesShotTable(),
            turretAim()
        );

        Command prepareShooterNoVision = Commands.parallel(
            shooter.runVelocityDistance(NO_CAMERA_DEFAULT_DISTANCE),
            hood.targetDegreesDistance(NO_CAMERA_DEFAULT_DISTANCE),
            turret.runAngle(0)
        );

        Command testShooter = Commands.parallel(
            shooterDashboard,
            hoodDashboard,
            turretAim()
        );

        final Trigger shootWantedNormal = shootWanted.and(notTestMode);

        shootWantedNormal.and(turretCameraConnected).whileTrue(prepareShooter);
        shootWantedNormal.and(turretCameraConnected.negate()).whileTrue(prepareShooterNoVision);
        shootWanted.and(testMode).whileTrue(testShooter);

        shootReady = shootWanted.or(() -> AutoRoutines.autoShoot)
                        .and(turret::atTarget)
                        .and(turret::isShotValid)
                        .and(hoodAtSetpoint)
                        .and(shooterAtSetpoint)
                        .and(smartShootWanted.negate().or(smartShoot));



        final double[] lastSimShootTime = {0};
        Command simShoot = Commands.run(() -> {
            if (Timer.getFPGATimestamp() - lastSimShootTime[0] >= 1.0 / SimUtils.FUEL_PER_SECOND) {
                SimUtils.shootFuel();
                lastSimShootTime[0] = Timer.getFPGATimestamp();
            }
        });

        shootReady.whileTrue(indexer.runForShoot().alongWith(
            kicker.runForShoot(),
            prekicker.runPower(Prekicker.DEFAULT_POW),
            shooter.withTargetMargin(() -> turret.isTargetingHub() ? 2 : 4),
            Robot.isReal() ? Commands.none() : simShoot
        ));

        intakeButton.or(intakeSpit).whileTrue(intakeExtension.targetPosition(Position.EXTENDED));

        intakeButton.whileTrue(intake.runIntake());

        intakeSpit.and(() -> intakeExtension.atPositionGenerous(Position.EXTENDED.getValue()))
                  .whileTrue(intake.runSpit());

        intakeRetract.whileTrue(intakeExtension.goToPosition(Position.STOWED));

        intakeZero.whileTrue(intakeExtension.startHome());
        intakeZero.onFalse(intakeExtension.finishHome());


        driverController.leftBumper().and(intakeButton.negate())
            .whileTrue(limitedIntakeJostle()); 


        Trigger canJostle = new Trigger(indexer::canJostle);

        shootWanted
            .and(auto.negate())
            .and(intakeButton.negate())
            .and(intakeSpit.negate())
            .and(canJostle)
                .whileTrue(Commands.either(limitedIntakeJostle(), Commands.none(), () -> !intakeExtension.isTargeting(Position.STOWED)));

        final Trigger activeShiftWarning = new Trigger(() -> {
            double shiftStartTime = Robot.timeUntilNextActiveShift();
            return shiftStartTime >= 0 && shiftStartTime <= 4;
        });

        Command rumbleWarning = Commands.sequence(
            rumble(1).withTimeout(0.25),
            rumble(0).withTimeout(0.75)
        ).repeatedly();

        activeShiftWarning.whileTrue(rumbleWarning);

        final Trigger activeShift = new Trigger(Robot::hubActive);
        activeShift.onTrue(rumble(1).withTimeout(2));


        final Trigger inactiveShiftWarning = new Trigger(() -> {
            double shiftEndTime = Robot.timeUntilNextInactiveShift();
            return shiftEndTime >= 0 && shiftEndTime <= 4;
        });

        Command inactiveRumble = new RumbleCommand(driverController, RumbleType.kRightRumble, 0.1);
        inactiveShiftWarning.onTrue(inactiveRumble.withTimeout(4));

        drivetrain.registerTelemetry(logger::telemeterize);
    }

    public Command getAutonomousCommand() {
        return autoChooser.selectedCommand();
    }

    static final Translation2d TOP_CORNER_FEED_BLUE = new Translation2d(1.7, 6.5);
    static final Translation2d BOTTOM_CORNER_FEED_BLUE = new Translation2d(1.7, 1.8);

    static final Translation2d TOP_CORNER_FEED_RED = Helpers.allianceFlip(TOP_CORNER_FEED_BLUE);
    static final Translation2d BOTTOM_CORNER_FEED_RED = Helpers.allianceFlip(BOTTOM_CORNER_FEED_BLUE);

    public Command turretHubAim() {
        return turret.pointAt(() -> vision.getAllianceHub().getTranslation());
    }

    public Command turretAim() {
        return turret.pointAt(() -> {
            if (turret.getGoalTarget() == GoalTarget.HUB) {
                return vision.getAllianceHub().getTranslation();
            }

            Pose2d turretPose = turret.getPose();
            Translation2d top = Robot.isBlue() ? TOP_CORNER_FEED_BLUE : TOP_CORNER_FEED_RED;
            Translation2d bottom = Robot.isBlue() ? BOTTOM_CORNER_FEED_BLUE : BOTTOM_CORNER_FEED_RED;
            double distToTop = turretPose.getTranslation().getDistance(top);
            double distToBottom = turretPose.getTranslation().getDistance(bottom);

            if (isInAllianceZone(!Robot.isBlue())) {
                // If in opponent alliance zone, prefer the feed corner that is closer to the turret
                if (distToTop < distToBottom) {
                    return top;
                } else {
                    return bottom;
                }
            } else {
                if (inBottomFeedZone.getAsBoolean()) {
                    return bottom;
                } else {
                    return top;
                }
            }
        });
    }

    public Command intakeJostle() {
        return Helpers.fastSequence(            
            intakeExtension.goToPosition(Position.STOWED).withTimeout(1),
            Commands.waitSeconds(0.1),
            intakeExtension.goToPosition(Position.EXTENDED).withTimeout(1)
        ).repeatedly()
        .alongWith(intake.runJostle())
        .finallyDo(() -> intakeExtension.targetPosition(Position.EXTENDED).withTimeout(0).schedule());
    }

    public Command limitedIntakeJostle() {
        return Helpers.fastSequence(            
            intakeExtension.goToPosition(Position.STOWED).withTimeout(1),
            Commands.waitSeconds(0.1),
            intakeExtension.goToPosition(Position.EXTENDED).withTimeout(1),
            intakeExtension.goToPosition(Position.STOWED).withTimeout(1)
        )
        .alongWith(intake.runJostle())
        .finallyDo(() -> intakeExtension.targetPosition(Position.EXTENDED).withTimeout(0).schedule());
    }

    public Command singleJostle() {
        return intakeExtension.targetPosition(Position.FUEL_JOSTLE, IntakeExtensionSubsystem.MAX_VELOCITY, 40);
    }

    public Command rumble(double strength) {
        return new RumbleCommand(driverController, RumbleType.kBothRumble, strength);
    }

    private Command changeShooterPercent(double change) {
        return Commands.runOnce(() -> {
            double current = SmartDashboard.getNumber("Shooter % Adjust", 1);
            SmartDashboard.putNumber("Shooter % Adjust", current + change);
        }).ignoringDisable(true);
    }

    private boolean isTurretInZone(Zone zone) {
        return zone.contains(turret.getPose().getTranslation());
    }

    static final double ALLIANCE_ZONE_X_THRESHOLD = 4.7;

    public boolean isInAllianceZone(boolean blueAlliance) {
        if (blueAlliance) {
            return drivetrain.getPose().getX() <= ALLIANCE_ZONE_X_THRESHOLD;
        } else {
            return drivetrain.getPose().getX() >= Robot.FIELD_LENGTH - ALLIANCE_ZONE_X_THRESHOLD;
        }
    }

    private static double modifyAxis(double value) {
        value = MathUtil.applyDeadband(value, DEADBAND);
        return Math.copySign(value * value, value);
    }
}
