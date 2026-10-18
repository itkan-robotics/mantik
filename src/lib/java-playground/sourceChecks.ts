/** Strip block and line comments; lengths are not preserved. */
export function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
}

/** Public class name from source, ignoring comments. */
export function publicClassName(source: string): string | null {
  const match = withoutComments(source).match(/\bpublic\s+class\s+([A-Za-z_][A-Za-z0-9_]*)\b/);
  return match ? match[1] : null;
}

/** File tab label for the shared editor chrome. */
export function javaFileName(source: string): string {
  const pub = publicClassName(source);
  if (pub) return `${pub}.java`;
  const match = withoutComments(source).match(
    /\b(?:class|interface|enum)\s+([A-Za-z_][A-Za-z0-9_]*)\b/,
  );
  return match ? `${match[1]}.java` : 'Main.java';
}

export function hasMainMethod(source: string): boolean {
  return /\bstatic\s+void\s+main\s*\(\s*String/.test(withoutComments(source));
}

/**
 * Playground compiles `<entryClass>.java`, matching the local `javac X.java` / `java X` flow.
 * Returns an error message, or null when the source is usable.
 */
export function assertPublicMain(source: string, entryClass = 'Main'): string | null {
  const stripped = withoutComments(source);
  const name = stripped.match(/\bpublic\s+class\s+([A-Za-z_][A-Za-z0-9_]*)\b/)?.[1] ?? null;
  if (name !== entryClass) {
    if (!name) {
      return `This playground expects a public class named ${entryClass}, with a main method. Add: public class ${entryClass}`;
    }
    return `This playground expects public class ${entryClass} (found ${name}). Rename the class to ${entryClass} so it matches ${entryClass}.java.`;
  }
  if (!hasMainMethod(source)) {
    return 'Add a main method: public static void main(String[] args)';
  }
  return null;
}
