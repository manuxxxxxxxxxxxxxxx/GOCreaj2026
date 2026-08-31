import type { NavigatorScreenParams } from "@react-navigation/native";

export type TabsParamList = {
  Inicio: undefined;
  Explorar: { departamento?: string } | undefined;
  Reels: { tiendaId?: number; productoId?: number } | undefined;
  Chat: undefined;
  Perfil: undefined;
  Pedidos: undefined;
  Entregas: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabsParamList> | undefined;
  ProductDetail: { id: number };
  StoreDetail: { id: number };
  Cart: undefined;
  Checkout: { cuponCodigo?: string } | undefined;
  Orders: undefined;
  OrderDetail: { id: number };
  ChatThread: { otroId: number };
  Notifications: undefined;
  Direcciones: undefined;
  Wallet: undefined;
  Convertirse: undefined;
  Soporte: undefined;
  VendedorProductos: undefined;
  VendedorProductoForm: { id?: number };
  VendedorReelForm: undefined;
  VendedorTienda: undefined;
  VendedorResenas: undefined;
  RepartidorPerfil: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};
