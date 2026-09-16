import Svg, { Circle, Line, Path } from 'react-native-svg';
import { color } from '../theme';

const arc = (cx: number, cy: number, r: number, from: number, to: number) => {
  const p = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const [x1, y1] = p(from);
  const [x2, y2] = p(to);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
};

/** The PlateGauge mark, drawn in vector so it stays crisp at any size. */
export function LogoMark({ size = 28 }: { size?: number }) {
  const n = (deg: number, r: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
  };
  const [nx1, ny1] = n(45, 38.4);
  const [nx2, ny2] = n(45, 50.5);
  return (
    <Svg width={size} height={size} viewBox="-4 -4 108 108">
      <Circle cx={50} cy={50} r={39.7} stroke={color.ink} strokeWidth={10} fill={color.plate} />
      <Path d={arc(50, 50, 39.7, 0, 126)} stroke={color.gauge} strokeWidth={10} strokeLinecap="round" fill="none" />
      <Circle cx={50} cy={50} r={25.9} stroke={color.rim} strokeWidth={1.9} fill="none" />
      <Line x1={nx1} y1={ny1} x2={nx2} y2={ny2} stroke={color.needle} strokeWidth={4} strokeLinecap="round" />
    </Svg>
  );
}

export { arc };
