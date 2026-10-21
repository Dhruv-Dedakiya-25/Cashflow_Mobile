import { useColorScheme } from '@/hooks/use-color-scheme';

/** CashFlow's palette, taken from the web app (Inter, blue #2563EB, navy #0F172A), with a matching dark set. */
const light = {
  bg: '#F5F7FB',
  card: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceStrong: '#EEF2F7',
  border: '#E4E9F1',
  text: '#172033',
  textSecondary: '#53627A',
  textMuted: '#667085',
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  primarySoft: '#EFF6FF',
  onPrimary: '#FFFFFF',
  navy: '#0F172A',
  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  teal: '#0F766E',
  tealSoft: '#E6F4F2',
  shadow: '#0F172A',
  // The navy brand band on the sign-in screen.
  hero: '#0F172A',
  heroText: '#FFFFFF',
  heroMuted: '#A9B8CE',
  heroAccent: 'rgba(91,139,247,0.20)',
  heroAccentText: '#A8C0FF',
  // The summary card at the top of Home: brand blue on the light theme.
  summary: '#2563EB',
  summaryText: '#FFFFFF',
  summaryMuted: '#EEF3FF',
  summaryAccent: 'rgba(255,255,255,0.14)',
};

const dark: typeof light = {
  bg: '#0B1220',
  card: '#131C2E',
  surface: '#172135',
  surfaceStrong: '#1E2A42',
  border: '#24304A',
  text: '#E7ECF5',
  textSecondary: '#AAB6CA',
  textMuted: '#7F8CA3',
  primary: '#5B8BF7',
  primaryPressed: '#4777E8',
  primarySoft: '#1A2A4D',
  onPrimary: '#FFFFFF',
  navy: '#E7ECF5',
  success: '#3FCB7E',
  successSoft: '#123524',
  warning: '#F2A94B',
  warningSoft: '#3A2A12',
  danger: '#F2685C',
  dangerSoft: '#3D1A18',
  teal: '#3CC2B2',
  tealSoft: '#123430',
  shadow: '#000000',
  hero: '#131F3B',
  heroText: '#FFFFFF',
  heroMuted: '#A9B8CE',
  heroAccent: 'rgba(91,139,247,0.22)',
  heroAccentText: '#A8C0FF',
  summary: '#131F3B',
  summaryText: '#FFFFFF',
  summaryMuted: '#A9B8CE',
  summaryAccent: 'rgba(91,139,247,0.22)',
};

export type Palette = typeof light;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** One type scale for the whole app: size and line height. */
export const type = {
  caption: { fontSize: 12, lineHeight: 16 },
  small: { fontSize: 13.5, lineHeight: 19 },
  body: { fontSize: 15, lineHeight: 22 },
  bodyLarge: { fontSize: 17, lineHeight: 24 },
  title: { fontSize: 20, lineHeight: 26 },
  heading: { fontSize: 26, lineHeight: 32 },
  display: { fontSize: 32, lineHeight: 38 },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;

/** The content column: on a tablet or a wide window it stops at 640pt and centres, so cards and lines stay readable. */
export const contentColumn = { width: '100%', maxWidth: 640, alignSelf: 'center' } as const;

export const radius = { sm: 8, md: 10, lg: 14, xl: 18, pill: 999 } as const;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
