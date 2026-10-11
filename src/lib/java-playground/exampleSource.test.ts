import { describe, expect, it } from 'vitest';
import {
  exampleLooksNonterminating,
  exampleNeedsStdin,
  looksLikeRunnableJava,
  suggestExampleStdin,
  wrapExampleSource,
} from './exampleSource';

describe('looksLikeRunnableJava', () => {
  it('accepts print snippets', () => {
    expect(
      looksLikeRunnableJava('System.out.println("Hello world!");'),
    ).toBe(true);
  });

  it('rejects comment-only blocks', () => {
    expect(
      looksLikeRunnableJava('// This is where your Java journey begins!\n// Next lesson'),
    ).toBe(false);
  });

  it('rejects exercise placeholders', () => {
    expect(looksLikeRunnableJava('Practice with these printing exercises:')).toBe(false);
  });

  it('rejects git snippets tagged as java', () => {
    expect(looksLikeRunnableJava('git branch feature-name\ngit checkout -b new-branch')).toBe(false);
  });

  it('rejects an infinite print loop', () => {
    expect(
      looksLikeRunnableJava('while (true) {\n    System.out.println("I can program!");\n}'),
    ).toBe(false);
  });
});

describe('wrapExampleSource', () => {
  it('wraps statements in Main.main', () => {
    const wrapped = wrapExampleSource('System.out.println("Hello world!");\n');
    expect(wrapped.entryClass).toBe('Main');
    expect(wrapped.hasMain).toBe(true);
    expect(wrapped.wrapped).toBe(true);
    expect(wrapped.source).toContain('public class Main');
    expect(wrapped.source).toContain('System.out.println("Hello world!");');
  });

  it('keeps a complete program class name', () => {
    const src = `public class MyProgram {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
    }
}`;
    const wrapped = wrapExampleSource(src);
    expect(wrapped.entryClass).toBe('MyProgram');
    expect(wrapped.hasMain).toBe(true);
    expect(wrapped.wrapped).toBe(false);
    expect(wrapped.source).toContain('public class MyProgram');
  });

  it('does not invent a main for a class-only example', () => {
    const src = `public class TeamMember {
    private String name;
    public TeamMember(String memberName) {
        this.name = memberName;
    }
}`;
    const wrapped = wrapExampleSource(src);
    expect(wrapped.entryClass).toBe('TeamMember');
    expect(wrapped.hasMain).toBe(false);
    expect(wrapped.source).not.toContain('void main');
  });

  it('wraps top-level methods in Main', () => {
    const src = `public static void greet(String name) {
    System.out.println("Hello, " + name + "!");
}

public static void main(String[] args) {
    greet("Robot");
}`;
    const wrapped = wrapExampleSource(src);
    expect(wrapped.entryClass).toBe('Main');
    expect(wrapped.hasMain).toBe(true);
    expect(wrapped.source).toContain('public class Main');
    expect(wrapped.source).toContain('greet("Robot");');
  });

  it('runs the complete class when a dump also has leading methods', () => {
    const src = `public static void greet(String name) {
    System.out.println("Hello, " + name + "!");
}

public class RobotProgram {
    public static void main(String[] args) {
        System.out.println("ready");
    }
}`;
    const wrapped = wrapExampleSource(src);
    expect(wrapped.entryClass).toBe('RobotProgram');
    expect(wrapped.hasMain).toBe(true);
    expect(wrapped.source).toContain('public class RobotProgram');
    expect(wrapped.source).not.toContain('public static void greet');
  });

  it('adds java.util imports for collection snippets', () => {
    const src = `ArrayList<Integer> integers = new ArrayList<>();
integers.add(15);
System.out.println(integers.size());`;
    const wrapped = wrapExampleSource(src);
    expect(wrapped.source).toContain('import java.util.*;');
    expect(wrapped.source).toContain('ArrayList<Integer>');
  });

  it('keeps existing imports at the top', () => {
    const src = `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        System.out.println(2);
    }
}`;
    const wrapped = wrapExampleSource(src);
    expect(wrapped.entryClass).toBe('Main');
    expect(wrapped.source.startsWith('import java.io.*;')).toBe(true);
  });

  it('moves demo statements after a class into Main.main', () => {
    const src = `public class Robot {
    private final String name;
    public Robot(String name) { this.name = name; }
    public String toString() { return name; }
}

Robot[] team = new Robot[1];
team[0] = new Robot("SpeedBot");
System.out.println(team[0]);
`;
    const wrapped = wrapExampleSource(src);
    expect(wrapped.entryClass).toBe('Main');
    expect(wrapped.hasMain).toBe(true);
    expect(wrapped.source).toContain('class Robot {');
    expect(wrapped.source).not.toMatch(/public class Robot/);
    expect(wrapped.source).toContain('public class Main');
    expect(wrapped.source).toContain('team[0] = new Robot("SpeedBot");');
  });

  it('moves demo statements after two classes into Main.main', () => {
    const src = `class Parent { String label = "parent"; }
class Child extends Parent { String label = "child"; }

Parent p = new Child();
System.out.println(p.label);
`;
    const wrapped = wrapExampleSource(src);
    expect(wrapped.entryClass).toBe('Main');
    expect(wrapped.source).toContain('class Parent {');
    expect(wrapped.source).toContain('class Child extends Parent');
    expect(wrapped.source).toContain('Parent p = new Child();');
  });

  it('keeps a leading type annotation on the type, not in main', () => {
    const src = `@FunctionalInterface
interface ReadingTest {
    boolean matches(int reading);
}
`;
    const wrapped = wrapExampleSource(src);
    expect(wrapped.hasMain).toBe(false);
    expect(wrapped.source).toContain('@FunctionalInterface');
    expect(wrapped.source).toContain('interface ReadingTest');
    expect(wrapped.source).not.toContain('void main');
  });
});

