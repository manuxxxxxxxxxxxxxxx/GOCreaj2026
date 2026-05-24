import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, KeyboardTypeOptions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 4) return d;
  return `${d.slice(0, 4)}-${d.slice(4)}`;
}

function formatDUI(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 9);
  if (d.length <= 8) return d;
  return `${d.slice(0, 8)}-${d.slice(8)}`;
}

function formatCard(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 16);
  return d.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

interface Props extends Omit<TextInputProps, 'onChange'> {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  valid?: boolean;
  inputType?: 'phone' | 'dui' | 'card' | 'expiry' | 'cvv';
  keyboardType?: KeyboardTypeOptions;
}

export default function Input({
  label, icon, error, valid, style,
  onFocus, onBlur, onChangeText,
  value, inputType, placeholder, secureTextEntry, ...rest
}: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry ?? false);

  const resolvedPlaceholder = placeholder ?? (
    inputType === 'phone'  ? '0000-0000'    :
    inputType === 'dui'    ? '00000000-0'   :
    inputType === 'card'   ? '0000 0000 0000 0000' :
    inputType === 'expiry' ? 'MM/AA'        :
    inputType === 'cvv'    ? '---'          : undefined
  );

  const handleChangeText = (raw: string) => {
    if (!onChangeText) return;
    if (inputType === 'phone')  onChangeText(formatPhone(raw));
    else if (inputType === 'dui')   onChangeText(formatDUI(raw));
    else if (inputType === 'card')  onChangeText(formatCard(raw));
    else if (inputType === 'expiry') onChangeText(formatExpiry(raw));
    else if (inputType === 'cvv')   onChangeText(raw.replace(/\D/g, '').slice(0, 3));
    else onChangeText(raw);
  };

  const borderColor = error
    ? colors.danger
    : valid === true
    ? colors.success
    : focused
    ? colors.accent
    : colors.border;

  const trailingIcon: keyof typeof Ionicons.glyphMap | null =
    error       ? 'close-circle'     :
    valid === true ? 'checkmark-circle' :
    secureTextEntry ? (hidden ? 'eye-outline' : 'eye-off-outline') :
    null;

  const trailingColor =
    error       ? colors.danger  :
    valid === true ? colors.success :
    colors.muted;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: focused ? colors.accent : colors.text }]}>
          {label}
        </Text>
      ) : null}
      <View style={[
        styles.box,
        {
          backgroundColor: colors.inputBg,
          borderColor,
          shadowColor: focused ? colors.accent : '#000',
          shadowOpacity: focused ? 0.10 : 0.02,
        }
      ]}>
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? colors.accent : colors.muted}
            style={{ marginRight: Spacing.sm }}
          />
        ) : null}
        <TextInput
          style={[styles.input, { color: colors.text }, style]}
          placeholderTextColor={colors.muted}
          placeholder={resolvedPlaceholder}
          value={value}
          onChangeText={handleChangeText}
          secureTextEntry={hidden}
          keyboardType={
            (inputType === 'phone' || inputType === 'dui' || inputType === 'cvv')
              ? 'number-pad'
              : inputType === 'card' || inputType === 'expiry'
              ? 'numeric'
              : rest.keyboardType
          }
          onFocus={e => { setFocused(true); onFocus?.(e); }}
          onBlur={e => { setFocused(false); onBlur?.(e); }}
          {...rest}
        />
        {trailingIcon ? (
          <Ionicons
            name={trailingIcon}
            size={20}
            color={trailingColor}
            style={{ marginLeft: Spacing.xs }}
            onPress={secureTextEntry ? () => setHidden(h => !h) : undefined}
          />
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.errorTxt, { color: colors.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.md, width: '100%' },
  label: {
    fontSize: Fonts.small,
    marginBottom: 6,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  input: { flex: 1, fontSize: Fonts.regular, fontWeight: '500' },
  errorTxt: { fontSize: Fonts.small, marginTop: 4, fontWeight: '600' },
});
