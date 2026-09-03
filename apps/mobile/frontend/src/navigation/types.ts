import type { NavigatorScreenParams } from "@react-navigation/native";

export type TabsParamList = {
  Inicio: undefined;
  Explorar: { departamento?: string; grupo?: string; categoria?: string } | undefined;
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
  OrderDetail: { id: number; recienCreado?: boolean; totalPedidos?: number };
  ChatList: undefined;
  ChatThread: { otroId: number };
  RepartidorPerfilPublico: { id: number };
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
  Configuracion: undefined;
  Seguridad: undefined;
  MiColeccion: { tipo: "likes" | "guardados" };
  AdminUsuarios: undefined;
  AdminPedidos: undefined;
  AdminProductos: undefined;
  AdminArbol: undefined;
  AdminRepartidores: undefined;
  AdminCobertura: undefined;
  AdminCupones: undefined;
  AdminFinanzas: undefined;
  AdminSoporte: undefined;
  AdminSolicitudes: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};
