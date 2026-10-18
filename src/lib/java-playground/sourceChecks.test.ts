import { describe, expect, it } from 'vitest';
import { javaFileName } from './sourceChecks';

describe('javaFileName', () => {
  it('uses the public class name', () => {
    expect(javaFileName('public class Robot {\n}\n')).toBe('Robot.java');
  });

  it('falls back to the first type name', () => {
    expect(javaFileName('class TeamMember {\n}\npublic class Main {\n}\n')).toBe('Main.java');
    expect(javaFileName('class Helper {\n}\n')).toBe('Helper.java');
  });

  it('defaults to Main.java for snippets', () => {
    expect(javaFileName('System.out.println("hi");')).toBe('Main.java');
  });
});
