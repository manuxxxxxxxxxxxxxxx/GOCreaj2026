import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { radius } from "../../theme/tokens";

const MAX_CENTAVOS = 999999; // $9,999.99 -- mismo techo que MAX_PRECIO_PRODUCTO en el backend

function formatearCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Entrada de precio "estilo caja registradora": cada dígito entra por la derecha y
 * empuja los centavos hacia la izquierda (escribir "1" -> $0.01, "12" -> $0.12,
 * "123" -> $1.23), en vez de un campo numérico libre donde es fácil teclear un cero de
 * más y publicar un precio irreal. El valor real vive en centavos (entero) para no
 * arrastrar errores de redondeo de punto flotante mientras se escribe. */
export function PriceInput({ label, value, onChange, error }: { label: string; value: number; onChange: (dolares: number) => void; error?: string }) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const centavos = Math.round(value * 100);

  const onChangeText = (texto: string) => {
    const soloDigitos = texto.replace(/\D/g, "");
    const nuevosCentavos = Math.min(MAX_CENTAVOS, parseInt(soloDigitos || "0", 10));
    onChange(nuevosCentavos / 100);
  };

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary }}>{label}</Text>
      <View
        style={{
          height: 54,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: error ? tokens.danger : focused ? tokens.cyan : tokens.border,
          backgroundColor: tokens.surface1,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
        }}
      >
        <Text style={{ fontSize: 20, fontFamily: "IBMPlexMono_500Medium", color: tokens.textMuted, marginRight: 2 }}>$</Text>
        <TextInput
          value={formatearCentavos(centavos)}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1, fontSize: 20, fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", color: tokens.textPrimary, padding: 0 }}
        />
      </View>
      {error && <Text style={{ fontSize: 12, color: tokens.danger }}>{error}</Text>}
    </View>
  );
}
