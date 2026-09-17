import { useWindowDimensions } from 'react-native';

/** Desktop and tablet-web breakpoint. Phones never reach it. */
export const WIDE = 900;
export const SIDEBAR = 240;
export const CONTENT = 760;

export function useWide() {
  const { width } = useWindowDimensions();
  return width >= WIDE;
}

/** Usable width of the main column (minus sidebar on wide screens). */
export function useColumnWidth(max = CONTENT) {
  const { width } = useWindowDimensions();
  const avail = width >= WIDE ? width - SIDEBAR : width;
  return Math.min(avail, max);
}

export const column = { width: '100%' as const, maxWidth: CONTENT, alignSelf: 'center' as const };
