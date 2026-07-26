import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing } from '@/theme/colors';

interface Props {
  mensaje?: string;
}

export default function LoadingScreen({ mensaje = 'Cargando' }: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.accent} />
      <Text style={styles.texto}>{mensaje}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  texto: {
    marginTop: Spacing.md,
    color: Colors.text,
    fontSize: Fonts.regular,
    letterSpacing: 0.5
  }
});
