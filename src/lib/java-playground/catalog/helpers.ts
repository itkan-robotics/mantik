import type { HiddenTest, JavaPlaygroundExercise } from '../types';

export function main(body: string): string {
  return `public class Main {
    public static void main(String[] args) {
${body}
    }
}
`;
}

export function pg(
  id: string,
  title: string,
  prompt: string,
  starter: string,
  tests: HiddenTest[],
  showStdin = false,
): JavaPlaygroundExercise {
  return { id, title, prompt, starter, showStdin, tests };
}
