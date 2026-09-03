import { ChatCircleDotsIcon, ClockCounterClockwiseIcon, GaugeIcon, HouseIcon, PackageIcon, StorefrontIcon, UserIcon, VideoCameraIcon, type IconProps } from "phosphor-react-native";
import type { ComponentType } from "react";
import type { Rol } from "../lib/types";
import { HomeScreen } from "../screens/comprador/HomeScreen";
import { ExplorarScreen } from "../screens/comprador/ExplorarScreen";
import { ReelsScreen } from "../screens/shared/ReelsScreen";
import { ChatListScreen } from "../screens/shared/ChatListScreen";
import { ProfileScreen } from "../screens/shared/ProfileScreen";
import { VendedorResumenScreen } from "../screens/vendedor/VendedorResumenScreen";
import { VendedorPedidosScreen } from "../screens/vendedor/VendedorPedidosScreen";
import { RepartidorDisponiblesScreen } from "../screens/repartidor/RepartidorDisponiblesScreen";
import { RepartidorEntregasScreen } from "../screens/repartidor/RepartidorEntregasScreen";
import { RepartidorHistorialScreen } from "../screens/repartidor/RepartidorHistorialScreen";
import { AdminHomeScreen } from "../screens/admin/AdminHomeScreen";

export interface TabDef {
  name: string;
  label: string;
  icon: ComponentType<IconProps>;
  component: ComponentType<any>;
}

const COMPRADOR_TABS: TabDef[] = [
  { name: "Inicio", label: "Inicio", icon: HouseIcon, component: HomeScreen },
  { name: "Explorar", label: "Explorar", icon: StorefrontIcon, component: ExplorarScreen },
  { name: "Reels", label: "Reels", icon: VideoCameraIcon, component: ReelsScreen },
  { name: "Chat", label: "Chat", icon: ChatCircleDotsIcon, component: ChatListScreen },
  { name: "Perfil", label: "Perfil", icon: UserIcon, component: ProfileScreen },
];

// El chat de vendedor/repartidor ya NO vive como tab de este panel -- sigue existiendo
// en su ubicación global de siempre (el ícono de chat en TopBar.tsx, visible en todos
// los roles), para no duplicar la entrada de navegación dentro del panel específico.
const VENDEDOR_TABS: TabDef[] = [
  { name: "Inicio", label: "Inicio", icon: HouseIcon, component: VendedorResumenScreen },
  { name: "Pedidos", label: "Pedidos", icon: PackageIcon, component: VendedorPedidosScreen },
  { name: "Reels", label: "Reels", icon: VideoCameraIcon, component: ReelsScreen },
  { name: "Perfil", label: "Perfil", icon: UserIcon, component: ProfileScreen },
];

const REPARTIDOR_TABS: TabDef[] = [
  { name: "Inicio", label: "Inicio", icon: HouseIcon, component: RepartidorDisponiblesScreen },
  { name: "Entregas", label: "Entregas", icon: PackageIcon, component: RepartidorEntregasScreen },
  { name: "Historial", label: "Historial", icon: ClockCounterClockwiseIcon, component: RepartidorHistorialScreen },
  { name: "Perfil", label: "Perfil", icon: UserIcon, component: ProfileScreen },
];

// El admin en la web (AdminLayout.tsx) no tiene ni rastro del sitio de cara al
// comprador (Explorar/Reels/Perfil de comprador) -- es un panel completamente aparte
// con su propio sidebar. Acá el equivalente son solo 2 tabs: el hub de administración
// (dashboard + toda la navegación del sidebar, ver AdminHomeScreen) y Chat, que el
// backend sí soporta para el admin (chat_multi.php deja al admin escribirle a
// cualquier usuario, p. ej. para soporte/moderación).
const ADMIN_TABS: TabDef[] = [
  { name: "Inicio", label: "Inicio", icon: GaugeIcon, component: AdminHomeScreen },
  { name: "Chat", label: "Chat", icon: ChatCircleDotsIcon, component: ChatListScreen },
];

export function getTabsForRole(rol: Rol): TabDef[] {
  if (rol === "vendedor") return VENDEDOR_TABS;
  if (rol === "repartidor") return REPARTIDOR_TABS;
  if (rol === "admin") return ADMIN_TABS;
  return COMPRADOR_TABS;
}
