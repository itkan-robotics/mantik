import type { JavaPlaygroundExercise } from '../types';

/**
 * Track 2 of the Practice Assignments, adapted from the FSC Open Docs Java
 * Assignments curriculum (CC BY-SA 4.0).
 *
 * Every assignment here specifies a *class shape* rather than console output, so
 * each starter ships a fixed `main` that exercises the student's types and prints
 * something comparable. The student implements the types; `main` is off limits.
 *
 * Tests use `pattern` + `describe` rather than exact `stdout`: the panel shows the
 * description on failure, so a check never hands back the answer — which for these
 * assignments would be most of the work.
 *
 * A18 uses records, which need Java 16. The runner compiles at Java 17 — see
 * RUNTIME_JAVA_VERSION in ../constants.ts for how that is arranged.
 */

const A11_STARTER = `// Author:
// Date:
// What this program does:

class Robot {
    private final String name;
    private final int teamNumber;
    private double maxSpeedMps;
    private int weightLbs;

    Robot(String name, int teamNumber, double maxSpeedMps, int weightLbs) {
        // TODO validate every parameter, then store them
        this.name = name;
        this.teamNumber = teamNumber;
        this.maxSpeedMps = maxSpeedMps;
        this.weightLbs = weightLbs;
    }

    Robot(String name, int teamNumber) {
        // TODO chain to the four-argument constructor with this(...)
        this(name, teamNumber, 0.0, 0);
    }

    String getName() { return name; }
    int getTeamNumber() { return teamNumber; }
    double getMaxSpeedMps() { return maxSpeedMps; }
    int getWeightLbs() { return weightLbs; }

    void setMaxSpeedMps(double maxSpeedMps) {
        // TODO validate
        this.maxSpeedMps = maxSpeedMps;
    }

    void setWeightLbs(int weightLbs) {
        // TODO validate
        this.weightLbs = weightLbs;
    }

    // TODO override toString()
    // TODO override equals(Object) comparing name and teamNumber only
}

public class RobotTester {
    // Leave main as it is. Implement Robot above.
    public static void main(String[] args) {
        Robot titan = new Robot("Titan", 1234, 4.5, 120);
        Robot spare = new Robot("Spare", 4451);
        System.out.println(titan);
        System.out.println(spare);

        spare.setMaxSpeedMps(3.0);
        spare.setWeightLbs(95);
        System.out.println(spare);

        System.out.println("same name and team: " + titan.equals(new Robot("Titan", 1234, 9.0, 50)));
        System.out.println("different robot: " + titan.equals(spare));
        System.out.println("null: " + titan.equals(null));
        System.out.println("a String: " + titan.equals("Titan"));

        System.out.println("blank name rejected: " + rejects(null, 1234, 1.0, 10));
        System.out.println("team 0 rejected: " + rejects("X", 0, 1.0, 10));
        System.out.println("team 100000 rejected: " + rejects("X", 100000, 1.0, 10));
        System.out.println("speed 31 rejected: " + rejects("X", 1234, 31.0, 10));
        System.out.println("weight 201 rejected: " + rejects("X", 1234, 1.0, 201));

        System.out.println("chained defaults: " + spare.getName() + " starts at "
            + new Robot("Fresh", 9999).getMaxSpeedMps() + " m/s and "
            + new Robot("Fresh", 9999).getWeightLbs() + " lb");
    }

    static boolean rejects(String name, int team, double speed, int weight) {
        try {
            new Robot(name, team, speed, weight);
            return false;
        } catch (IllegalArgumentException e) {
            return true;
        }
    }
}
`;

const A13_STARTER = `// Author:
// Date:
// What this program does:

class Robot {
    private final String name;
    private final int teamNumber;
    private double maxSpeedMps;

    Robot(String name, int teamNumber) {
        // TODO validate
        this.name = name;
        this.teamNumber = teamNumber;
    }

    String getName() { return name; }
    double getMaxSpeedMps() { return maxSpeedMps; }

    void setMaxSpeedMps(double v) {
        // TODO validate
        this.maxSpeedMps = v;
    }

    // TODO override equals(Object) comparing name and teamNumber only
}

public class ReferenceLab {
    // Leave main as it is. Implement Robot above, then write a PREDICTION comment
    // beside each experiment BEFORE you run it.
    public static void main(String[] args) {
        System.out.println("-- 1: aliasing --");
        // PREDICTION:
        Robot a1 = new Robot("Titan", 1234);
        Robot b1 = a1;
        b1.setMaxSpeedMps(5.0);
        System.out.println(a1.getMaxSpeedMps());
        System.out.println(a1 == b1);
        System.out.println(a1.equals(b1));

        System.out.println("-- 2: separate construction --");
        // PREDICTION:
        Robot a2 = new Robot("Titan", 1234);
        Robot b2 = new Robot("Titan", 1234);
        System.out.println(a2 == b2);
        System.out.println(a2.equals(b2));
        a2.setMaxSpeedMps(5.0);
        System.out.println(b2.getMaxSpeedMps());

        System.out.println("-- 3: a primitive argument --");
        // PREDICTION:
        int x = 5;
        addOne(x);
        System.out.println(x);

        System.out.println("-- 4: an object argument --");
        // PREDICTION:
        Robot a4 = new Robot("Titan", 1234);
        speedUp(a4);
        System.out.println(a4.getMaxSpeedMps());
        replace(a4);
        System.out.println(a4.getName());

        System.out.println("-- 5: the null reference --");
        // PREDICTION:
        Robot missing = null;
        try {
            System.out.println(missing.getName());
        } catch (NullPointerException e) {
            System.out.println("threw " + e.getClass().getSimpleName());
        }
        System.out.println("null == null: " + (missing == null));
    }

    public static void addOne(int n) {
        n = n + 1;
    }

    public static void speedUp(Robot r) {
        r.setMaxSpeedMps(7.0);
    }

    public static void replace(Robot r) {
        r = new Robot("Replacement", 9999);
        r.setMaxSpeedMps(1.0);
    }
}
`;

