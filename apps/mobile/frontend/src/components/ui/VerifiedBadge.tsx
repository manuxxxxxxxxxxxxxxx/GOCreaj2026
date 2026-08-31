import { SealCheckIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";

export function VerifiedBadge() {
  const { tokens } = useTheme();
  return <SealCheckIcon size={16} weight="fill" color={tokens.cyan} />;
}
