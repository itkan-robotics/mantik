import { pg } from './helpers';
import type { JavaPlaygroundExercise } from '../types';

export const FUNCTIONS: JavaPlaygroundExercise[] = [
  pg(
    'java-fn-functions-as-data',
    'Practice: functions as data',
    `Print numbers from the list that pass a Test (value greater than 5). Use an anonymous class that implements Test. Do not use a lambda.

Expected:

12
8`,
    `interface Test {
    boolean ok(int n);
}

public class Main {
    static void printPassing(int[] values, Test test) {
        for (int i = 0; i < values.length; i++) {
            if (test.ok(values[i])) {
                System.out.println(values[i]);
            }
        }
    }

    public static void main(String[] args) {
        int[] values = {3, 12, 8};
        // pass an anonymous Test that is true when n > 5
    }
}
`,
    [{ name: 'Filter through Test', stdout: '12\n8' }],
  ),
  pg(
    'java-fn-lambdas',
    'Practice: lambdas',
    `Assign a lambda that doubles its argument. Print apply(5).

Expected:

10`,
    `interface Fn {
    int apply(int n);
}

public class Main {
    public static void main(String[] args) {
        Fn f = n -> 0;
        System.out.println(f.apply(5));
    }
}
`,
    [{ name: 'Double 5', stdout: '10' }],
  ),
  pg(
    'java-fn-method-references',
    'Practice: method references',
    `Point a Fn at Main.hello using a method reference. Call run().

Expected:

hi`,
    `interface Fn {
    void run();
}

public class Main {
    static void hello() {
        System.out.println("hi");
    }

    public static void main(String[] args) {
        Fn f = null;
        // TODO: point f at Main.hello with a method reference, then f.run()
    }
}
`,
    [{ name: 'Method reference', stdout: 'hi' }],
  ),
  pg(
    'java-fn-supplier',
    'Practice: Supplier',
    `Make a Supplier that reads box.n each time get() is called. Set box.n to 2, then print s.get().

Expected:

2`,
    `import java.util.function.Supplier;

class Box {
    int n = 1;
}

public class Main {
    public static void main(String[] args) {
        final Box box = new Box();
        Supplier<String> s = () -> "";
        box.n = 2;
        System.out.println(s.get());
    }
}
`,
    [{ name: 'Live supplier', stdout: '2' }],
  ),
  pg(
    'java-streams',
    'Practice: one pipeline',
    `Given the scores, use one stream pipeline to keep the values at or above 60,
double each one, and collect them into a list. Print the list.

Expected:

[176, 122, 146]`,
    `import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<Integer> scores = List.of(45, 88, 61, 29, 73);
        // TODO filter >= 60, map to double, toList, then print
    }
}
`,
    [{ name: 'filter then map', stdout: '[176, 122, 146]' }],
  ),
];
