import { useState } from "react";
import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions, type StyleProp, type ViewStyle } from "react-native";
import { EyeIcon, EyeSlashIcon } from "phosphor-react-native";
import { Pressable } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { radius } from "../../theme/tokens";

interface Props {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  multiline?: boolean;
  maxLength?: number;
}

export function Input({ label, value, onChangeText, placeholder, error, hint, secureTextEntry, keyboardType, autoCapitalize = "sentences", icon, style, multiline, maxLength }: Props) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);

  return (
    <View style={[{ gap: 6 }, style]}>
      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary }}>{label}</Text>
      <View style={{ position: "relative", justifyContent: "center" }}>
        {icon && <View style={styles.leftIcon}>{icon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tokens.textMuted}
          secureTextEntry={secureTextEntry && !showPass}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            multiline && { height: 88, textAlignVertical: "top", paddingTop: 12 },
            {
              borderColor: error ? tokens.danger : focused ? tokens.cyan : tokens.border,
              backgroundColor: tokens.surface1,
              color: tokens.textPrimary,
              paddingLeft: icon ? 38 : 14,
              paddingRight: secureTextEntry ? 40 : 14,
            },
          ]}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setShowPass((s) => !s)} style={styles.rightIcon} accessibilityLabel={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}>
            {showPass ? <EyeSlashIcon size={18} color={tokens.textMuted} /> : <EyeIcon size={18} color={tokens.textMuted} />}
          </Pressable>
        )}
      </View>
      {error ? <Text style={{ fontSize: 12, color: tokens.danger }}>{error}</Text> : hint ? <Text style={{ fontSize: 12, color: tokens.textMuted }}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { height: 46, borderRadius: radius.sm, borderWidth: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  leftIcon: { position: "absolute", left: 12, zIndex: 1 },
  rightIcon: { position: "absolute", right: 12, zIndex: 1 },
});
