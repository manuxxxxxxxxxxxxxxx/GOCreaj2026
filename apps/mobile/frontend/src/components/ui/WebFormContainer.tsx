import { View, type StyleProp, type ViewStyle } from "react-native";

/** En pantallas anchas (web de escritorio) centra el formulario con un ancho máximo en vez
 * de estirar los campos de borde a borde -- en móvil el ancho disponible ya es menor al
 * máximo, así que esto no le cambia nada. */
export function WebFormContainer({ children, maxWidth = 720, style }: { children: React.ReactNode; maxWidth?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: "100%", maxWidth, alignSelf: "center" }, style]}>{children}</View>;
}
