import { useRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

const LARGO = 6;

/** Entrada de PIN estilo "casillas" (una por dígito) en vez de un campo de texto plano --
 * un TextInput real e invisible recibe el foco/teclado numérico y dibuja el valor sobre
 * las casillas visibles, el patrón estándar de OTP/PIN en RN sin depender de un input
 * nativo por casilla (que complica el borrado/pegado). */
export function PinBoxInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { tokens } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const digitos = value.replace(/\D/g, "").slice(0, LARGO);

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.row} accessibilityRole="none">
      {Array.from({ length: LARGO }).map((_, i) => {
        const lleno = i < digitos.length;
        const activo = i === digitos.length;
        return (
          <View
            key={i}
            style={[
              styles.box,
              {
                borderColor: activo ? tokens.cyan : lleno ? tokens.borderStrong : tokens.border,
                backgroundColor: tokens.surface1,
              },
            ]}
          >
            <Text style={{ fontSize: 20, fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", color: tokens.textPrimary }}>{digitos[i] ?? ""}</Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={digitos}
        onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, LARGO))}
        keyboardType="number-pad"
        maxLength={LARGO}
        autoFocus
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, justifyContent: "center" },
  box: { width: 42, height: 50, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  // Captura el teclado/valor real pero no se ve -- las casillas de arriba son la
  // representación visual, no un input por dígito.
  hiddenInput: { position: "absolute", opacity: 0, width: 1, height: 1 },
});
