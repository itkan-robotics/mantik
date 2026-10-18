import type { JavaPlaygroundExercise } from '../types';

/**
 * Track 1 of the Practice Assignments, adapted from the FSC Open Docs Java
 * Assignments curriculum (CC BY-SA 4.0).
 *
 * These differ from the lesson playgrounds in three ways:
 *
 * - each names the class the assignment asks the student to write, rather than
 *   forcing `Main`;
 * - where the expected output is partly the student's own, or the assignment
 *   leaves the print format open, the test matches a `pattern` instead of a
 *   literal, and `describe` says what it is looking for;
 * - assignments that specify *methods* rather than console output ship a fixed
 *   `main` in the starter, so the student implements the methods — the point of
 *   the assignment — while the output stays comparable.
 */

const A03_STARTER = `// Author:
// Date:
// What this program does:

public class StringToolkit {
    // Leave main as it is. Implement the five methods below.
    public static void main(String[] args) {
        System.out.println(normaliseName("  jane   DOE "));
        System.out.println(normaliseName("alex P. smith"));
        System.out.println(normaliseName(null));
        System.out.println(eventCodeKey(" sc-ROCK-2026 "));
        System.out.println(eventCodeKey("PA_PIT_2026"));
        System.out.println(namesMatch("  jane DOE ", "Jane Doe"));
        System.out.println(namesMatch("Jane", "John"));
        System.out.println(countVowels("hello world"));
        System.out.println(countVowels(null));
        String[] pair = firstAndLast("Casey  Lee ");
        System.out.println(pair[0] + "|" + pair[1]);
        String[] single = firstAndLast(" Avery ");
        System.out.println(single[0] + "|" + single[1]);
    }

    public static String normaliseName(String raw) {
        return null; // TODO
    }

    public static String eventCodeKey(String raw) {
        return null; // TODO
    }

    public static boolean namesMatch(String a, String b) {
        return false; // TODO
    }

    public static int countVowels(String s) {
        return 0; // TODO
    }

    public static String[] firstAndLast(String fullName) {
        return null; // TODO
    }
}
`;

const A03_EXPECTED = [
  'Jane Doe',
  'Alex P. Smith',
  '',
  'SCROCK2026',
  'PAPIT2026',
  'true',
  'false',
  '3',
  '0',
  'Casey|Lee',
  'Avery|',
].join('\n');

const A05_STARTER = `// Author:
// Date:
// What this program does:

public class MatchPhaseDetector {
    // Leave main as it is. Implement the two phase methods below.
    public static void main(String[] args) {
        int[] times = { -1, 0, 14, 15, 75, 119, 120, 149, 150, 151 };
        for (int t : times) {
            System.out.println(t + " " + phaseWithIfElse(t) + " " + phaseWithSwitch(t));
        }
    }

    public static String phaseWithIfElse(int seconds) {
        return "TODO";
    }

    public static String phaseWithSwitch(int seconds) {
        return "TODO";
    }

    public static String label(int seconds, String phase) {
        return "TODO";
    }
}
`;

const A05_EXPECTED = [
  '-1 OVER OVER',
  '0 AUTO AUTO',
  '14 AUTO AUTO',
  '15 TELEOP TELEOP',
  '75 TELEOP TELEOP',
  '119 TELEOP TELEOP',
  '120 ENDGAME ENDGAME',
  '149 ENDGAME ENDGAME',
  '150 OVER OVER',
  '151 OVER OVER',
].join('\n');

const A08_STARTER = `import java.util.Scanner;

// Author:
// Date:
// What this program does:

public class StickCurve {
    // Leave main as it is. Implement the four methods below.
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        double threshold = in.nextDouble();
        double exponent = in.nextDouble();
        while (true) {
            double raw = in.nextDouble();
            if (raw == 999) {
                break;
            }
            System.out.printf("%.4f %.4f%n", raw, applyCurve(raw, threshold, exponent));
        }
        in.close();
    }

    public static double deadband(double raw, double threshold) {
        return 0.0; // TODO
    }

    public static double signPreservingPow(double value, double exponent) {
        return 0.0; // TODO
    }

    public static double clamp(double value, double min, double max) {
        return 0.0; // TODO
    }

    public static double applyCurve(double raw, double deadbandThreshold, double exponent) {
        return 0.0; // TODO
    }
}
`;