const A14_STARTER = `// Author:
// Date:
// What this program does:

class Battery {
    private final String serial;
    private final double restingVoltage;

    Battery(String serial, double restingVoltage) {
        // TODO validate both
        this.serial = serial;
        this.restingVoltage = restingVoltage;
    }

    String getSerial() { return serial; }
    double getRestingVoltage() { return restingVoltage; }

    // TODO override toString() as Battery[serial=ABC123, restingV=12.50]
}

class Robot {
    private final String name;
    private final int teamNumber;
    // TODO add a private final Battery field
    private double maxSpeedMps;
    private int weightLbs;

    Robot(String name, int teamNumber, double maxSpeedMps, int weightLbs, Battery battery) {
        // TODO validate, including a non-null battery, then store
        this.name = name;
        this.teamNumber = teamNumber;
        this.maxSpeedMps = maxSpeedMps;
        this.weightLbs = weightLbs;
    }

    Robot(String name, int teamNumber) {
        // TODO chain, supplying a default battery of your choice
        this(name, teamNumber, 0.0, 0, null);
    }

    String getName() { return name; }
    double getMaxSpeedMps() { return maxSpeedMps; }
    // TODO add getBattery(). There is deliberately no setBattery.

    void setMaxSpeedMps(double v) { this.maxSpeedMps = v; }
    void setWeightLbs(int w) { this.weightLbs = w; }

    // TODO override toString() to include the battery
}

public class RobotPlusBatteryTester {
    // Leave main as it is. Implement Battery and Robot above.
    public static void main(String[] args) {
        Battery shared = new Battery("ABC123", 12.5);
        Robot titan = new Robot("Titan", 1234, 4.5, 120, shared);
        System.out.println(shared);
        System.out.println(titan);

        titan.setMaxSpeedMps(6.0);
        System.out.println("after setMaxSpeedMps: " + titan.getMaxSpeedMps());

        System.out.println("battery serial still: " + titan.getBattery().getSerial());
        System.out.println("battery voltage still: " + titan.getBattery().getRestingVoltage());

        Robot spare = new Robot("Spare", 4451, 3.0, 95, shared);
        System.out.println("same battery object: " + (titan.getBattery() == spare.getBattery()));
        titan.setMaxSpeedMps(2.0);
        System.out.println("spare unaffected speed: " + spare.getMaxSpeedMps());
        System.out.println("spare sees same voltage: " + spare.getBattery().getRestingVoltage());

        System.out.println("default battery: " + new Robot("Fresh", 9999).getBattery());

        System.out.println("null battery rejected: " + rejectsNullBattery());
        System.out.println("15 V rejected: " + rejectsVoltage(15.0));
        System.out.println("blank serial rejected: " + rejectsSerial(" "));
    }

    static boolean rejectsNullBattery() {
        try {
            new Robot("X", 1234, 1.0, 10, null);
            return false;
        } catch (IllegalArgumentException e) {
            return true;
        }
    }

    static boolean rejectsVoltage(double v) {
        try {
            new Battery("S1", v);
            return false;
        } catch (IllegalArgumentException e) {
            return true;
        }
    }

    static boolean rejectsSerial(String s) {
        try {
            new Battery(s, 12.0);
            return false;
        } catch (IllegalArgumentException e) {
            return true;
        }
    }
}
`;

const A15_STARTER = `// Author:
// Date:
// What this program does:

enum MatchPhase {
    AUTO(0, 15, 1.0, "Autonomous"),
    TELEOP(15, 120, 1.0, "Teleop"),
    ENDGAME(120, 150, 0.7, "Endgame"),
    OVER(150, Integer.MAX_VALUE, 0.0, "Match over");

    public final int startSeconds;
    public final int endSecondsExclusive;
    public final double maxDriveScaling;
    public final String label;

    MatchPhase(int startSeconds, int endSecondsExclusive, double maxDriveScaling, String label) {
        this.startSeconds = startSeconds;
        this.endSecondsExclusive = endSecondsExclusive;
        this.maxDriveScaling = maxDriveScaling;
        this.label = label;
    }

    // TODO make this abstract and give each constant its own body
    public String shortStatus(int currentSeconds) {
        return "TODO";
    }

    // TODO return true when seconds is in [startSeconds, endSecondsExclusive)
    public boolean contains(int seconds) {
        return false;
    }

    // TODO walk values() and return the first phase that contains seconds;
    //      throw IllegalArgumentException when none does
    public static MatchPhase phaseAt(int seconds) {
        return OVER;
    }
}

public class MatchPhaseTester {
    // Leave main as it is. Fill in the enum above.
    public static void main(String[] args) {
        for (MatchPhase phase : MatchPhase.values()) {
            System.out.printf("%-10s %6d %8d %5.2f%n",
                phase.label, phase.startSeconds, phase.endSecondsExclusive, phase.maxDriveScaling);
        }

        int[] times = { 0, 14, 15, 75, 119, 120, 149, 150, 300 };
        for (int t : times) {
            MatchPhase phase = MatchPhase.phaseAt(t);
            System.out.println(t + " -> " + phase.name() + " | " + phase.shortStatus(t));
        }

        System.out.println("AUTO contains 14: " + MatchPhase.AUTO.contains(14));
        System.out.println("AUTO contains 15: " + MatchPhase.AUTO.contains(15));
        System.out.println("ENDGAME scaling: " + MatchPhase.ENDGAME.maxDriveScaling);

        try {
            MatchPhase.phaseAt(-1);
            System.out.println("negative rejected: false");
        } catch (IllegalArgumentException e) {
            System.out.println("negative rejected: true");
        }
    }
}
`;

const A16_STARTER = `// Author:
// Date:
// What this program does:

abstract class Subsystem {
    protected final String name;
    protected boolean enabled = true;

    protected Subsystem(String name) {
        this.name = name;
    }

    public String getName() { return name; }
    public boolean isEnabled() { return enabled; }
    public void enable() { enabled = true; }
    public void disable() { enabled = false; }

    /** Run one tick of work. Each subsystem decides what that means. */
    public abstract String performStep();

    @Override
    public String toString() {
        return name + (enabled ? " [ON]" : " [OFF]");
    }
}

// TODO Drivetrain: double leftPower, rightPower.
//      Enabled -> "Drivetrain: L=0.50 R=0.50"; disabled -> "Drivetrain: idle"
class Drivetrain extends Subsystem {
    Drivetrain(String name, double leftPower, double rightPower) {
        super(name);
    }

    @Override
    public String performStep() {
        return "TODO";
    }
}

// TODO Intake: boolean gateOpen. Enabled -> toggle, then
//      "Intake: gate -> open" or "Intake: gate -> closed"; disabled -> "Intake: idle"
class Intake extends Subsystem {
    Intake(String name, boolean gateOpen) {
        super(name);
    }

    @Override
    public String performStep() {
        return "TODO";
    }
}

// TODO Shooter: int targetRPM, currentRPM. Enabled -> move currentRPM toward
//      targetRPM by at most 500, then "Shooter: 1500 -> 2000"; disabled -> "Shooter: idle"
class Shooter extends Subsystem {
    Shooter(String name, int targetRPM, int currentRPM) {
        super(name);
    }

    @Override
    public String performStep() {
        return "TODO";
    }
}

public class RobotLoop {
    // Leave main as it is. Implement the three subclasses above.
    public static void main(String[] args) {
        Subsystem[] subs = {
            new Drivetrain("Drivetrain", 0.5, 0.5),
            new Intake("Intake", false),
            new Shooter("Shooter", 3000, 1500),
        };

        for (int tick = 1; tick <= 5; tick++) {
            System.out.println("--- Tick " + tick + " ---");
            for (Subsystem s : subs) {
                System.out.println(s.performStep());
            }
            if (tick == 2) {
                subs[1].disable();
            }
            if (tick == 4) {
                subs[1].enable();
                subs[0].disable();
            }
        }

        for (Subsystem s : subs) {
            System.out.println(s.toString());
        }
    }
}
`;

