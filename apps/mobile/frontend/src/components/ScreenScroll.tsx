import React from 'react';
import { ScrollView, ScrollViewProps, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing } from '@/theme/colors';

interface Props extends Omit<ScrollViewProps, 'contentContainerStyle'> {
  children: React.ReactNode;
  /** Padding extra debajo del contenido, además del safe-area inferior. Útil para pantallas con una barra flotante (carrito, checkout, etc). */
  bottomExtra?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/** ScrollView estándar de pantalla: mismo padding horizontal/inferior y safe-area en toda la app. */
export default function ScreenScroll({ children, bottomExtra = 40, contentContainerStyle, ...rest }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        { padding: Spacing.md, paddingBottom: insets.bottom + bottomExtra },
        contentContainerStyle,
      ]}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}
