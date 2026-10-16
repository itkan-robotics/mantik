// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import static edu.wpi.first.units.Units.MetersPerSecond;
import static edu.wpi.first.units.Units.RadiansPerSecond;
import static edu.wpi.first.units.Units.RotationsPerSecond;

import java.util.function.DoubleSupplier;

import com.ctre.phoenix6.swerve.SwerveModule.DriveRequestType;
import com.ctre.phoenix6.swerve.SwerveRequest;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.InstantCommand;
import edu.wpi.first.wpilibj2.command.ParallelCommandGroup;
import edu.wpi.first.wpilibj2.command.RepeatCommand;
import edu.wpi.first.wpilibj2.command.WaitCommand;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import frc.robot.constants.TunerConstants;
import frc.robot.subsystems.Autoaim;
import frc.robot.subsystems.Autoaim.FiringLocation;
import frc.robot.subsystems.Drivetrain;
import frc.robot.subsystems.DyeRotor;
import frc.robot.subsystems.DyeRotor.RotorState;
import frc.robot.subsystems.Hood;
import frc.robot.subsystems.Hood.HoodState;
import frc.robot.subsystems.Intake.IntakeState;
import frc.robot.subsystems.IntakePivot.IntakePivotState;
import frc.robot.subsystems.Intake;
import frc.robot.subsystems.IntakePivot;
import frc.robot.subsystems.Shooter;
import frc.robot.subsystems.Shooter.ShooterState;
import frc.robot.subsystems.Turret;
import frc.robot.subsystems.Turret.TurretState;
import frc.robot.subsystems.vision.Vision;
import frc.robot.subsystems.vision.VisionIO;

public class RobotContainer {
    private double MaxSpeed = 1.0 * TunerConstants.kSpeedAt12Volts.in(MetersPerSecond); // kSpeedAt12Volts desired top speed
    private double MaxAngularRate = RotationsPerSecond.of(0.9).in(RadiansPerSecond); // 3/4 of a rotation per second max angular velocity

    /* Setting up bindings for necessary control of the swerve drive platform */
    private final SwerveRequest.FieldCentric drive = new SwerveRequest.FieldCentric()
            .withDeadband(MaxSpeed * 0.05).withRotationalDeadband(MaxAngularRate * 0.05) // Add a 10% deadband
            .withDriveRequestType(DriveRequestType.OpenLoopVoltage); // Use open-loop control for drive motors

    private final SwerveRequest.SwerveDriveBrake brake = new SwerveRequest.SwerveDriveBrake();

    private final Telemetry logger = new Telemetry(MaxSpeed);

    public final CommandXboxController joystick = new CommandXboxController(0);
    public final CommandXboxController cojoystick = new CommandXboxController(1);

    public final Drivetrain drivetrain;
    public final DyeRotor dyeRotor;
    public final Hood hood;
    public final Intake intake;
    public final IntakePivot intakePivot;
    public final Shooter shooter;
    public final Turret turret;

    public final Autoaim autoaim;

    public final VisionIO visionIO;
    public final Vision vision;

    public RobotMode currentMode = RobotMode.NEUTRAL;
    private Command activeCommand = null;

    public enum RobotMode {
        NEUTRAL,
        AUTOAIM_FIRE,
        PASS_SHOT,
        POOP,
        ZERO,
        STOP
    }

    public RobotContainer(Drivetrain drivetrain, DyeRotor dyeRotor, Hood hood, Intake intake, IntakePivot intakePivot, Shooter shooter, Turret turret, VisionIO visionIO, Vision vision, Autoaim autoaim) {
        this.drivetrain = drivetrain;
        this.dyeRotor = dyeRotor;
        this.hood = hood;
        this.intake = intake;
        this.intakePivot = intakePivot;
        this.shooter = shooter;
        this.turret = turret;
        this.visionIO = visionIO;
        this.vision = vision;
        this.autoaim = autoaim;

        SmartDashboard.putNumber("Shooter/ShootSpeed1", -10);
        SmartDashboard.putNumber("Shooter/ShootSpeed2", -20);
        SmartDashboard.putNumber("Shooter/ShootSpeed3", -40);
        SmartDashboard.putNumber("Shooter/ShootSpeed4", -100);
        
        configureBindings();
    }

