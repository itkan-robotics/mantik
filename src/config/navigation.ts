export type SectionId = 'java' | 'ftc' | 'frc' | 'comp';

export type AppRouteId = 'resources' | 'pid-simulation';

export interface NavSection {
  id: SectionId;
  label: string;
  path: string;
  collection: SectionId;
  underConstruction?: boolean;
}

export interface AppRoute {
  id: AppRouteId;
  label: string;
  path: string;
}

export const sections: NavSection[] = [
  { id: 'java', label: 'Java', path: '/java', collection: 'java' },
  { id: 'ftc', label: 'FTC', path: '/ftc', collection: 'ftc' },
  { id: 'frc', label: 'FRC', path: '/frc', collection: 'frc' },
  {
    id: 'comp',
    label: 'Competitive',
    path: '/comp',
    collection: 'comp',
    underConstruction: true,
  },
];

export const appRoutes: AppRoute[] = [
  { id: 'resources', label: 'Resources', path: '/resources' },
  { id: 'pid-simulation', label: 'PID Sim', path: '/pid-simulation' },
];

export const siteConfig = {
  title: 'Mantik - FIRST Programming Made Easy',
  description:
    'Comprehensive programming documentation and interactive learning platform for FIRST Robotics students.',
  url: 'https://mantik.netlify.app',
  author: 'Abdullah Khaled',
  github: 'https://github.com/itkan-robotics/mantik',
  brand: {
    iconLight: '/media/mantik-icon.svg',
    iconDark: '/media/mantik-icon-dark.svg',
    lockupLight: '/media/logos/mantik-lockup-horizontal.svg',
    lockupDark: '/media/logos/mantik-lockup-horizontal-dark.svg',
    ogImage: '/media/mantik-icon.svg',
  },
};

export function sectionFromPath(pathname: string): SectionId | null {
  const match = pathname.match(/^\/(java|ftc|frc|comp)/);
  return match ? (match[1] as SectionId) : null;
}

export function lessonUrl(section: SectionId, lessonId: string): string {
  if (lessonId === 'overview') return `/${section}`;
  return `/${section}/${lessonId}`;
}