const A08_STDIN = '0.05\n2\n0.0\n0.03\n0.05\n0.5\n-0.5\n1.0\n-1.0\n1.5\n999\n';

const A08_EXPECTED = [
  '0.0000 0.0000',
  '0.0300 0.0000',
  '0.0500 0.0025',
  '0.5000 0.2500',
  '-0.5000 -0.2500',
  '1.0000 1.0000',
  '-1.0000 -1.0000',
  '1.5000 1.0000',
].join('\n');

export const FSC_FOUNDATIONS: JavaPlaygroundExercise[] = [
  {
    id: 'a01-hello-team',
    title: 'A01: Hello, Team',
    entryClass: 'HelloTeam',
    showStdin: false,
    prompt: `Print exactly four lines, in this order:

Name: <your name>
Team: <your team number and name>
Role: <programming, mechanical, electrical, strategy, ...>
Ready to build.

Replace everything in angle brackets with your own information. The last line is
fixed. Use four separate System.out.println calls, and keep the header comment at
the top of the file filled in.`,
    starter: `// Author:
// Date:
// What this program does:

public class HelloTeam {
    public static void main(String[] args) {
        // Print the four lines from the prompt
    }
}
`,
    tests: [
      {
        name: 'Four lines in the right shape',
        describe: 'Name:, Team:, Role: each with something after them, then "Ready to build."',
        pattern: '^Name: [^\\n]+\\nTeam: [^\\n]+\\nRole: [^\\n]+\\nReady to build\\.$',
      },
      {
        name: 'Placeholders filled in',
        describe: 'No angle brackets left anywhere in the output',
        pattern: '^[^<>]*$',
      },
    ],
  },

  {
    id: 'a02-battery-sanity',
    title: 'A02: Battery Sanity Check',
    entryClass: 'BatterySanity',
    showStdin: true,
    prompt: `Predict the voltage at the motor terminals under load:

    vAtMotor = vRest - (current x resistance)

Read three doubles from System.in, in this order: resting voltage, total
resistance, worst-case current. Print all three inputs and the predicted voltage
to two decimal places, then one verdict line:

    >= 9.0 V              Healthy.
    7.0 V up to 9.0 V     Marginal, consider a fresh battery.
    < 7.0 V               Replace immediately.

Put the two thresholds in final double constants. Run needs input — paste
"12.6", "0.025" and "150" on separate lines into the box below.`,
    starter: `import java.util.Scanner;

// Author:
// Date:
// What this program does:

public class BatterySanity {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        // Read the three values, compute the prediction, print the report
        in.close();
    }
}
`,
    tests: [
      {
        name: 'Marginal battery',
        stdin: '12.6\n0.025\n150\n',
        describe: 'Predicted 8.85 V, then "Marginal, consider a fresh battery."',
        pattern: '8\\.85 V[\\s\\S]*Marginal, consider a fresh battery\\.',
      },
      {
        name: 'Healthy battery',
        stdin: '12.6\n0.01\n100\n',
        describe: 'Predicted 11.60 V, then "Healthy."',
        pattern: '11\\.60 V[\\s\\S]*Healthy\\.',
      },
      {
        name: 'Battery needs replacing',
        stdin: '12.0\n0.05\n150\n',
        describe: 'Predicted 4.50 V, then "Replace immediately."',
        pattern: '4\\.50 V[\\s\\S]*Replace immediately\\.',
      },
      {
        name: 'Zero current returns the resting voltage',
        stdin: '12.6\n0.025\n0\n',
        describe: 'Predicted 12.60 V, then "Healthy."',
        pattern: '12\\.60 V[\\s\\S]*Healthy\\.',
      },
      {
        name: 'Exactly 9.00 V is still healthy',
        stdin: '12.0\n0.02\n150\n',
        describe: '9.00 V lands in the healthy bucket, not marginal',
        pattern: '9\\.00 V[\\s\\S]*Healthy\\.',
      },
    ],
  },

  {
    id: 'a03-string-toolkit',
    title: 'A03: String Toolkit',
    entryClass: 'StringToolkit',
    showStdin: false,
    prompt: `Write five static helpers that normalise names and event codes:

    normaliseName(String)   trim, collapse inner whitespace, Title Case;
                            "" for null or whitespace-only
    eventCodeKey(String)    strip whitespace, remove - and _, uppercase
    namesMatch(String, String)  true when the normalised names are equal
    countVowels(String)     count a e i o u, any case; 0 for null
    firstAndLast(String)     {first, last}, or {name, ""} for a single name

main is written for you and calls each one — leave it alone and fill in the
methods. Compare strings with .equals, never with ==.`,
    starter: A03_STARTER,
    tests: [
      {
        name: 'All five helpers on the sample inputs',
        stdout: A03_EXPECTED,
      },
      {
        name: 'Null and single-name inputs',
        describe: 'An empty line for normaliseName(null), 0 vowels for null, and "Avery|" for a single name',
        pattern: '^Jane Doe\\nAlex P\\. Smith\\n\\n[\\s\\S]*\\n0\\n[\\s\\S]*\\nAvery\\|$',
      },
    ],
  },

  {
    id: 'a04-scanner-echo',
    title: 'A04: Scanner Echo',
    entryClass: 'ScannerEcho',
    showStdin: true,
    prompt: `Gather five values, re-prompting until each one is acceptable:

    team number    int, 1 to 99999
    team name      non-empty after trimming
    driver count   int, 1 to 4
    average score  double, >= 0
    climbed        yes or no, any case

Then print the summary block:

    --- Team Summary ---
    Team:           1234 (Example Robotics)
    Drivers:        2
    Avg score:      45.50
    Climbed:        yes

One Scanner for the whole program, closed before exit. A separate static helper
for each input; main just orchestrates. Run needs input — paste the five values
into the box below, one per line.`,
    starter: `import java.util.Scanner;

// Author:
// Date:
// What this program does:

public class ScannerEcho {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        // Call one helper per input, then print the summary block
        in.close();
    }

    // public static int readTeamNumber(Scanner in) { ... }
    // public static String readTeamName(Scanner in) { ... }
    // public static int readDriverCount(Scanner in) { ... }
    // public static double readAvgScore(Scanner in) { ... }
    // public static boolean readClimbed(Scanner in) { ... }
}
`,
    tests: [
      {
        name: 'Summary block for valid input',
        stdin: '1234\nExample Robotics\n2\n45.5\nYES\n',
        describe: 'The five labelled lines, with the score to two decimals and climbed as "yes"',
        pattern:
          'Team:\\s+1234 \\(Example Robotics\\)[\\s\\S]*Drivers:\\s+2[\\s\\S]*Avg score:\\s+45\\.50[\\s\\S]*Climbed:\\s+yes',
      },
      {
        name: 'Re-prompts past out-of-range values',
        stdin: '0\n1234\nExample Robotics\n5\n2\n-5\n45.5\nmaybe\nyes\n',
        describe: 'The same summary, after rejecting 0 drivers, 5 drivers, a negative score and "maybe"',
        pattern:
          'Team:\\s+1234 \\(Example Robotics\\)[\\s\\S]*Drivers:\\s+2[\\s\\S]*Avg score:\\s+45\\.50[\\s\\S]*Climbed:\\s+yes',
      },
    ],
  },

  {
    id: 'a05-match-phase-detector',
    title: 'A05: Match Phase Detector',
    entryClass: 'MatchPhaseDetector',
    showStdin: false,
    prompt: `A match is 150 seconds: 15 seconds of autonomous, then teleop, with the last
30 seconds of teleop counted as endgame.

    t < 0 or t > 150     OVER
    0 <= t < 15          AUTO
    15 <= t < 120        TELEOP
    120 <= t < 150       ENDGAME
    t = 150              OVER

Write the same decision twice: phaseWithIfElse using an if / else if / else
chain, and phaseWithSwitch using a switch over a bucket you compute. Both return
the phase name. The playground compiles at Java 17, so the arrow form works here.
main is written for you and prints them side by side, so a disagreement between
your two versions shows up immediately. Also write label(int, String) — the
checks do not cover it, but the rubric does.`,
    starter: A05_STARTER,
    tests: [
      {
        name: 'Both methods agree across the match',
        stdout: A05_EXPECTED,
      },
      {
        name: 'Times outside the match are OVER',
        describe: 'The -1 and 151 rows both read OVER OVER',
        pattern: '^-1 OVER OVER\\n[\\s\\S]*\\n151 OVER OVER$',
      },
    ],
  },

  {
    id: 'a06-auto-routine-picker',
    title: 'A06: Auto Routine Picker',
    entryClass: 'AutoPicker',
    showStdin: true,
    prompt: `Pick an autonomous routine from three enums. Read three words from System.in —
start position, partner plan, battery condition — convert each with valueOf on
the uppercased input, then apply the first rule that matches:

    1. partner UNKNOWN                  SAFE_HOLD
    2. partner DEFENSE                  SIDE_SPRINT
    3. CENTER and battery FRESH         CENTER_CROSS_AND_SHOOT
    4. CENTER, any other battery        CENTER_CROSS_ONLY
    5. LEFT and partner SCORE           LEFT_AVOID
    6. RIGHT and partner SCORE          RIGHT_AVOID
    7. anything else                    SAFE_HOLD

Print the routine and a one-line reason. In the browser everything lives in
AutoPicker.java: declare the four enums in this file without the public keyword,
since only AutoPicker can be public. Run needs input — paste three words into
the box below, one per line.`,
    starter: `import java.util.Scanner;

// Author:
// Date:
// What this program does:

enum StartPosition { LEFT, CENTER, RIGHT }

enum PartnerPlan { SCORE, DEFENSE, UNKNOWN }

enum BatteryCondition { FRESH, WARM, COLD }

enum AutoRoutine {
    CENTER_CROSS_AND_SHOOT,
    CENTER_CROSS_ONLY,
    LEFT_AVOID,
    RIGHT_AVOID,
    SIDE_SPRINT,
    SAFE_HOLD
}

public class AutoPicker {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        // Read the three inputs, call chooseRoutine, print the routine and a reason
        in.close();
    }

    static AutoRoutine chooseRoutine(StartPosition pos, PartnerPlan partner, BatteryCondition battery) {
        return AutoRoutine.SAFE_HOLD; // TODO
    }
}
`,
    tests: [
      {
        name: 'Centre start, fresh battery',
        stdin: 'center\nscore\nfresh\n',
        describe: 'CENTER_CROSS_AND_SHOOT',
        pattern: 'CENTER_CROSS_AND_SHOOT',
      },
      {
        name: 'Centre start, tired battery',
        stdin: 'center\nscore\ncold\n',
        describe: 'CENTER_CROSS_ONLY',
        pattern: 'CENTER_CROSS_ONLY',
      },
      {
        name: 'Side start with a scoring partner',
        stdin: 'right\nscore\nwarm\n',
        describe: 'RIGHT_AVOID',
        pattern: 'RIGHT_AVOID',
      },
      {
        name: 'A defending partner outranks the position rules',
        stdin: 'left\ndefense\nfresh\n',
        describe: 'SIDE_SPRINT, not LEFT_AVOID — rule 2 is checked before rule 5',
        pattern: 'SIDE_SPRINT',
      },
      {
        name: 'An unknown partner outranks everything',
        stdin: 'center\nunknown\nfresh\n',
        describe: 'SAFE_HOLD, not CENTER_CROSS_AND_SHOOT — rule 1 wins',
        pattern: 'SAFE_HOLD',
      },
    ],
  },

  {
    id: 'a07-match-countdown',
    title: 'A07: Match Countdown',
    entryClass: 'MatchCountdown',
    showStdin: true,
    prompt: `Print 151 lines, one for each second t = 0 through t = 150:

    t=  0  AUTO     [                                ]   0%
    t= 15  TELEOP   [###                             ]  10%
    t= 75  TELEOP   [################                ]  50%
    t=120  ENDGAME  [#########################       ]  80%
    t=150  OVER     [################################] 100%

The bar is 32 characters wide; fill t * 32 / 150 of them with # using integer
division. The percent is t * 100 / 150, right-aligned in three columns. Phases
use the A05 boundaries. Afterwards prompt "Run again? (y/n):" and replay on y,
using a do-while for the outer loop. Run needs input — put "n" in the box below
so it stops after one pass.`,
    starter: `import java.util.Scanner;

// Author:
// Date:
// What this program does:

public class MatchCountdown {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        // do { print 151 lines; ask to run again; } while (answer is y)
        in.close();
    }
}
`,
    tests: [
      {
        name: 'Start, middle and end of the match',
        stdin: 'n\n',
        describe: 'The t=0, t=15, t=75 and t=150 rows exactly as shown in the prompt',
        pattern:
          't=  0  AUTO     \\[ {32}\\]   0%[\\s\\S]*t= 15  TELEOP   \\[#{3} {29}\\]  10%[\\s\\S]*t= 75  TELEOP   \\[#{16} {16}\\]  50%[\\s\\S]*t=150  OVER     \\[#{32}\\] 100%',
      },
      {
        name: 'Endgame boundary and the last second before it ends',
        stdin: 'n\n',
        describe: 't=120 starts endgame at 80%, and t=149 is 31 blocks at 99%',
        pattern:
          't=120  ENDGAME  \\[#{25} {7}\\]  80%[\\s\\S]*t=149  ENDGAME  \\[#{31} {1}\\]  99%',
      },
      {
        name: 'The bar never overflows its brackets',
        stdin: 'n\n',
        describe: 'Every row has exactly 32 characters between [ and ]',
        pattern: '^(?:[^\\n]*\\[[#| ]{32}\\][^\\n]*\\n)+[\\s\\S]*$',
      },
    ],
  },

  {
    id: 'a08-stick-curve-calculator',
    title: 'A08: Stick-Curve Calculator',
    entryClass: 'StickCurve',
    showStdin: true,
    prompt: `Shape a raw joystick reading into something a driver can hold steady:

    deadband(raw, threshold)      0.0 when |raw| < threshold, otherwise raw
    signPreservingPow(v, exp)     |v| to the power exp, with v's sign back on
    clamp(value, min, max)        value held inside [min, max]
    applyCurve(raw, thr, exp)     deadband, then the curve, then clamp to [-1, 1]

main is written for you: it reads the threshold, the exponent, then raw values
until you enter 999, and prints each raw value and its curved result. Leave it
alone and implement the four methods. Run needs input — paste the sample from the
assignment into the box below.`,
    starter: A08_STARTER,
    tests: [
      {
        name: 'Deadband, curve and clamp together',
        stdin: A08_STDIN,
        stdout: A08_EXPECTED,
      },
      {
        name: 'The sign survives the curve',
        stdin: '0.05\n2\n-0.5\n-1.5\n999\n',
        describe: '-0.5 curves to -0.2500, and -1.5 clamps to -1.0000',
        pattern: '^-0\\.5000 -0\\.2500\\n-1\\.5000 -1\\.0000$',
      },
      {
        name: 'A value exactly on the deadband is kept',
        stdin: '0.05\n2\n0.05\n0.0499\n999\n',
        describe: '0.05 is not inside a 0.05 deadband, but 0.0499 is',
        pattern: '^0\\.0500 0\\.0025\\n0\\.0499 0\\.0000$',
      },
    ],
  },

  {
    id: 'a09-encoder-smoother',
    title: 'A09: Encoder Smoother',
    entryClass: 'SmoothOne',
    showStdin: true,
    prompt: `A raw encoder trace is noisy. Smooth it with a trailing moving average.

Read n, then n doubles into an array, then a window size between 1 and n. Build a
second array where smoothed[i] is the mean of readings[max(0, i - window + 1)]
through readings[i], inclusive at both ends. Print the index, the raw value and
the smoothed value, all to two decimals:

    i   raw     smoothed
    0   10.10   10.10
    1   12.20   11.15
    2   11.80   11.37

Note that the first few entries average fewer than window values, because there
is nothing before the start of the array. Run needs input — paste n, the values
and the window into the box below, one per line.`,
    starter: `import java.util.Scanner;

// Author:
// Date:
// What this program does:

public class SmoothOne {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        // Read n, the readings and the window; build the smoothed array; print both
        in.close();
    }
}
`,
    tests: [
      {
        name: 'Trailing average over a window of three',
        stdin: '6\n10.1\n12.2\n11.8\n9.4\n10.0\n8.0\n3\n',
        describe: 'Smoothed column reads 10.10, 11.15, 11.37, 11.13, 10.40, 9.13',
        pattern:
          '10\\.10[\\s\\S]*11\\.15[\\s\\S]*11\\.37[\\s\\S]*11\\.13[\\s\\S]*10\\.40[\\s\\S]*9\\.13',
      },
      {
        name: 'A window of one changes nothing',
        stdin: '3\n1.0\n2.0\n3.0\n1\n',
        describe: 'Each smoothed value equals its raw value',
        pattern: '1\\.00[\\s\\S]*1\\.00[\\s\\S]*2\\.00[\\s\\S]*2\\.00[\\s\\S]*3\\.00[\\s\\S]*3\\.00',
      },
      {
        name: 'A full-length window averages everything so far',
        stdin: '4\n1.0\n2.0\n3.0\n4.0\n4\n',
        describe: 'Smoothed column reads 1.00, 1.50, 2.00, 2.50',
        pattern: '1\\.00[\\s\\S]*1\\.50[\\s\\S]*2\\.00[\\s\\S]*2\\.50',
      },
    ],
  },

  {
    id: 'a10-shooter-lookup',
    title: 'A10: Shooter Lookup Table',
    entryClass: 'ShooterLookup',
    showStdin: true,
    prompt: `Turn a handful of measured distance/RPM pairs into a shooter lookup table.

Read n, then n pairs of distance and RPM into a double[n][2]. Sort them by
distance ascending with a sort you write yourself, print the sorted table, then
loop: read a distance, print its RPM, and stop on a negative distance.

    below the table    return the first RPM, and print (clamped at min)
    above the table    return the last RPM, and print (clamped at max)
    in between         linear interpolation between the two nearest samples

    y = y1 + (x - x1) * (y2 - y1) / (x2 - x1)

Print results as "RPM = 3150.00". Run needs input — paste the sample session from
the assignment into the box below.`,
    starter: `import java.util.Scanner;

// Author:
// Date:
// What this program does:

public class ShooterLookup {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        // Read the samples, sort, print, then answer distance queries
        in.close();
    }

    // public static double[][] readSamples(Scanner in, int n) { ... }
    // public static void sortSamples(double[][] samples) { ... }
    // public static int upperIndex(double[][] samples, double distance) { ... }
    // public static double interpolate(double[][] samples, double distance) { ... }
    // public static void printSamples(double[][] samples) { ... }
    // public static double rpmFor(double[][] samples, double distance) { ... }
}
`,
    tests: [
      {
        name: 'Samples come back sorted by distance',
        stdin: '4\n1.0 2200\n3.0 3500\n2.0 2800\n4.0 4100\n-1\n',
        describe: 'The table prints 1.00, 2.00, 3.00, 4.00 in that order even though 3.0 was entered second',
        pattern:
          '1\\.00 m -> 2200\\.00 rpm[\\s\\S]*2\\.00 m -> 2800\\.00 rpm[\\s\\S]*3\\.00 m -> 3500\\.00 rpm[\\s\\S]*4\\.00 m -> 4100\\.00 rpm',
      },
      {
        name: 'Interpolates between two samples',
        stdin: '4\n1.0 2200\n3.0 3500\n2.0 2800\n4.0 4100\n2.5\n-1\n',
        describe: '2.5 m sits halfway between 2800 and 3500, so RPM = 3150.00',
        pattern: 'RPM = 3150\\.00',
      },
      {
        name: 'Clamps below and above the table',
        stdin: '4\n1.0 2200\n3.0 3500\n2.0 2800\n4.0 4100\n0.5\n5\n-1\n',
        describe: '0.5 m gives 2200.00 (clamped at min) and 5 m gives 4100.00 (clamped at max)',
        pattern:
          'RPM = 2200\\.00[\\s\\S]*clamped at min[\\s\\S]*RPM = 4100\\.00[\\s\\S]*clamped at max',
      },
      {
        name: 'A distance exactly on a sample needs no interpolation',
        stdin: '4\n1.0 2200\n3.0 3500\n2.0 2800\n4.0 4100\n3.0\n-1\n',
        describe: '3.0 m returns 3500.00 exactly',
        pattern: 'RPM = 3500\\.00',
      },
    ],
  },
];