    // Manual turret control, field relative
    public Command rotateTurretToJoystick(DoubleSupplier x, DoubleSupplier y) {
        return Commands.run(
                () -> {
                    double controlX = x.getAsDouble();
                    double controlY = y.getAsDouble();

                    if (Math.hypot(controlX, controlY) > 0.05) {
                        double angle = Math.atan2(controlY, controlX);
                        angle -= Math.PI / 2;
                        angle -= drivetrain.getState().Pose.getRotation().getRadians();
                        turret.setOverridePosition(new Rotation2d(angle));
                        turret.setState(TurretState.TRACK_SUPPLIER);
                    }
                }, turret);
    }

    // Manual hood control
    public Command rotateHoodToJoystick(DoubleSupplier y) {
        return Commands.run(
                () -> {
                    double controlY = y.getAsDouble();
                    hood.setState(HoodState.TRACK_SUPPLIER);
                    hood.setOverrideSupplier(((controlY + 1) / 2) * -4.1);
                }, hood);
    }

    // Rotor run command for Hub firing, checks for valid turret and shooter conditions
    public Command runDyeRotorForHubShot() {
        return Commands.run(
            () -> {
                if (turret.atAngleToFire() && shooter.atfullSpeed()) {
                    dyeRotor.setState(RotorState.FULLSPEED_FORWARD);
                } else {
                    dyeRotor.setState(RotorState.STOP);
                }
            }, 
            dyeRotor);
    }

    // Rotor run command for Poop shot, checks for shooter speed and runs lower rotor speed
    public Command runDyeRotorForPoopShot() {
        return Commands.run(
            () -> {
                if (shooter.atfullSpeed()) {
                    dyeRotor.setState(RotorState.LOWSPEED_FORWARD);
                } else {
                    dyeRotor.setState(RotorState.STOP);
                }
            }, 
            dyeRotor);
    }

    // Rotor run command for Pass firing, checks for valid turret, shooter, and drivebase location conditions
    public Command runDyeRotorForPassShot() {
        return Commands.run(
            () -> {
                if (turret.atAngleToFire() && shooter.atfullSpeed() && autoaim.goodToPass()) {
                    dyeRotor.setState(RotorState.FULLSPEED_FORWARD);
                } else {
                    dyeRotor.setState(RotorState.STOP);
                }
            }, 
            dyeRotor);
    }

