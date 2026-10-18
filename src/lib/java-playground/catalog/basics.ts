import { main, pg } from './helpers';
import type { JavaPlaygroundExercise } from '../types';

export const BASICS: JavaPlaygroundExercise[] = [
  pg(
    'java-printing',
    'Practice: printing',
    `Print exactly these two lines:

Hello, Java!
I am learning to print.

Use two System.out.println calls. The class must be named Main. Click Run to see the console, then Check to compare.`,
    main('        // Print the two lines from the prompt'),
    [{ name: 'Two lines', stdout: 'Hello, Java!\nI am learning to print.' }],
  ),
  pg(
    'java-variables',
    'Practice: variables',
    `Create variables for this robot and print them.

Use these values:
- String teamName = "Lightning Bolts"
- int wheelCount = 4
- int weightLbs = 125
- boolean isAutonomous = true

Print exactly these four lines:

Team: Lightning Bolts
Wheels: 4
Weight: 125 lbs
Autonomous: true`,
    main('        // Declare the four variables, then print the report'),
    [
      {
        name: 'Robot report',
        stdout: 'Team: Lightning Bolts\nWheels: 4\nWeight: 125 lbs\nAutonomous: true',
      },
    ],
  ),
  pg(
    'java-calculations',
    'Practice: calculations',
    `A robot base is 45 cm by 30 cm. Print the area as an integer.
Then show integer division of 5 / 2 and floating-point division of 5.0 / 2.

Print exactly these three lines:

Area: 1350
Integer division: 2
Floating-point division: 2.5`,
    main(`        int length = 45;
        int width = 30;
        // Compute area, then print the three lines from the prompt`),
    [
      {
        name: 'Area and division',
        stdout: 'Area: 1350\nInteger division: 2\nFloating-point division: 2.5',
      },
    ],
  ),
  pg(
    'java-arrays',
    'Practice: arrays',
    `The starter already has an int array. Print:
- Length: then the array length
- each element on its own line
- Sum: then the total of the elements

For this array that looks like:

Length: 6
4
8
15
16
23
42
Sum: 108`,
    main(`        int[] values = {4, 8, 15, 16, 23, 42};
        // Print length, each element, then the sum`),
    [
      {
        name: 'Length, elements, sum',
        stdout: 'Length: 6\n4\n8\n15\n16\n23\n42\nSum: 108',
      },
    ],
  ),
  pg(
    'java-math',
    'Practice: clamp and deadband',
    `Write clamp(value, min, max) with Math.min and Math.max, and deadband(input,
threshold) that returns 0.0 when |input| is below the threshold and the input
unchanged otherwise. main is written for you.

Expected:

1.0
-1.0
0.4
0.0
0.6`,
    `public class Main {
    // TODO keep value inside [min, max]
    static double clamp(double value, double min, double max) {
        return value;
    }

    // TODO 0.0 when the input is smaller than the threshold in either direction
    static double deadband(double input, double threshold) {
        return input;
    }

    public static void main(String[] args) {
        System.out.println(clamp(1.7, -1.0, 1.0));
        System.out.println(clamp(-2.0, -1.0, 1.0));
        System.out.println(clamp(0.4, -1.0, 1.0));
        System.out.println(deadband(0.05, 0.1));
        System.out.println(deadband(0.6, 0.1));
    }
}
`,
    [{ name: 'Clamp and deadband', stdout: '1.0\n-1.0\n0.4\n0.0\n0.6' }],
  ),
];
