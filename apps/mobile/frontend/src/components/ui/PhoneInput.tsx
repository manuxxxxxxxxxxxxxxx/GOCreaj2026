import { useState } from "react";
import { StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { radius } from "../../theme/tokens";

interface Props {
  label?: string;
  value: string;
  onChangeText: (digits: string) => void;
  error?: string;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}

/** Strips everything but digits and keeps at most the last 8 -- callers may
 * pass in a previously-saved value that still has a "+503 " prefix, dashes,
 * or spaces from before this component existed. */
function toLocalDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length > 8 ? digits.slice(-8) : digits;
}

/** El Salvador only has one calling code and 8-digit local numbers, so the
 * prefix is fixed chrome, not editable text -- there's nothing else to select. */
export function PhoneInput({ label = "Teléfono", value, onChangeText, error, hint, style }: Props) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const digits = toLocalDigits(value);

  return (
    <View style={[{ gap: 6 }, style]}>
      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary }}>{label}</Text>
      <View style={[styles.row, { borderColor: error ? tokens.danger : focused ? tokens.cyan : tokens.border, backgroundColor: tokens.surface1 }]}>
        <View style={[styles.prefix, { backgroundColor: tokens.surface2, borderRightColor: tokens.border }]}>
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary }}>+503</Text>
        </View>
        <TextInput
          value={digits}
          onChangeText={(v) => onChangeText(toLocalDigits(v))}
          placeholder="7000 0000"
          placeholderTextColor={tokens.textMuted}
          keyboardType="number-pad"
          maxLength={8}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { color: tokens.textPrimary }]}
        />
      </View>
      {error ? <Text style={{ fontSize: 12, color: tokens.danger }}>{error}</Text> : hint ? <Text style={{ fontSize: 12, color: tokens.textMuted }}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", height: 46, borderRadius: radius.sm, borderWidth: 1, overflow: "hidden" },
  prefix: { height: "100%", justifyContent: "center", paddingHorizontal: 12, borderRightWidth: 1 },
  input: { flex: 1, height: "100%", paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
});