    // Controls firing superstructure through state machine
    public void setMode(RobotMode newMode) {

        if (newMode == currentMode) return;

        if (activeCommand != null) {
            activeCommand.cancel();
        }

        currentMode = newMode;

        switch (currentMode) {

            // Turn off firing and stop turret and hood, keep flywheel running for hub shot
            case NEUTRAL:
                activeCommand = Commands.runOnce(
                () -> {
                    autoaim.setFiringLocation(FiringLocation.HUB);
                    shooter.setState(ShooterState.FOLLOW_TARGET);
                    turret.setState(TurretState.HOLD);
                    hood.setState(HoodState.HOLD);
                    dyeRotor.setState(RotorState.STOP);
                },
                shooter, dyeRotor, turret);
                break;

            // Hub firing mode
            case AUTOAIM_FIRE:
                activeCommand = new ParallelCommandGroup(
                    Commands.runOnce(
                    () -> {
                        autoaim.setFiringLocation(FiringLocation.HUB);
                        turret.setState(TurretState.TRACK_TARGET);
                        hood.setState(HoodState.TRACK_TARGET);
                        shooter.setState(ShooterState.FOLLOW_TARGET);
                    }, turret, shooter, hood),
                    runDyeRotorForHubShot()
                );
                break;

            // Passing firing mode
            case PASS_SHOT:
                activeCommand = new ParallelCommandGroup(
                    Commands.runOnce(
                    () -> {
                        autoaim.setFiringLocation(FiringLocation.PASS);
                        turret.setState(TurretState.TRACK_TARGET);
                        hood.setState(HoodState.TRACK_SUPPLIER);
                        hood.setOverrideSupplier(-4.1);
                        shooter.setState(ShooterState.FOLLOW_TARGET);
                    }, turret, hood, shooter),
                    runDyeRotorForPassShot()
                );
                break;

            // "Pooping" mode, cycles balls from rotor back into hopper for agitation
            case POOP:
                activeCommand = new ParallelCommandGroup(
                    Commands.runOnce(
                    () -> {
                        autoaim.setFiringLocation(FiringLocation.HUB);
                        turret.setOverridePosition(Rotation2d.k180deg);
                        turret.setState(TurretState.TRACK_SUPPLIER);
                        hood.setState(HoodState.TRACK_SUPPLIER);
                        hood.setOverrideSupplier(-4.1);
                        shooter.setOverrideVelocity(-20);
                        shooter.setState(ShooterState.FOLLOW_SUPPLIER);
                    }, turret, hood, shooter),
                    runDyeRotorForPoopShot()
                );
                break;

            case ZERO:
                activeCommand = Commands.runOnce(
                () -> {
                    autoaim.setFiringLocation(FiringLocation.HUB);
                    shooter.setState(ShooterState.STOP);
                    turret.setOverridePosition(Rotation2d.kZero);
                    turret.setState(TurretState.TRACK_SUPPLIER);
                    hood.setOverrideSupplier(0);
                    hood.setState(HoodState.TRACK_SUPPLIER);
                    dyeRotor.setState(RotorState.STOP);
                },
                shooter, dyeRotor, turret);
                break;

            // Stops all firing components
            case STOP:
                activeCommand = Commands.runOnce(() -> {
                    shooter.setState(ShooterState.STOP);
                    turret.setState(TurretState.STOP);
                    dyeRotor.setState(RotorState.STOP);
                    hood.setState(HoodState.STOP);
                }, shooter, dyeRotor, turret, hood);
                break;
        }

        if (activeCommand != null) {
            activeCommand.schedule();
        }

        return;
    }

    // Used if mode should be "toggled"
    public void toggleMode(RobotMode newMode) {

        if (currentMode == newMode) {
            setMode(RobotMode.NEUTRAL);
        } else {
            setMode(newMode);
        }
    }