export const FSC_OBJECTS: JavaPlaygroundExercise[] = [
  {
    id: 'a11-robot-class',
    title: 'A11: Simple Robot Class',
    entryClass: 'RobotTester',
    showStdin: false,
    prompt: `Design your first class by hand.

Robot has private fields name, teamNumber, maxSpeedMps and weightLbs. Write a
four-argument constructor that validates everything, a two-argument constructor
that chains to it with this(...) rather than repeating the validation, getters for
all four, validating setters for speed and weight only, toString, and equals that
compares name and teamNumber only.

    name           not null, not blank
    teamNumber     1 to 99999
    maxSpeedMps    0.0 to 30.0
    weightLbs      0 to 200

Reject bad input with IllegalArgumentException. toString reads exactly:
Robot[name=Titan, team=1234, maxSpeed=4.5 m/s, weight=120 lb]

main is written for you — leave it alone.`,
    starter: A11_STARTER,
    tests: [
      {
        name: 'toString and the four-argument constructor',
        describe: 'The exact toString format from the prompt, for the robot main builds first',
        pattern: '^Robot\\[name=Titan, team=1234, maxSpeed=4\\.5 m/s, weight=120 lb\\]',
      },
      {
        name: 'Constructor chaining supplies the defaults',
        describe: 'The two-argument constructor produces 0.0 m/s and 0 lb',
        pattern: 'Robot\\[name=Spare, team=4451, maxSpeed=0\\.0 m/s, weight=0 lb\\][\\s\\S]*chained defaults: Spare starts at 0\\.0 m/s and 0 lb',
      },
      {
        name: 'Setters update the mutable fields',
        describe: 'After the setters, Spare reports the new speed and weight',
        pattern: 'Robot\\[name=Spare, team=4451, maxSpeed=3\\.0 m/s, weight=95 lb\\]',
      },
      {
        name: 'equals compares name and team only',
        describe: 'Four equals results: a matching robot, a different one, null, and a String',
        pattern: 'same name and team: true[\\s\\S]*different robot: false[\\s\\S]*null: false[\\s\\S]*a String: false',
      },
      {
        name: 'Every validation rule fires',
        describe: 'All five bad inputs are rejected with IllegalArgumentException',
        pattern: 'blank name rejected: true[\\s\\S]*team 0 rejected: true[\\s\\S]*team 100000 rejected: true[\\s\\S]*speed 31 rejected: true[\\s\\S]*weight 201 rejected: true',
      },
    ],
  },

  {
    id: 'a13-reference-semantics',
    title: 'A13: Reference-Semantics Lab',
    entryClass: 'ReferenceLab',
    showStdin: false,
    prompt: `Five experiments in what a reference actually is. Implement Robot, then — before
you press Run — write a PREDICTION comment beside each experiment saying what you
think each line will print.

Run it. Where you were wrong, add a SURPRISE comment saying what you expected, what
happened, and why. Where you were right, write Confirmed.

The checks only confirm the program behaves as Java specifies. The predictions are
the actual assignment, and only you can mark those.`,
    starter: A13_STARTER,
    tests: [
      {
        name: 'Experiment 1: two names for one object',
        describe: 'Three results for the aliasing case',
        pattern: '-- 1: aliasing --\\n5\\.0\\ntrue\\ntrue',
      },
      {
        name: 'Experiment 2: two separately built objects',
        describe: 'Three results for the separate-construction case',
        pattern: '-- 2: separate construction --\\nfalse\\ntrue\\n0\\.0',
      },
      {
        name: 'Experiment 3 and 4: what a method can change',
        describe: 'The primitive result, then the two object-argument results',
        pattern: '-- 3: a primitive argument --\\n5\\n[\\s\\S]*7\\.0\\nTitan',
      },
      {
        name: 'Experiment 5: calling through null',
        describe: 'The exception type, then the null comparison',
        pattern: 'threw NullPointerException\\nnull == null: true',
      },
    ],
  },

  {
    id: 'a14-robot-and-battery',
    title: 'A14: Composition — Robot and Battery',
    entryClass: 'RobotPlusBatteryTester',
    showStdin: false,
    prompt: `A Robot has-a Battery. Build Battery with private final serial and
restingVoltage, validation (serial not blank, voltage 0.0 to 14.0), getters, and
toString reading Battery[serial=ABC123, restingV=12.50]. There are no setters: once
a Battery exists its values are locked.

Then give Robot a private final Battery field, take it as a fifth constructor
argument, reject null, add getBattery(), and include the battery in toString. Add no
setBattery — the field is final. The two-argument constructor supplies a default
battery of your choosing.

main is written for you — leave it alone.`,
    starter: A14_STARTER,
    tests: [
      {
        name: 'Battery toString and immutable fields',
        describe: 'The exact Battery format from the prompt, with two decimal places',
        pattern: '^Battery\\[serial=ABC123, restingV=12\\.50\\]',
      },
      {
        name: 'Robot toString includes its battery',
        describe: "The robot line carries the battery's own toString inside it",
        pattern: 'Robot\\[name=Titan, team=1234, maxSpeed=4\\.5 m/s, weight=120 lb, Battery\\[serial=ABC123, restingV=12\\.50\\]\\]',
      },
      {
        name: 'The battery survives mutating the robot',
        describe: 'Speed changes; serial and voltage do not',
        pattern: 'after setMaxSpeedMps: 6\\.0[\\s\\S]*battery serial still: ABC123[\\s\\S]*battery voltage still: 12\\.5',
      },
      {
        name: 'Two robots can share one battery safely',
        describe: 'Identity holds, and changing one robot leaves the other alone',
        pattern: 'same battery object: true[\\s\\S]*spare unaffected speed: 3\\.0[\\s\\S]*spare sees same voltage: 12\\.5',
      },
      {
        name: 'Validation and the default battery',
        describe: 'A default battery exists, and three bad inputs are rejected',
        pattern: 'default battery: Battery\\[[\\s\\S]*null battery rejected: true[\\s\\S]*15 V rejected: true[\\s\\S]*blank serial rejected: true',
      },
    ],
  },

  {
    id: 'a15-match-phase-enum',
    title: 'A15: MatchPhase Enum with Fields',
    entryClass: 'MatchPhaseTester',
    showStdin: false,
    prompt: `An enum can carry data and behaviour per constant. MatchPhase already declares its
four constants with start, end, drive scaling and label. You add three things:

    shortStatus(int)   make it abstract, then give every constant its own body
    contains(int)      true when seconds is in [startSeconds, endSecondsExclusive)
    phaseAt(int)       static; walk values() and return the first phase that
                       contains the time, or throw IllegalArgumentException

Suggested statuses: AUTO "AUTO 15s left", TELEOP "TELEOP, endgame in 105s",
ENDGAME "ENDGAME, climb now", OVER "match over".

main is written for you — leave it alone.`,
    starter: A15_STARTER,
    tests: [
      {
        name: 'Each constant keeps its own field values',
        describe: 'The four-row table of label, start, end and scaling',
        pattern: 'Autonomous\\s+0\\s+15\\s+1\\.00[\\s\\S]*Teleop\\s+15\\s+120\\s+1\\.00[\\s\\S]*Endgame\\s+120\\s+150\\s+0\\.70[\\s\\S]*Match over\\s+150\\s+2147483647\\s+0\\.00',
      },
      {
        name: 'phaseAt picks the right phase at every boundary',
        describe: 'Nine times map to the phase that contains them',
        pattern: '0 -> AUTO[\\s\\S]*14 -> AUTO[\\s\\S]*15 -> TELEOP[\\s\\S]*119 -> TELEOP[\\s\\S]*120 -> ENDGAME[\\s\\S]*149 -> ENDGAME[\\s\\S]*150 -> OVER[\\s\\S]*300 -> OVER',
      },
      {
        name: 'shortStatus differs per constant',
        describe: 'Each phase prints its own status wording, counting down where it should',
        pattern: '0 -> AUTO \\| AUTO 15s left[\\s\\S]*15 -> TELEOP \\| TELEOP, endgame in 105s[\\s\\S]*120 -> ENDGAME \\| ENDGAME, climb now[\\s\\S]*150 -> OVER \\| match over',
      },
      {
        name: 'contains is half-open, and negatives throw',
        describe: 'The boundary second belongs to the next phase, and phaseAt(-1) is rejected',
        pattern: 'AUTO contains 14: true\\nAUTO contains 15: false[\\s\\S]*negative rejected: true',
      },
    ],
  },

  {
    id: 'a16-subsystem-fleet',
    title: 'A16: Subsystem Family',
    entryClass: 'RobotLoop',
    showStdin: false,
    prompt: `One abstract parent, three children, one polymorphic loop.

Subsystem is written for you. Implement Drivetrain, Intake and Shooter, each calling
super(name) and overriding performStep():

    Drivetrain   enabled -> "Drivetrain: L=0.50 R=0.50"   disabled -> "Drivetrain: idle"
    Intake       enabled -> toggle the gate, then "Intake: gate -> open"
                 or "Intake: gate -> closed"               disabled -> "Intake: idle"
    Shooter      enabled -> step currentRPM toward targetRPM by at most 500,
                 then "Shooter: 1500 -> 2000"              disabled -> "Shooter: idle"

main runs five ticks, disables the intake after tick 2, and after tick 4 re-enables
it while disabling the drivetrain. Leave main alone.`,
    starter: A16_STARTER,
    tests: [
      {
        name: 'All three subsystems step on tick 1',
        describe: 'The first tick shows drivetrain powers, a gate toggle and a shooter step',
        pattern: '--- Tick 1 ---\\nDrivetrain: L=0\\.50 R=0\\.50\\nIntake: gate -> open\\nShooter: 1500 -> 2000',
      },
      {
        name: 'The intake gate toggles rather than repeating',
        describe: 'Tick 2 shows the opposite gate state from tick 1',
        pattern: '--- Tick 2 ---[\\s\\S]*Intake: gate -> closed',
      },
      {
        name: 'A disabled subsystem idles',
        describe: 'Ticks 3 and 4 show the intake idle while the others keep working',
        pattern: '--- Tick 3 ---\\nDrivetrain: L=0\\.50 R=0\\.50\\nIntake: idle[\\s\\S]*--- Tick 4 ---\\nDrivetrain: L=0\\.50 R=0\\.50\\nIntake: idle',
      },
      {
        name: 'The shooter stops stepping once it arrives',
        describe: 'The shooter reaches its target and then holds',
        pattern: 'Shooter: 2500 -> 3000[\\s\\S]*Shooter: 3000 -> 3000',
      },
      {
        name: 'Enable and disable take effect, and toString reports state',
        describe: 'Tick 5 flips which subsystems are idle, and the final lines show ON/OFF',
        pattern: '--- Tick 5 ---\\nDrivetrain: idle\\nIntake: gate -> open[\\s\\S]*Drivetrain \\[OFF\\]\\nIntake \\[ON\\]\\nShooter \\[ON\\]',
      },
    ],
  },

  {
    id: 'a17-io-interface',
    title: 'A17: IO Interface Technique',
    entryClass: 'ClimberDemo',
    showStdin: false,
    prompt: `Separate what the hardware can do from how it does it.

The full assignment lets you pick a mechanism. In the browser it is pinned to a
climber so the checks have something fixed to call; locally, pick your own.

    interface ClimberIO     setVoltage, getPositionMeters, getCurrentAmps,
                            isAtHardLimit — signatures only, no fields, no logic
    ClimberIOMock           stands in for the roboRIO: prints
                            "[MOCK] setVoltage(6.00)", reports amps = |volts| * 4,
                            position always 0.0, never at the limit
    ClimberIOSim            a small model: position integrates voltage at
                            0.02 m per volt-second, clamped to 0.30 m;
                            amps = |volts| * 6; at the limit once position reaches 0.30
    Climber                 the subsystem. Holds a ClimberIO and never knows which
                            one. climb(volts) sets 0.0 instead when at the limit.

main runs the same five ticks through both implementations. Leave it alone.`,
    starter: `// Author:
// Date:
// What this program does:

// TODO the contract: four method signatures, nothing else
interface ClimberIO {
    void setVoltage(double volts);
    double getPositionMeters();
    double getCurrentAmps();
    boolean isAtHardLimit();
}

// TODO prints what it would do, stores the voltage, reports flat readings
class ClimberIOMock implements ClimberIO {
    public void setVoltage(double volts) { }
    public double getPositionMeters() { return 0.0; }
    public double getCurrentAmps() { return 0.0; }
    public boolean isAtHardLimit() { return false; }
}

// TODO integrates position from voltage and stops at the hard limit
class ClimberIOSim implements ClimberIO {
    public void setVoltage(double volts) { }
    public double getPositionMeters() { return 0.0; }
    public double getCurrentAmps() { return 0.0; }
    public boolean isAtHardLimit() { return false; }
}

class Climber {
    private final ClimberIO io;

    Climber(ClimberIO io) {
        this.io = io;
    }

    // TODO set 0.0 when already at the hard limit, otherwise the requested volts
    void climb(double volts) {
    }

    String status() {
        return String.format("pos=%.3f m amps=%.1f limit=%s",
            io.getPositionMeters(), io.getCurrentAmps(), io.isAtHardLimit());
    }
}

public class ClimberDemo {
    // Leave main as it is. Implement the two IO classes and Climber.climb above.
    public static void main(String[] args) {
        System.out.println("== mock ==");
        run(new Climber(new ClimberIOMock()));

        System.out.println("== sim ==");
        run(new Climber(new ClimberIOSim()));
    }

    static void run(Climber climber) {
        for (int tick = 1; tick <= 5; tick++) {
            climber.climb(6.0);
            System.out.println("tick " + tick + ": " + climber.status());
        }
    }
}
`,
    tests: [
      {
        name: 'The mock announces what it would do',
        describe: 'Five [MOCK] setVoltage lines with two decimal places',
        pattern: '== mock ==[\\s\\S]*\\[MOCK\\] setVoltage\\(6\\.00\\)[\\s\\S]*\\[MOCK\\] setVoltage\\(6\\.00\\)[\\s\\S]*== sim ==',
      },
      {
        name: 'The mock reports its own flat readings',
        describe: 'Position stays at zero and current follows the mock formula',
        pattern: 'tick 1: pos=0\\.000 m amps=24\\.0 limit=false[\\s\\S]*tick 5: pos=0\\.000 m amps=24\\.0 limit=false',
      },
      {
        name: 'The sim integrates position over ticks',
        describe: 'Position climbs tick by tick instead of staying put',
        pattern: '== sim ==\\ntick 1: pos=0\\.120 m amps=36\\.0 limit=false\\ntick 2: pos=0\\.240 m',
      },
      {
        name: 'The sim stops at the hard limit',
        describe: 'Position clamps, the limit flag flips, and the subsystem backs off',
        pattern: 'tick 3: pos=0\\.300 m amps=36\\.0 limit=true\\ntick 4: pos=0\\.300 m amps=0\\.0 limit=true\\ntick 5: pos=0\\.300 m amps=0\\.0 limit=true',
      },
      {
        name: 'One subsystem drove both implementations',
        describe: 'The same Climber code produced two different traces',
        pattern: '^== mock ==[\\s\\S]*== sim ==[\\s\\S]*tick 5: pos=0\\.300',
      },
    ],
  },

  {
    id: 'a18-records',
    title: 'A18: Records',
    entryClass: 'RecordsTester',
    showStdin: false,
    prompt: `A record is a class whose whole job is to carry values. Declare the components and
Java writes the constructor, the accessors, equals, hashCode and toString for you.

    VisionResult(timestampMs, xMeters, yMeters, areaSqPixels, confidence)
        implements Comparable, ordered by timestamp ascending.
        Compact constructor rejects a negative timestamp, a confidence outside
        0.0 to 1.0, and a negative area.
        static recent(results, maxAgeMs, now) counts results no older than maxAgeMs.

    Setpoint(name, valueMeters, toleranceMeters)
        Compact constructor trims the name, rejects blank, rejects a negative
        tolerance.
        isReached(current) is true when current is within tolerance of the value.

A compact constructor takes no parameter list: you validate, and you may reassign a
component to normalise it before it is stored. main is written for you.`,
    starter: `import java.util.Arrays;

// Author:
// Date:
// What this program does:

record VisionResult(
    long timestampMs,
    double xMeters,
    double yMeters,
    double areaSqPixels,
    double confidence
) implements Comparable<VisionResult> {

    // TODO compact constructor: reject a negative timestampMs, a confidence
    //      outside [0.0, 1.0], and a negative areaSqPixels

    // TODO compareTo: timestampMs ascending
    public int compareTo(VisionResult other) {
        return 0;
    }

    // TODO count the results no more than maxAgeMs older than now
    static int recent(VisionResult[] results, long maxAgeMs, long now) {
        return 0;
    }
}

record Setpoint(String name, double valueMeters, double toleranceMeters) {

    // TODO compact constructor: trim the name, reject blank, reject a negative
    //      tolerance. A compact constructor may reassign a component to normalise it.

    // TODO true when current is within toleranceMeters of valueMeters
    boolean isReached(double currentMeters) {
        return false;
    }
}

public class RecordsTester {
    // Leave main as it is. Implement the two records above.
    public static void main(String[] args) {
        long now = 10_000;
        VisionResult[] results = {
            new VisionResult(9_800, 1.5, 0.4, 220.0, 0.91),
            new VisionResult(9_100, 1.2, 0.5, 180.0, 0.62),
            new VisionResult(9_950, 1.6, 0.3, 240.0, 0.97),
            new VisionResult(8_400, 0.9, 0.7, 140.0, 0.35),
            new VisionResult(9_600, 1.4, 0.4, 205.0, 0.88),
        };

        Arrays.sort(results);
        for (VisionResult r : results) {
            System.out.println(r);
        }

        System.out.println("recent within 500ms: " + VisionResult.recent(results, 500, now));
        System.out.println("recent within 2000ms: " + VisionResult.recent(results, 2000, now));

        System.out.println("equal by value: "
            + new VisionResult(9_100, 1.2, 0.5, 180.0, 0.62).equals(results[1]));
        System.out.println("accessor: " + results[0].timestampMs() + " " + results[0].confidence());

        Setpoint low = new Setpoint("  LOW  ", 0.20, 0.02);
        Setpoint mid = new Setpoint("MID", 0.85, 0.02);
        Setpoint high = new Setpoint("HIGH", 1.50, 0.05);
        System.out.println(low);
        System.out.println(mid);
        System.out.println(high);

        for (double current : new double[] { 0.19, 0.85, 1.40, 1.52 }) {
            StringBuilder reached = new StringBuilder();
            for (Setpoint s : new Setpoint[] { low, mid, high }) {
                if (s.isReached(current)) {
                    if (reached.length() > 0) reached.append(",");
                    reached.append(s.name());
                }
            }
            System.out.println(current + " reaches [" + reached + "]");
        }

        System.out.println("confidence 1.5 rejected: " + rejectsConfidence(1.5));
        System.out.println("negative timestamp rejected: " + rejectsTimestamp(-1));
        System.out.println("blank setpoint name rejected: " + rejectsName(" "));
        System.out.println("negative tolerance rejected: " + rejectsTolerance(-0.1));
    }

    static boolean rejectsConfidence(double c) {
        try {
            new VisionResult(1, 0, 0, 1, c);
            return false;
        } catch (IllegalArgumentException e) {
            return true;
        }
    }

    static boolean rejectsTimestamp(long t) {
        try {
            new VisionResult(t, 0, 0, 1, 0.5);
            return false;
        } catch (IllegalArgumentException e) {
            return true;
        }
    }

    static boolean rejectsName(String n) {
        try {
            new Setpoint(n, 1.0, 0.1);
            return false;
        } catch (IllegalArgumentException e) {
            return true;
        }
    }

    static boolean rejectsTolerance(double t) {
        try {
            new Setpoint("X", 1.0, t);
            return false;
        } catch (IllegalArgumentException e) {
            return true;
        }
    }
}
`,
    tests: [
      {
        name: 'Comparable orders the results by timestamp',
        describe: 'The five results print oldest first',
        pattern:
          '^VisionResult\\[timestampMs=8400[\\s\\S]*timestampMs=9100[\\s\\S]*timestampMs=9600[\\s\\S]*timestampMs=9800[\\s\\S]*timestampMs=9950',
      },
      {
        name: 'The generated toString names every component',
        describe: "Java's own record toString, with all five components",
        pattern:
          'VisionResult\\[timestampMs=9950, xMeters=1\\.6, yMeters=0\\.3, areaSqPixels=240\\.0, confidence=0\\.97\\]',
      },
      {
        name: 'recent counts by age, not by position',
        describe: 'Two different windows give two different counts',
        pattern: 'recent within 500ms: 3\\nrecent within 2000ms: 5',
      },
      {
        name: 'Records compare by value, and accessors work',
        describe: 'A separately built record equals an existing one, and accessors read back',
        pattern: 'equal by value: true\\naccessor: 8400 0\\.35',
      },
      {
        name: 'The compact constructor normalises as well as validates',
        describe: 'The padded setpoint name is stored trimmed',
        pattern: 'Setpoint\\[name=LOW, valueMeters=0\\.2, toleranceMeters=0\\.02\\]',
      },
      {
        name: 'isReached respects the tolerance',
        describe: 'Each sample height reaches the setpoints it is within tolerance of, and no others',
        pattern:
          '0\\.19 reaches \\[LOW\\]\\n0\\.85 reaches \\[MID\\]\\n1\\.4 reaches \\[\\]\\n1\\.52 reaches \\[HIGH\\]',
      },
      {
        name: 'Every validation rule fires',
        describe: 'Bad confidence, timestamp, name and tolerance are all rejected',
        pattern:
          'confidence 1\\.5 rejected: true\\nnegative timestamp rejected: true\\nblank setpoint name rejected: true\\nnegative tolerance rejected: true',
      },
    ],
  },

  {
    id: 'a19-sort-roster',
    title: 'A19: Sorting a Scouting Roster',
    entryClass: 'RosterSorter',
    showStdin: false,
    prompt: `Natural order belongs to the type; every other order is a comparator.

TeamEntry holds teamNumber, teamName, averagePoints, climbRate and matchesObserved.
Validate in the constructor: team number 1 to 99999, climb rate 0.0 to 1.0,
matchesObserved not negative. Implement Comparable with natural order = team number
ascending, and a static pickScore(t) = averagePoints + climbRate * 25.0.

The assignment says "a record or a class, your call". The starter uses a class so
the toString the checks rely on stays visible, but the editor compiles at Java 17,
so a record works too if you would rather rewrite it.

main sorts four ways and checks that sorting is stable. Leave it alone.`,
    starter: `import java.util.Arrays;
import java.util.Comparator;

// Author:
// Date:
// What this program does:

class TeamEntry implements Comparable<TeamEntry> {
    private final int teamNumber;
    private final String teamName;
    private final double averagePoints;
    private final double climbRate;
    private final int matchesObserved;

    TeamEntry(int teamNumber, String teamName, double averagePoints, double climbRate, int matchesObserved) {
        // TODO validate teamNumber, climbRate and matchesObserved
        this.teamNumber = teamNumber;
        this.teamName = teamName;
        this.averagePoints = averagePoints;
        this.climbRate = climbRate;
        this.matchesObserved = matchesObserved;
    }

    int teamNumber() { return teamNumber; }
    String teamName() { return teamName; }
    double averagePoints() { return averagePoints; }
    double climbRate() { return climbRate; }
    int matchesObserved() { return matchesObserved; }

    // TODO averagePoints + climbRate * 25.0
    static double pickScore(TeamEntry t) {
        return 0.0;
    }

    // TODO natural order is team number ascending
    public int compareTo(TeamEntry other) {
        return 0;
    }

    @Override
    public String toString() {
        return String.format("%d %s avg=%.1f climb=%.2f", teamNumber, teamName, averagePoints, climbRate);
    }
}

public class RosterSorter {
    // Leave main as it is. Implement TeamEntry above.
    public static void main(String[] args) {
        TeamEntry[] roster = {
            new TeamEntry(4451, "Bearcat", 42.0, 0.50, 9),
            new TeamEntry(1234, "Titan", 55.5, 0.25, 10),
            new TeamEntry(9999, "Comet", 38.0, 0.50, 8),
            new TeamEntry(2056, "Orbit", 61.0, 0.90, 11),
            new TeamEntry(3007, "Anvil", 47.5, 0.10, 7),
            new TeamEntry(118, "Robonauts", 58.0, 0.75, 12),
        };

        print("by team number", sortedCopy(roster, null));
        print("by average points desc", sortedCopy(roster, new Comparator<TeamEntry>() {
            @Override public int compare(TeamEntry a, TeamEntry b) {
                return Double.compare(b.averagePoints(), a.averagePoints());
            }
        }));
        print("by climb rate desc", sortedCopy(roster, new Comparator<TeamEntry>() {
            @Override public int compare(TeamEntry a, TeamEntry b) {
                return Double.compare(b.climbRate(), a.climbRate());
            }
        }));
        print("by pick score desc, team asc", sortedCopy(roster, new Comparator<TeamEntry>() {
            @Override public int compare(TeamEntry a, TeamEntry b) {
                int byScore = Double.compare(TeamEntry.pickScore(b), TeamEntry.pickScore(a));
                return byScore != 0 ? byScore : Integer.compare(a.teamNumber(), b.teamNumber());
            }
        }));

        TeamEntry[] byClimb = sortedCopy(roster, new Comparator<TeamEntry>() {
            @Override public int compare(TeamEntry a, TeamEntry b) {
                return Double.compare(b.climbRate(), a.climbRate());
            }
        });
        StringBuilder tied = new StringBuilder();
        for (TeamEntry t : byClimb) {
            if (t.climbRate() == 0.50) {
                if (tied.length() > 0) tied.append(",");
                tied.append(t.teamNumber());
            }
        }
        System.out.println("stable tie order: " + tied);

        System.out.println("bad team rejected: " + rejects(0, 0.5, 1));
        System.out.println("bad climb rejected: " + rejects(1234, 1.5, 1));
        System.out.println("bad matches rejected: " + rejects(1234, 0.5, -1));
    }

    static TeamEntry[] sortedCopy(TeamEntry[] roster, Comparator<TeamEntry> order) {
        TeamEntry[] copy = Arrays.copyOf(roster, roster.length);
        if (order == null) {
            Arrays.sort(copy);
        } else {
            Arrays.sort(copy, order);
        }
        return copy;
    }

    static void print(String header, TeamEntry[] entries) {
        System.out.println("-- " + header + " --");
        for (TeamEntry t : entries) {
            System.out.println("  " + t);
        }
    }

    static boolean rejects(int team, double climb, int matches) {
        try {
            new TeamEntry(team, "X", 10.0, climb, matches);
            return false;
        } catch (IllegalArgumentException e) {
            return true;
        }
    }
}
`,
    tests: [
      {
        name: 'Natural order is team number ascending',
        describe: 'The first block lists the six teams smallest number first',
        pattern: '-- by team number --\\n  118 [\\s\\S]*  1234 [\\s\\S]*  2056 [\\s\\S]*  3007 [\\s\\S]*  4451 [\\s\\S]*  9999 ',
      },
      {
        name: 'A comparator orders by average points',
        describe: 'The second block leads with the highest average and ends with the lowest',
        pattern: '-- by average points desc --\\n  2056 [\\s\\S]*\\n  9999 Comet avg=38\\.0',
      },
      {
        name: 'pickScore weights climbing',
        describe: 'The pick-score block puts a strong climber above a higher raw scorer',
        pattern: '-- by pick score desc, team asc --\\n  2056 [\\s\\S]*  118 [\\s\\S]*  1234 [\\s\\S]*  4451 [\\s\\S]*  9999 [\\s\\S]*  3007 ',
      },
      {
        name: 'Sorting objects is stable',
        describe: 'Two teams tied on climb rate keep the order they were written in',
        pattern: 'stable tie order: 4451,9999',
      },
      {
        name: 'The constructor validates',
        describe: 'Bad team number, climb rate and match count are all rejected',
        pattern: 'bad team rejected: true\\nbad climb rejected: true\\nbad matches rejected: true',
      },
    ],
  },

  {
    id: 'a20-config-validator',
    title: 'A20: Config Validator',
    entryClass: 'ConfigLoader',
    showStdin: false,
    prompt: `Validate at the boundary, so the rest of the program can trust its own values.

Config holds six private final fields and validates each in the constructor:

    maxDriveSpeed       0.0 to 1.0        intakeRPM          0 to 6000
    maxAccel            greater than 0    shooterTargetRPM   0 to 6000
    climberEnabled      true or false     teamNumber         greater than 0

ConfigLoader.load(path) reads key = value lines with try-with-resources, skipping
blank lines and # comments, tolerating spaces around the =, then builds a Config.
A missing key, an unparseable number, or a value out of range throws
IllegalArgumentException naming the key. A missing file throws IOException.

main writes sample files and loads them. Leave main and dataDir alone.`,
    starter: `import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.HashMap;
import java.util.Map;

// Author:
// Date:
// What this program does:

class Config {
    private final double maxDriveSpeed;
    private final double maxAccel;
    private final int intakeRPM;
    private final int shooterTargetRPM;
    private final boolean climberEnabled;
    private final int teamNumber;

    Config(double maxDriveSpeed, double maxAccel, int intakeRPM,
           int shooterTargetRPM, boolean climberEnabled, int teamNumber) {
        // TODO validate each value, naming the bad key in the message
        this.maxDriveSpeed = maxDriveSpeed;
        this.maxAccel = maxAccel;
        this.intakeRPM = intakeRPM;
        this.shooterTargetRPM = shooterTargetRPM;
        this.climberEnabled = climberEnabled;
        this.teamNumber = teamNumber;
    }

    @Override
    public String toString() {
        return String.format("Config[drive=%.2f accel=%.1f intake=%d shooter=%d climber=%s team=%d]",
            maxDriveSpeed, maxAccel, intakeRPM, shooterTargetRPM, climberEnabled, teamNumber);
    }
}

public class ConfigLoader {

    // TODO read the file with try-with-resources, skip blanks and # comments,
    //      split each line on the first =, then build a Config
    static Config load(String path) throws IOException {
        Map<String, String> values = new HashMap<String, String>();
        try (BufferedReader in = new BufferedReader(new FileReader(path))) {
            String line;
            while ((line = in.readLine()) != null) {
                // TODO
            }
        }
        return new Config(0.0, 1.0, 0, 0, false, 1);
    }

    // ---- Leave everything below as it is. ----

    /** A directory that is writable both locally and in the in-page editor. */
    static String dataDir() {
        String[] candidates = { "/files", System.getProperty("java.io.tmpdir"), "." };
        for (String c : candidates) {
            if (c == null) continue;
            File dir = new File(c);
            if (dir.isDirectory() && dir.canWrite()) return dir.getPath();
        }
        return ".";
    }

    static void write(String path, String body) throws IOException {
        try (PrintWriter out = new PrintWriter(new FileWriter(path))) {
            out.print(body);
        }
    }

    public static void main(String[] args) throws IOException {
        String good = new File(dataDir(), "constants.txt").getPath();
        write(good,
            "# practice bot\\n"
            + "maxDriveSpeed = 0.85\\n"
            + "\\n"
            + "maxAccel = 2.5\\n"
            + "intakeRPM = 1800\\n"
            + "# the shooter was retuned on Friday\\n"
            + "shooterTargetRPM = 4500\\n"
            + "climberEnabled = TRUE\\n"
            + "teamNumber = 1234\\n");
        System.out.println("loaded: " + load(good));

        System.out.println("out of range rejected: " + rejects(good, "maxDriveSpeed = 1.5"));
        System.out.println("zero accel rejected: " + rejects(good, "maxAccel = 0"));
        System.out.println("bad number rejected: " + rejects(good, "intakeRPM = fast"));
        System.out.println("bad boolean rejected: " + rejects(good, "climberEnabled = maybe"));
        System.out.println("missing key rejected: " + rejectsMissing(good));
        System.out.println("missing file throws IOException: " + rejectsMissingFile());
    }

    static boolean rejects(String path, String replacement) throws IOException {
        String key = replacement.substring(0, replacement.indexOf('=')).trim();
        StringBuilder body = new StringBuilder();
        for (String line : baseLines()) {
            body.append(line.trim().startsWith(key) ? replacement : line).append('\\n');
        }
        write(path, body.toString());
        try {
            load(path);
            return false;
        } catch (IllegalArgumentException e) {
            return true;
        }
    }

    static boolean rejectsMissing(String path) throws IOException {
        StringBuilder body = new StringBuilder();
        for (String line : baseLines()) {
            if (!line.trim().startsWith("teamNumber")) body.append(line).append('\\n');
        }
        write(path, body.toString());
        try {
            load(path);
            return false;
        } catch (IllegalArgumentException e) {
            return true;
        }
    }

    static boolean rejectsMissingFile() {
        try {
            load(new File(dataDir(), "definitely-not-here.txt").getPath());
            return false;
        } catch (IOException e) {
            return true;
        }
    }

    static String[] baseLines() {
        return new String[] {
            "maxDriveSpeed = 0.85",
            "maxAccel = 2.5",
            "intakeRPM = 1800",
            "shooterTargetRPM = 4500",
            "climberEnabled = true",
            "teamNumber = 1234",
        };
    }
}
`,
    tests: [
      {
        name: 'A valid file loads',
        describe: 'The six values come back, with comments and blank lines ignored',
        pattern: '^loaded: Config\\[drive=0\\.85 accel=2\\.5 intake=1800 shooter=4500 climber=true team=1234\\]',
      },
      {
        name: 'climberEnabled is case-insensitive',
        describe: 'The sample file writes TRUE in capitals and still loads as true',
        pattern: 'climber=true',
      },
      {
        name: 'Out-of-range values are refused',
        describe: 'A drive speed above 1.0 and an accel of 0 both throw',
        pattern: 'out of range rejected: true\\nzero accel rejected: true',
      },
      {
        name: 'Unparseable values are refused',
        describe: 'A non-numeric RPM and a non-boolean flag both throw',
        pattern: 'bad number rejected: true\\nbad boolean rejected: true',
      },
      {
        name: 'Missing key and missing file are different failures',
        describe: 'A dropped key throws IllegalArgumentException; a missing file throws IOException',
        pattern: 'missing key rejected: true\\nmissing file throws IOException: true',
      },
    ],
  },

  {
    id: 'a21-scouting-csv',
    title: 'A21: Scouting CSV',
    entryClass: 'RoundTripDemo',
    showStdin: false,
    prompt: `Write scouting rows to a file and read them back unchanged.

TeamEntry holds teamNumber, teamName, drivetrain, avgPoints, climbsHigh and notes.
Validate in the constructor: avgPoints not negative, drivetrain one of TANK,
MECANUM, SWERVE, OTHER. The starter uses a class so the toString the checks compare
stays visible; records compile here too if you would rather use one.

CsvIO.writeAll(path, entries) writes the header then one line per entry, escaping
notes that contain a comma or a quote by wrapping in quotes and doubling any inner
quote. CsvIO.readAll(path) skips the header, parses each line honouring those
quotes, and skips a malformed row with a warning instead of abandoning the load.

Print warnings with System.out, not System.err — the checker treats anything on
stderr as a crashed program.

main writes, reads back, compares, then feeds in a file with bad rows. Leave it alone.`,
    starter: `import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

// Author:
// Date:
// What this program does:

class TeamEntry {
    private final int teamNumber;
    private final String teamName;
    private final String drivetrain;
    private final int avgPoints;
    private final boolean climbsHigh;
    private final String notes;

    TeamEntry(int teamNumber, String teamName, String drivetrain,
              int avgPoints, boolean climbsHigh, String notes) {
        // TODO reject negative avgPoints and unknown drivetrain values
        this.teamNumber = teamNumber;
        this.teamName = teamName;
        this.drivetrain = drivetrain;
        this.avgPoints = avgPoints;
        this.climbsHigh = climbsHigh;
        this.notes = notes;
    }

    int teamNumber() { return teamNumber; }
    String teamName() { return teamName; }
    String drivetrain() { return drivetrain; }
    int avgPoints() { return avgPoints; }
    boolean climbsHigh() { return climbsHigh; }
    String notes() { return notes; }

    @Override
    public String toString() {
        return teamNumber + "|" + teamName + "|" + drivetrain + "|" + avgPoints
            + "|" + climbsHigh + "|" + notes;
    }
}

class CsvIO {
    static final String HEADER = "teamNumber,teamName,drivetrain,avgPoints,climbsHigh,notes";

    // TODO header line, then one line per entry, with notes escaped
    static void writeAll(String path, TeamEntry[] entries) throws IOException {
    }

    // TODO quote the value when it holds a comma or a quote, doubling inner quotes
    static String escape(String value) {
        return value;
    }

    // TODO skip the header, parse each row, skip malformed rows with a warning
    static TeamEntry[] readAll(String path) throws IOException {
        return new TeamEntry[0];
    }

    // TODO split on commas that are not inside quotes
    static String[] splitCsv(String line) {
        return line.split(",");
    }
}

public class RoundTripDemo {
    // Leave main and dataDir as they are. Implement TeamEntry and CsvIO above.
    public static void main(String[] args) throws IOException {
        TeamEntry[] original = {
            new TeamEntry(1234, "Titan", "SWERVE", 55, true, "fast, but tips on defence"),
            new TeamEntry(4451, "Bearcat", "TANK", 42, false, "driver said \\"needs practice\\""),
            new TeamEntry(2056, "Orbit", "SWERVE", 61, true, "clean auto"),
            new TeamEntry(118, "Robonauts", "MECANUM", 58, true, "climbs, scores, no notes"),
        };

        String path = new File(dataDir(), "scouting.csv").getPath();
        CsvIO.writeAll(path, original);

        TeamEntry[] loaded = CsvIO.readAll(path);
        System.out.println("round trip count: " + loaded.length);
        for (TeamEntry t : loaded) {
            System.out.println("  " + t);
        }

        boolean identical = original.length == loaded.length;
        for (int i = 0; identical && i < original.length; i++) {
            identical = original[i].toString().equals(loaded[i].toString());
        }
        System.out.println("identical after round trip: " + identical);

        try (PrintWriter out = new PrintWriter(new FileWriter(path))) {
            out.println(CsvIO.HEADER);
            out.println("1234,Titan,SWERVE,55,true,fine");
            out.println("not,enough");
            out.println("9999,Comet,HOVERCRAFT,10,false,bad drivetrain");
            out.println("2056,Orbit,SWERVE,-5,true,negative points");
            out.println("118,Robonauts,TANK,58,true,also fine");
        }
        TeamEntry[] survivors = CsvIO.readAll(path);
        System.out.println("survivors: " + survivors.length);
        for (TeamEntry t : survivors) {
            System.out.println("  " + t.teamNumber() + " " + t.teamName());
        }
    }

    /** A directory that is writable both locally and in the in-page editor. */
    static String dataDir() {
        String[] candidates = { "/files", System.getProperty("java.io.tmpdir"), "." };
        for (String c : candidates) {
            if (c == null) continue;
            File dir = new File(c);
            if (dir.isDirectory() && dir.canWrite()) return dir.getPath();
        }
        return ".";
    }
}
`,
    tests: [
      {
        name: 'All four rows survive the round trip',
        describe: 'Four entries written, four read back',
        pattern: '^round trip count: 4',
      },
      {
        name: 'A comma inside notes does not split the row',
        describe: 'The notes containing commas come back whole',
        pattern: '1234\\|Titan\\|SWERVE\\|55\\|true\\|fast, but tips on defence',
      },
      {
        name: 'A quote inside notes survives escaping',
        describe: 'The quoted phrase in the notes comes back with its quotes intact',
        pattern: '4451\\|Bearcat\\|TANK\\|42\\|false\\|driver said "needs practice"',
      },
      {
        name: 'Nothing changes across the round trip',
        describe: 'Every field of every entry matches what was written',
        pattern: 'identical after round trip: true',
      },
      {
        name: 'Bad rows are skipped, good ones still load',
        describe: 'Three malformed rows are warned about and dropped; the two valid rows load',
        pattern: 'warning: line [\\s\\S]*survivors: 2\\n  1234 Titan\\n  118 Robonauts',
      },
    ],
  },

  {
    id: 'a22-command-binding',
    title: 'A22: Binding Commands to a Button',
    entryClass: 'CommandDemo',
    showStdin: false,
    prompt: `A button is a question, not a value. Wrapping the question in a BooleanSupplier
means the scheduler can ask it again every tick.

    Button          wraps a BooleanSupplier. onTrue(Runnable) fires once on the
                    rising edge — false to true. whileTrue(Runnable) fires every
                    tick the condition holds. Both return this, so they chain.
    Scheduler       holds the registered hooks, remembers each condition's previous
                    value, and fires the right ones on tick().
    Telemetry       holds labelled DoubleSuppliers and prints them on poll(), as
                    "telemetry: rpm=500.0"

main presses the button across five ticks — released, held, held, released, held —
so the rising edge happens twice. Leave main alone.`,
    starter: `import java.util.ArrayList;
import java.util.List;
import java.util.function.BooleanSupplier;
import java.util.function.DoubleSupplier;

// Author:
// Date:
// What this program does:

class Button {
    private final BooleanSupplier condition;

    Button(BooleanSupplier condition) {
        this.condition = condition;
    }

    boolean get() { return condition.getAsBoolean(); }

    // TODO register with the scheduler, then return this so calls chain
    Button onTrue(Runnable action) {
        return this;
    }

    Button whileTrue(Runnable action) {
        return this;
    }
}

class Scheduler {
    // TODO hold the hooks. Remember each condition's previous value so onTrue
    //      can tell a rising edge from a held button.

    static void registerOnTrue(BooleanSupplier when, Runnable then) {
    }

    static void registerWhileTrue(BooleanSupplier when, Runnable then) {
    }

    static void tick() {
    }
}

class Telemetry {
    // TODO keep labels and their DoubleSuppliers, then print one line per poll:
    //      telemetry: rpm=500.0

    static void addDouble(String label, DoubleSupplier source) {
    }

    static void poll() {
    }
}

public class CommandDemo {
    // Leave main as it is. Implement Button, Scheduler and Telemetry above.
    static boolean trigger = false;
    static double shooterRpm = 0.0;

    public static void main(String[] args) {
        new Button(new BooleanSupplier() {
            @Override public boolean getAsBoolean() { return trigger; }
        })
            .onTrue(new Runnable() {
                @Override public void run() { System.out.println("onTrue: spin up"); }
            })
            .whileTrue(new Runnable() {
                @Override public void run() {
                    shooterRpm += 500;
                    System.out.println("whileTrue: rpm now " + (int) shooterRpm);
                }
            });

        Telemetry.addDouble("rpm", new DoubleSupplier() {
            @Override public double getAsDouble() { return shooterRpm; }
        });

        boolean[] pressed = { false, true, true, false, true };
        for (int i = 0; i < pressed.length; i++) {
            trigger = pressed[i];
            System.out.println("-- tick " + (i + 1) + " pressed=" + trigger + " --");
            Scheduler.tick();
            Telemetry.poll();
        }
    }
}
`,
    tests: [
      {
        name: 'Nothing fires while the button is released',
        describe: 'The first tick runs no actions and reports a resting value',
        pattern: '^-- tick 1 pressed=false --\\ntelemetry: rpm=0\\.0',
      },
      {
        name: 'onTrue fires on the rising edge',
        describe: 'The press on tick 2 runs the one-shot action',
        pattern: '-- tick 2 pressed=true --\\nonTrue: spin up\\nwhileTrue: rpm now 500',
      },
      {
        name: 'onTrue does not repeat while held',
        describe: 'Tick 3 keeps the button down but only the repeating action runs',
        pattern: '-- tick 3 pressed=true --\\nwhileTrue: rpm now 1000\\ntelemetry: rpm=1000\\.0',
      },
      {
        name: 'whileTrue stops when the button is released',
        describe: 'Tick 4 runs neither action and the value holds where it was',
        pattern: '-- tick 4 pressed=false --\\ntelemetry: rpm=1000\\.0',
      },
      {
        name: 'A second press is a second rising edge',
        describe: 'Tick 5 fires the one-shot action again after the release',
        pattern: '-- tick 5 pressed=true --\\nonTrue: spin up\\nwhileTrue: rpm now 1500\\ntelemetry: rpm=1500\\.0',
      },
    ],
  },
];
