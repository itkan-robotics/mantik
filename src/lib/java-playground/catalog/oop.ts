import { pg } from './helpers';
import type { JavaPlaygroundExercise } from '../types';

export const OOP: JavaPlaygroundExercise[] = [
  pg(
    'java-classes',
    'Practice: classes',
    `Finish Counter so add(int n) increases value, and get() returns it.
In main, add 1 then 2, then print get().

Expected:

3`,
    `class Counter {
    private int value;

    public void add(int n) {
        // add n to value
    }

    public int get() {
        return 0;
    }
}

public class Main {
    public static void main(String[] args) {
        Counter c = new Counter();
        c.add(1);
        c.add(2);
        System.out.println(c.get());
    }
}
`,
    [{ name: '1 + 2', stdout: '3' }],
  ),
  pg(
    'java-objects',
    'Practice: objects',
    `Create two Bot objects named Alpha and Beta. Print each name on its own line.

Expected:

Alpha
Beta`,
    `class Bot {
    String name;

    Bot(String name) {
        this.name = name;
    }
}

public class Main {
    public static void main(String[] args) {
        // create two Bot objects and print their names
    }
}
`,
    [{ name: 'Two bots', stdout: 'Alpha\nBeta' }],
  ),
  pg(
    'java-objects-references',
    'Practice: references',
    `a and b should point at the same Cell. Set a.value to 5, then print b.value.

Expected:

5`,
    `class Cell {
    int value;
}

public class Main {
    public static void main(String[] args) {
        Cell a = new Cell();
        Cell b = a;
        // set a.value, then print b.value
    }
}
`,
    [{ name: 'Shared object', stdout: '5' }],
  ),
  pg(
    'java-overloading',
    'Practice: overloading',
    `Give Label two constructors:
- Label() sets text to "none"
- Label(String s) sets text to s

Print two labels: the no-arg one, then one with "arm".

Expected:

none
arm`,
    `class Label {
    String text;

    // two constructors
}

public class Main {
    public static void main(String[] args) {
        // print both labels
    }
}
`,
    [{ name: 'Two constructors', stdout: 'none\narm' }],
  ),
  pg(
    'java-inheritance',
    'Practice: inheritance',
    `Make NeoMotor extend Motor so it inherits type. Print new NeoMotor().type

Expected:

motor`,
    `class Motor {
    String type = "motor";
}

class NeoMotor {
    // TODO: extend Motor
}

public class Main {
    public static void main(String[] args) {
        // print new NeoMotor().type
    }
}
`,
    [{ name: 'Inherited field', stdout: 'motor' }],
  ),
  pg(
    'java-abstract-classes',
    'Practice: abstract classes',
    `Gyro must implement id(). Print new Gyro().id()

Expected:

gyro`,
    `abstract class Device {
    abstract String id();
}

class Gyro extends Device {
    String id() {
        return "";
    }
}

public class Main {
    public static void main(String[] args) {
        Device d = new Gyro();
        System.out.println(d.id());
    }
}
`,
    [{ name: 'Abstract method', stdout: 'gyro' }],
  ),
  pg(
    'java-interfaces',
    'Practice: interfaces',
    `Team must implement Named. Print new Team().name()

Expected:

3476`,
    `interface Named {
    String name();
}

class Team implements Named {
    public String name() {
        return "";
    }
}

public class Main {
    public static void main(String[] args) {
        Named n = new Team();
        System.out.println(n.name());
    }
}
`,
    [{ name: 'Interface method', stdout: '3476' }],
  ),
  pg(
    'java-runtime-polymorphism',
    'Practice: polymorphism',
    `Dog.speak should print woof. Keep the variable type as Animal.

Expected:

woof`,
    `class Animal {
    void speak() {
        System.out.println("...");
    }
}

class Dog extends Animal {
    void speak() {
    }
}

public class Main {
    public static void main(String[] args) {
        Animal a = new Dog();
        a.speak();
    }
}
`,
    [{ name: 'Overridden speak', stdout: 'woof' }],
  ),
  pg(
    'java-generics',
    'Practice: a generic pair',
    `Finish Pair<A, B> so that first() and second() return the two values and swap()
returns a new Pair with them the other way round. main is written for you.

Expected:

Robonauts 118
118 Robonauts`,
    `class Pair<A, B> {
    private final A first;
    private final B second;

    Pair(A first, B second) {
        this.first = first;
        this.second = second;
    }

    A first() {
        return first;   // TODO
    }

    B second() {
        return second;  // TODO
    }

    // TODO return a Pair<B, A> with the values swapped
    Pair<B, A> swap() {
        return null;
    }
}

public class Main {
    public static void main(String[] args) {
        Pair<String, Integer> team = new Pair<>("Robonauts", 118);
        System.out.println(team.first() + " " + team.second());
        Pair<Integer, String> swapped = team.swap();
        System.out.println(swapped.first() + " " + swapped.second());
    }
}
`,
    [{ name: 'Pair and swap', stdout: 'Robonauts 118\n118 Robonauts' }],
  ),
  pg(
    'java-static-final',
    'Practice: one counter, many sensors',
    `Give Sensor a static int named built that every constructor increments, and a
final String named id that is set once in the constructor. main creates three
sensors, prints the count through the class name, then one sensor's id.

Expected:

3
gyro`,
    `class Sensor {
    // TODO static int built — one counter shared by every Sensor
    // TODO final String id — assigned once, in the constructor

    Sensor(String id) {
        // TODO assign id and bump the counter
    }
}

public class Main {
    public static void main(String[] args) {
        Sensor a = new Sensor("gyro");
        Sensor b = new Sensor("encoder");
        Sensor c = new Sensor("limit");
        System.out.println(Sensor.built);
        System.out.println(a.id);
    }
}
`,
    [{ name: 'Static counter and final id', stdout: '3\ngyro' }],
  ),
];