    private void configureBindings() {
        // Drive normally, field relative with joystick inputs
        drivetrain.setDefaultCommand(
            drivetrain.applyRequest(() ->
                drive.withVelocityX(-joystick.getLeftY() * MaxSpeed) 
                .withVelocityY(-joystick.getLeftX() * MaxSpeed) 
                .withRotationalRate(-joystick.getRightX() * MaxAngularRate)) 
        );

        // Mode switching for firing superstructure (Turret, Hood, Shooter, DyeRotor)
        joystick.rightTrigger().onTrue(new InstantCommand(() -> toggleMode(RobotMode.AUTOAIM_FIRE)));
        joystick.rightBumper().onTrue(new InstantCommand(() -> toggleMode(RobotMode.PASS_SHOT)));
        joystick.x().onTrue(new InstantCommand(() -> setMode(RobotMode.NEUTRAL)));
        joystick.povUp().onTrue(new InstantCommand(() -> toggleMode(RobotMode.POOP)));
        joystick.povDown().onTrue(new InstantCommand(() -> setMode(RobotMode.STOP)));
        joystick.povLeft().onTrue(new InstantCommand(() -> setMode(RobotMode.ZERO)));

        // X-Lock the drivebase to help against defense
        joystick.y().whileTrue(drivetrain.applyRequest(() -> brake));
       
        // joystick.y().whileTrue(
        //     drivetrain.PIDToPose(
        //         new Pose2d(10.3, 2.5, Rotation2d.k180deg)));
        
        // Intake rollers and pivot
        joystick.leftTrigger().onTrue(
            new RepeatCommand(
                new InstantCommand(() -> intake.setState(IntakeState.FULLSPEED_INTAKE), intake)
                    .onlyIf(() -> intakePivot.atPosition(-22.9))))
            .onFalse(new InstantCommand(() -> intake.setState(IntakeState.STOP), intake));

        joystick.leftTrigger().onTrue(
            new InstantCommand(() -> intakePivot.setState(IntakePivotState.INTAKE), intakePivot))
            .onFalse(new InstantCommand(() -> intakePivot.setState(IntakePivotState.BUMP_STOW), intakePivot));

        joystick.rightStick().onTrue(new InstantCommand(() -> intakePivot.setState(IntakePivotState.AGITATE)));
        joystick.rightStick().onTrue(new InstantCommand(() -> intake.setState(IntakeState.INTAKE)));
       
        // Fire balls out of intake (alternative to passing)
        joystick.b().onTrue(
            new InstantCommand(() -> intake.setState(IntakeState.OUTTAKE), intake))
            .onFalse(new InstantCommand(() -> intake.setState(IntakeState.STOP), intake));

        // Compact intake pivot to push balls into rotor
        joystick.a().onTrue(
            new InstantCommand(() -> intakePivot.setState(IntakePivotState.COMPACT_STOW), intakePivot));

        // Run rotor in reverse in case of jamming
        joystick.leftBumper().onTrue(
            new InstantCommand(() -> setMode(RobotMode.NEUTRAL))
            .andThen(new WaitCommand(0.01))
            .andThen(new InstantCommand(() -> dyeRotor.setState(RotorState.UNJAM_BACKWARD))))
            .onFalse(new InstantCommand(() -> dyeRotor.setState(RotorState.STOP), dyeRotor));

        // Zero drivebase relative to field
        joystick.start().onTrue(drivetrain.runOnce(drivetrain::seedFieldCentric));

        // Manual turret control
        cojoystick.leftBumper().whileTrue(
            rotateTurretToJoystick(() -> -cojoystick.getLeftX(), () -> cojoystick.getLeftY()));

        // Manual hood control
        cojoystick.leftBumper().whileTrue(
            rotateHoodToJoystick(() -> -cojoystick.getRightY()));

        // Manual shoot speed controls
        cojoystick.a().onTrue(
            new InstantCommand(() -> {
                shooter.requestOverrideVelocity(SmartDashboard.getNumber("Shooter/ShootSpeed1", -10));
                shooter.setState(ShooterState.FOLLOW_SUPPLIER);}, shooter));
        cojoystick.b().onTrue(
            new InstantCommand(() -> {
                shooter.requestOverrideVelocity(SmartDashboard.getNumber("Shooter/ShootSpeed2", -20));
                shooter.setState(ShooterState.FOLLOW_SUPPLIER);}, shooter));
        cojoystick.x().onTrue(
            new InstantCommand(() -> {
                shooter.requestOverrideVelocity(SmartDashboard.getNumber("Shooter/ShootSpeed3", -40));
                shooter.setState(ShooterState.FOLLOW_SUPPLIER);}, shooter));
        cojoystick.y().onTrue(
            new InstantCommand(() -> {
                shooter.requestOverrideVelocity(SmartDashboard.getNumber("Shooter/ShootSpeed4", -100));
                shooter.setState(ShooterState.FOLLOW_SUPPLIER);}, shooter));

        // Manual rotor control, fast and slow options
        cojoystick.rightBumper().onTrue(
            new InstantCommand(() -> dyeRotor.setState(RotorState.LOWSPEED_FORWARD), dyeRotor))
            .onFalse(new InstantCommand(() -> dyeRotor.setState(RotorState.STOP), dyeRotor));

        cojoystick.rightTrigger().onTrue(
            new InstantCommand(() -> dyeRotor.setState(RotorState.FULLSPEED_FORWARD), dyeRotor))
            .onFalse(new InstantCommand(() -> dyeRotor.setState(RotorState.STOP), dyeRotor));

        // Initialize/restart inactive/active shift information
        cojoystick.start().onTrue(new InstantCommand(HubShiftUtil::initialize));

        drivetrain.registerTelemetry(logger::telemeterize);
    }
}