describe('exampleNeedsStdin', () => {
  it('detects Scanner and System.in', () => {
    expect(exampleNeedsStdin('Scanner scanner = new Scanner(System.in);')).toBe(true);
    expect(exampleNeedsStdin('System.out.println(1);')).toBe(false);
  });
});

describe('suggestExampleStdin', () => {
  it('supplies three numbers for sequential nextLine reads', () => {
    const src = `Scanner scanner = new Scanner(System.in);
int sum = 0;
sum = sum + Integer.valueOf(scanner.nextLine());
sum = sum + Integer.valueOf(scanner.nextLine());
sum = sum + Integer.valueOf(scanner.nextLine());
System.out.println("The sum is " + sum);`;
    expect(suggestExampleStdin(src)).toBe('1\n2\n3\n');
  });

  it('supplies five numbers when the loop stops after five reads', () => {
    const src = `Scanner scanner = new Scanner(System.in);
int numbersRead = 0;
int sum = 0;
while (true) {
    if (numbersRead == 5) {
        break;
    }
    sum = sum + Integer.valueOf(scanner.nextLine());
    numbersRead = numbersRead + 1;
}`;
    expect(suggestExampleStdin(src)).toBe('1\n2\n3\n4\n5\n');
  });

  it('exits a y-loop then a 0-loop', () => {
    const src = `Scanner scanner = new Scanner(System.in);
while (true) {
    String input = scanner.nextLine();
    if (input.equals("y")) {
        break;
    }
}
while (true) {
    int reading = Integer.valueOf(scanner.nextLine());
    if (reading == 0) {
        break;
    }
}`;
    expect(suggestExampleStdin(src)).toBe('n\ny\n4\n1\n0\n');
  });

  it('includes invalid then sentinel values for continue/break', () => {
    const src = `Scanner scanner = new Scanner(System.in);
while (true) {
    int number = Integer.valueOf(scanner.nextLine());
    if (number <= 0) {
        continue;
    }
    if (number == 999) {
        break;
    }
}
while (true) {
    int reading = Integer.valueOf(scanner.nextLine());
    if (reading == -1) {
        break;
    }
    if (reading < 0 || reading > 100) {
        continue;
    }
}`;
    expect(suggestExampleStdin(src)).toBe('-2\n15\n999\n42\n150\n-1\n');
  });

  it('supplies one line for a single numeric read', () => {
    const src = `BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
int n = Integer.parseInt(in.readLine().trim());
System.out.println(n * 2);`;
    expect(suggestExampleStdin(src)).toBe('1\n');
  });
});

describe('exampleLooksNonterminating', () => {
  it('rejects a while(true) with no break', () => {
    expect(
      exampleLooksNonterminating('while (true) { System.out.println("I can program!"); }'),
    ).toBe(true);
  });

  it('allows a while(true) that breaks', () => {
    expect(
      exampleLooksNonterminating(
        'int n = 0; while (true) { n++; if (n >= 3) break; }',
      ),
    ).toBe(false);
  });
});
