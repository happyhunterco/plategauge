/**
 * Pure layout rules for text fields (kept free of react-native imports so it can be unit tested).
 * The onboarding bug: row inputs had an intrinsic width on web/iOS Safari and no minWidth,
 * so they overflowed into the neighboring field and the focus ring appeared to spill over.
 */
export const FIELD_BORDER = 2;
export const CARET_COLOR = '#0A84FF';

export function fieldLayout(focused: boolean) {
  return {
    container: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      minWidth: 0,
      minHeight: 48,
      borderWidth: FIELD_BORDER,
      borderColor: 'transparent',
      margin: 0,
    },
    input: {
      flex: 1,
      minWidth: 0,
      width: '100%' as const,
      outlineWidth: 0,
      outlineColor: 'transparent',
      caretColor: CARET_COLOR,
    },
  };
}
