import { Platform } from 'react-native';

// Palette pulled straight from the PlateGauge mark.
export const color = {
  ink: '#0B2551', // navy ring
  ink2: '#123268', // lighter navy, for gradients/hovers
  gauge: '#1592FF', // blue fill
  gauge2: '#57B4FF', // lighter blue, for gradients
  needle: '#F59A1E', // orange needle
  plate: '#FFFFFF',
  rim: '#CFDBE6', // plate rim
  wash: '#F3F6FA', // grouped background
  wash2: '#EAF0F7', // slightly deeper wash, for nested surfaces
  sub: '#5B6B84', // secondary text
  faint: '#93A1B5',
  line: '#E3E9F0',
  lineSoft: '#EDF1F6',
  danger: '#D6453D',
  success: '#1C8C5E',
  protein: '#1592FF',
  carbs: '#0B2551',
  fat: '#F59A1E',
};

export const shadow = {
  card: { shadowColor: '#0B2551', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  raised: { shadowColor: '#0B2551', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  soft: { shadowColor: '#0B2551', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
};

export const font = {
  display: 'Lexend_600SemiBold',
  displayBold: 'Lexend_700Bold',
  displayMed: 'Lexend_500Medium',
  // Body stays on the system face so the app reads native on iOS.
  body: Platform.select({ ios: 'System', default: undefined }),
};

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };
export const radius = { s: 10, m: 14, l: 20, pill: 999 };

export const type = {
  hero: { fontFamily: font.displayBold, fontSize: 34, letterSpacing: -0.8, color: color.ink },
  title: { fontFamily: font.display, fontSize: 24, letterSpacing: -0.4, color: color.ink },
  section: { fontFamily: font.display, fontSize: 17, letterSpacing: -0.2, color: color.ink },
  body: { fontSize: 16, color: color.ink },
  small: { fontSize: 13, color: color.sub },
  num: { fontFamily: font.display, color: color.ink, fontVariant: ['tabular-nums' as const] },
};
