import type { SectionId } from '@/config/navigation';

/** Sections whose MDX lessons get in-browser Java Run controls (CheerpJ). */
export const JAVA_PLAYGROUND_SECTIONS: readonly SectionId[] = ['java', 'comp'];

export function sectionHasJavaPlayground(section: string): boolean {
  return (JAVA_PLAYGROUND_SECTIONS as readonly string[]).includes(section);
}
