import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const lessonSchema = z.object({
  title: z.string(),
  lessonId: z.string(),
  section: z.enum(['java', 'ftc', 'frc', 'comp']),
  group: z.string().optional(),
  groupLabel: z.string().optional(),
  groupOrder: z.number().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  duration: z.string().optional(),
  order: z.number().default(0),
  description: z.string().optional(),
  draft: z.boolean().optional().default(false),
  isOverview: z.boolean().optional().default(false),
});

const createLessonCollection = (section: 'java' | 'ftc' | 'frc' | 'comp') =>
  defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: `./src/content/${section}` }),
    schema: lessonSchema.extend({ section: z.literal(section) }),
  });

export const collections = {
  java: createLessonCollection('java'),
  ftc: createLessonCollection('ftc'),
  frc: createLessonCollection('frc'),
  comp: createLessonCollection('comp'),
  homepage: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/homepage' }),
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
    }),
  }),
};
