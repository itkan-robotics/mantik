import { main, pg } from './helpers';
import type { JavaPlaygroundExercise } from '../types';

export const LOGIC: JavaPlaygroundExercise[] = [
  pg(
    'java-conditionals',
    'Practice: conditionals',
    `first is 40 and second is 80. For each, print LOW if the value is less than 50, otherwise print OK.

Expected:

LOW
OK`,
    main(`        int first = 40;
        int second = 80;
        // Print LOW or OK for first, then for second`),
    [{ name: 'Two readings', stdout: 'LOW\nOK' }],
  ),
  pg(
    'java-switch',
    'Practice: switch',
    `Mode codes are 1, 2, and 9. For each, print AUTO if the code is 1, TELEOP if it is 2, and UNKNOWN for anything else.

Expected:

AUTO
TELEOP
UNKNOWN`,
    main(`        int first = 1;
        int second = 2;
        int third = 9;
        // Print AUTO, TELEOP, or UNKNOWN for each code`),
    [{ name: 'Three modes', stdout: 'AUTO\nTELEOP\nUNKNOWN' }],
  ),
  pg(
    'java-methods',
    'Practice: methods',
    `Write a method named doubleIt that takes an int and returns twice that value.
From main, print doubleIt(21) on its own line.

Expected output:

42`,
    `public class Main {
    // Write doubleIt here

    public static void main(String[] args) {
        // Print doubleIt(21)
    }
}
`,
    [{ name: 'doubleIt(21)', stdout: '42' }],
  ),
  pg(
    'java-control',
    'Practice: control flow',
    `Write zone(int distance) so it returns:
- FAR if distance is greater than 20
- NEAR if distance is greater than 5
- STOP otherwise

From main, print zone(25), zone(12), and zone(3), each on its own line.

Expected:

FAR
NEAR
STOP`,
    `public class Main {
    public static String zone(int distance) {
        return "";
    }

    public static void main(String[] args) {
        System.out.println(zone(25));
        System.out.println(zone(12));
        System.out.println(zone(3));
    }
}
`,
    [{ name: 'Three distances', stdout: 'FAR\nNEAR\nSTOP' }],
  ),
  pg(
    'java-try-catch',
    'Practice: try-catch',
    `Read one line from System.in. Try Integer.parseInt on it.
If it parses, print the number. If it throws NumberFormatException, print bad.

Check runs two hidden inputs.`,
    main(`        java.util.Scanner in = new java.util.Scanner(System.in);
        String line = in.nextLine();
        // parse or print bad`),
    [
      { name: 'Valid int', stdin: '7\n', stdout: '7' },
      { name: 'Not a number', stdin: 'abc\n', stdout: 'bad' },
    ],
    true,
  ),
];
