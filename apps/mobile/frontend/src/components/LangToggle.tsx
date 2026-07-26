import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, View } from 'react-native';
import { useLang } from '@/context/LangContext';
import { Colors, Radius, Fonts } from '@/theme/colors';

interface Props {
  style?: any;
  light?: boolean;
}

export default function LangToggle({ style, light }: Props): React.JSX.Element {
  const { lang, cambiarIdioma } = useLang();
  const slideAnim = useRef(new Animated.Value(lang === 'es' ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: lang === 'es' ? 0 : 1,
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start();
  }, [lang, slideAnim]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 36],
  });

  return (
    <TouchableOpacity
      style={[
        styles.container,
        light && styles.containerLight,
        style,
      ]}
      onPress={cambiarIdioma}
      activeOpacity={0.85}
    >
      <Animated.View style={[styles.indicator, { transform: [{ translateX }] }]} />
      <View style={styles.labelContainer}>
        <Text style={[styles.label, lang === 'es' && styles.labelActive]}>ES</Text>
      </View>
      <View style={styles.labelContainer}>
        <Text style={[styles.label, lang === 'en' && styles.labelActive]}>EN</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(74, 109, 140, 0.08)',
    borderRadius: Radius.pill,
    padding: 3,
    width: 78,
    height: 32,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(74, 109, 140, 0.12)',
  },
  containerLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  indicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 36,
    height: 26,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  labelContainer: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    fontSize: Fonts.small - 1,
    fontWeight: '800',
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  labelActive: {
    color: Colors.contrast,
  },
});
