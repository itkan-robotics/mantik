import { z } from 'zod';

export const resourceMajorSchema = z.enum(['java', 'ftc', 'frc', 'comp', 'general']);

export const resourceEntrySchema = z.object({
  id: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'id must be lowercase slug'),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
  url: z.string().min(1).max(2048),
  major: resourceMajorSchema,
  minor: z.string().min(1).max(80),
  tags: z.array(z.string().min(1).max(40)).max(10).optional(),
  source: z.enum(['mantik', 'community']).optional(),
});

export const resourcesCatalogSchema = z.object({
  version: z.literal(1),
  resources: z.array(resourceEntrySchema).min(1),
});

export type ResourceMajor = z.infer<typeof resourceMajorSchema>;
export type ResourceEntry = z.infer<typeof resourceEntrySchema>;
export type ResourcesCatalog = z.infer<typeof resourcesCatalogSchema>;

/** Majors shown in filter UI */
export const RESOURCE_MAJOR_LABELS: Record<ResourceMajor, string> = {
  java: 'Java',
  ftc: 'FTC',
  frc: 'FRC',
  comp: 'Competitive',
  general: 'General',
};

/** Minors available in submit form (extend as catalog grows) */
export const RESOURCE_MINOR_OPTIONS = [
  'Environment Setup',
  'Getting Started',
  'Command-Based',
  'Control Theory',
  'Vision',
  'Autonomous',
  'Advanced Tools',
  'Version Control',
  'Training & Tutorials',
  'OnBot Java Setup',
  'TeleOp Programming',
  'Autonomous Programming',
  'Robot Hardware',
  'Debugging & Best Practices',
  'Android Studio Setup',
  'Odometry',
  'Path Planning',
  'Advanced Movement Control',
  'Other',
] as const;

export const submitResourceSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
  url: z.string().trim().min(1).max(2048),
  major: resourceMajorSchema,
  minor: z.string().trim().min(1).max(80),
  submitterContact: z.string().trim().max(120).optional(),
  turnstileToken: z.string().min(1),
  website: z.string().max(0).optional(), // honeypot
});

export type SubmitResourcePayload = z.infer<typeof submitResourceSchema>;
