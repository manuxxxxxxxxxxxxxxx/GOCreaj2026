import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";
import { TabsShell } from "./TabsShell";
import { ProductDetailScreen } from "../screens/comprador/ProductDetailScreen";
import { StoreDetailScreen } from "../screens/comprador/StoreDetailScreen";
import { CartScreen } from "../screens/comprador/CartScreen";
import { CheckoutScreen } from "../screens/comprador/CheckoutScreen";
import { OrdersScreen } from "../screens/comprador/OrdersScreen";
import { OrderDetailScreen } from "../screens/comprador/OrderDetailScreen";
import { ChatThreadScreen } from "../screens/shared/ChatThreadScreen";
import { NotificationsScreen } from "../screens/shared/NotificationsScreen";
import { DireccionesScreen } from "../screens/shared/DireccionesScreen";
import { WalletScreen } from "../screens/shared/WalletScreen";
import { ConvertirseScreen } from "../screens/shared/ConvertirseScreen";
import { SoporteScreen } from "../screens/shared/SoporteScreen";
import { VendedorProductosScreen } from "../screens/vendedor/VendedorProductosScreen";
import { VendedorProductoFormScreen } from "../screens/vendedor/VendedorProductoFormScreen";
import { VendedorReelFormScreen } from "../screens/vendedor/VendedorReelFormScreen";
import { VendedorTiendaScreen } from "../screens/vendedor/VendedorTiendaScreen";
import { VendedorResenasScreen } from "../screens/vendedor/VendedorResenasScreen";
import { RepartidorPerfilScreen } from "../screens/repartidor/RepartidorPerfilScreen";
import { ConfiguracionAvanzadaScreen } from "../screens/shared/ConfiguracionAvanzadaScreen";
import { MiColeccionScreen } from "../screens/shared/MiColeccionScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: "transparent" } }}>
      <Stack.Screen name="Tabs" component={TabsShell} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="StoreDetail" component={StoreDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Direcciones" component={DireccionesScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Convertirse" component={ConvertirseScreen} />
      <Stack.Screen name="Soporte" component={SoporteScreen} />
      <Stack.Screen name="VendedorProductos" component={VendedorProductosScreen} />
      <Stack.Screen name="VendedorProductoForm" component={VendedorProductoFormScreen} options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="VendedorReelForm" component={VendedorReelFormScreen} options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="VendedorTienda" component={VendedorTiendaScreen} />
      <Stack.Screen name="VendedorResenas" component={VendedorResenasScreen} />
      <Stack.Screen name="RepartidorPerfil" component={RepartidorPerfilScreen} />
      <Stack.Screen name="Configuracion" component={ConfiguracionAvanzadaScreen} />
      <Stack.Screen name="MiColeccion" component={MiColeccionScreen} />
    </Stack.Navigator>
  );
}
