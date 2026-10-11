import { main, pg } from './helpers';
import type { JavaPlaygroundExercise } from '../types';

export const LOOPS: JavaPlaygroundExercise[] = [
  pg(
    'java-while-loops',
    'Practice: while loops',
    `Use a while loop to print the numbers 1 through 5, each on its own line.`,
    main(`        int n = 1;
        // Loop while n is at most 5`),
    [{ name: 'Count 1 to 5', stdout: '1\n2\n3\n4\n5' }],
  ),
  pg(
    'java-for-loops',
    'Practice: for loops',
    `Use a for loop to print 0 through 4, each on its own line.`,
    main('        // for loop from 0 to 4'),
    [{ name: 'Count 0 to 4', stdout: '0\n1\n2\n3\n4' }],
  ),
  pg(
    'java-loop-control',
    'Practice: loop control',
    `Loop from 1 through 5. Skip 3 with continue. Print the other numbers, each on its own line.

Expected:

1
2
4
5`,
    main(`        for (int n = 1; n <= 5; n++) {
            // skip 3, print the rest
        }`),
    [{ name: 'Skip 3', stdout: '1\n2\n4\n5' }],
  ),
  pg(
    'java-loop-best-practices',
    'Practice: loop structure',
    `Declare total before the loop. Add 1 + 2 + 3 + 4 inside the loop. Print the total.

Expected:

10`,
    main(`        // declare total here, then loop, then print`),
    [{ name: 'Sum 1 to 4', stdout: '10' }],
  ),
];
