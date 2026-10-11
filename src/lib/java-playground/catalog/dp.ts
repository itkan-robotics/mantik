import { pg } from './helpers';
import type { JavaPlaygroundExercise } from '../types';

export const DESIGN_PATTERNS: JavaPlaygroundExercise[] = [
  pg(
    'java-dp-factory-method',
    'Practice: factory method',
    `Motor.neo() should return a Motor whose type is neo. Print Motor.neo().type

Expected:

neo`,
    `class Motor {
    String type;

    static Motor neo() {
        Motor m = new Motor();
        // set type, then return m
        return m;
    }
}

public class Main {
    public static void main(String[] args) {
        System.out.println(Motor.neo().type);
    }
}
`,
    [{ name: 'Factory', stdout: 'neo' }],
  ),
  pg(
    'java-dp-dependency-injection',
    'Practice: dependency injection',
    `Drive should receive a Motor in its constructor. Print drive.motor.id

Expected:

falcon`,
    `class Motor {
    String id;

    Motor(String id) {
        this.id = id;
    }
}

class Drive {
    Motor motor;

    Drive(Motor motor) {
        // store the motor this Drive should use
    }
}

public class Main {
    public static void main(String[] args) {
        Drive drive = new Drive(new Motor("falcon"));
        System.out.println(drive.motor.id);
    }
}
`,
    [{ name: 'Injected motor', stdout: 'falcon' }],
  ),
  pg(
    'java-dp-command',
    'Practice: command',
    `Store a Cmd in a variable, then run it later. Print go.

Expected:

go`,
    `interface Cmd {
    void run();
}

public class Main {
    public static void main(String[] args) {
        Cmd cmd = null;
        // create a Cmd that prints go, store it, then call run()
    }
}
`,
    [{ name: 'Store then run', stdout: 'go' }],
  ),
];
