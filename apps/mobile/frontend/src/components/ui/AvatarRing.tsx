import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../theme/ThemeContext";
import { Avatar } from "./Avatar";

interface Props {
  nombre: string;
  foto?: string | null;
  size?: number;
  /** 0–1. Si se omite, el anillo se dibuja sólido (fijo) en vez de como progreso. */
  progress?: number;
  color?: "cyan" | "violet" | "coral";
}

export function AvatarRing({ nombre, foto, size = 84, progress, color = "cyan" }: Props) {
  const { tokens } = useTheme();
  const ringSize = size + 10;
  const strokeWidth = 3;
  const radius = ringSize / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const dash = progress === undefined ? circumference : circumference * Math.min(Math.max(progress, 0), 1);
  const accent = color === "violet" ? tokens.violet : color === "coral" ? tokens.coral : tokens.cyan;

  return (
    <View style={{ width: ringSize, height: ringSize }}>
      <Svg width={ringSize} height={ringSize} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke={tokens.border} strokeWidth={strokeWidth} />
        <Circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          fill="none"
          stroke={accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </Svg>
      <View style={{ position: "absolute", top: (ringSize - size) / 2, left: (ringSize - size) / 2 }}>
        <Avatar nombre={nombre} foto={foto} size={size} />
      </View>
    </View>
  );
}
