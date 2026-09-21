import { Platform } from 'react-native';

// Vahla is intentionally quiet: black, white, and neutral greys.
export const color = {
  ink: '#1A1A1A',
  ink2: '#666666',
  gauge: '#1A1A1A',
  gauge2: '#1A1A1A',
  // The sole accent. Reserved for the streak flame.
  needle: '#E87A32',
  plate: '#FFFFFF',
  rim: '#EDEDED',
  wash: '#F7F7F7',
  wash2: '#F1F1F1',
  sub: '#707070',
  faint: '#A3A3A3',
  line: '#E5E5E5',
  lineSoft: '#F0F0F0',
  danger: '#666666',
  success: '#4A4A4A',
  protein: '#1A1A1A',
  carbs: '#1A1A1A',
  fat: '#1A1A1A',
};

export const shadow = {
  card: { shadowColor: '#000000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  raised: { shadowColor: '#000000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  soft: { shadowColor: '#000000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
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
