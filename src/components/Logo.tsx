import { Image } from 'react-native';

const arc = (cx: number, cy: number, r: number, from: number, to: number) => {
  const p = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const [x1, y1] = p(from);
  const [x2, y2] = p(to);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
};

/** The Vahla wing mark is a supplied brand asset, not a redrawn approximation. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return <Image source={require('../../assets/vahla-wing.png')} style={{ width: size, height: Math.round(size * 0.58) }} resizeMode="contain" accessibilityLabel="Vahla" />;
}

export function LogoWordmark({ width = 76 }: { width?: number }) {
  return <Image source={require('../../assets/vahla-wordmark.png')} style={{ width, height: Math.round(width * 0.259) }} resizeMode="contain" accessibilityLabel="vahla" />;
}

export { arc };
