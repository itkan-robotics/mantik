import { getCollection, type CollectionEntry } from 'astro:content';
import type { SectionId } from '@/config/navigation';

export type LessonEntry = CollectionEntry<'java' | 'ftc' | 'frc' | 'comp'>;

export interface SidebarGroup {
  id: string;
  label: string;
  items: SidebarItem[];
}

export interface SidebarItem {
  lessonId: string;
  label: string;
  href: string;
  difficulty?: string;
  duration?: string;
}

export async function getSectionLessons(section: SectionId): Promise<LessonEntry[]> {
  const lessons = await getCollection(section, ({ data }) => !data.draft);
  return lessons.sort((a, b) => {
    const groupOrder = (a.data.groupOrder ?? 0) - (b.data.groupOrder ?? 0);
    if (groupOrder !== 0) return groupOrder;
    return a.data.order - b.data.order;
  });
}

export async function getSidebarGroups(section: SectionId): Promise<SidebarGroup[]> {
  const lessons = await getSectionLessons(section);
  const contentLessons = lessons.filter((l) => !l.data.isOverview);

  const groups = new Map<string, SidebarGroup>();

  for (const lesson of contentLessons) {
    const groupId = lesson.data.group ?? 'general';
    const groupLabel = lesson.data.groupLabel ?? 'General';

    if (!groups.has(groupId)) {
      groups.set(groupId, { id: groupId, label: groupLabel, items: [] });
    }

    groups.get(groupId)!.items.push({
      lessonId: lesson.data.lessonId,
      label: lesson.data.title,
      href: lesson.data.lessonId === 'overview' ? `/${section}` : `/${section}/${lesson.data.lessonId}`,
      difficulty: lesson.data.difficulty,
      duration: lesson.data.duration,
    });
  }

  return Array.from(groups.values());
}

export async function getOverview(section: SectionId): Promise<LessonEntry | undefined> {
  const lessons = await getSectionLessons(section);
  return lessons.find((l) => l.data.isOverview || l.data.lessonId === 'overview');
}

export async function getLesson(
  section: SectionId,
  lessonId: string,
): Promise<LessonEntry | undefined> {
  const lessons = await getSectionLessons(section);
  return lessons.find((l) => l.data.lessonId === lessonId);
}

export async function getAdjacentLessons(
  section: SectionId,
  lessonId: string,
): Promise<{ prev?: SidebarItem; next?: SidebarItem }> {
  const groups = await getSidebarGroups(section);
  const flat = groups.flatMap((g) => g.items);
  const index = flat.findIndex((item) => item.lessonId === lessonId);

  return {
    prev: index > 0 ? flat[index - 1] : undefined,
    next: index >= 0 && index < flat.length - 1 ? flat[index + 1] : undefined,
  };
}
