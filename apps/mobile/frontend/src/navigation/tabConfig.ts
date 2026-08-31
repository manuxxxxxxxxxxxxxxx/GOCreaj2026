import { ChatCircleDotsIcon, HouseIcon, PackageIcon, StorefrontIcon, UserIcon, VideoCameraIcon, type IconProps } from "phosphor-react-native";
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

const VENDEDOR_TABS: TabDef[] = [
  { name: "Inicio", label: "Inicio", icon: HouseIcon, component: VendedorResumenScreen },
  { name: "Pedidos", label: "Pedidos", icon: PackageIcon, component: VendedorPedidosScreen },
  { name: "Reels", label: "Reels", icon: VideoCameraIcon, component: ReelsScreen },
  { name: "Chat", label: "Chat", icon: ChatCircleDotsIcon, component: ChatListScreen },
  { name: "Perfil", label: "Perfil", icon: UserIcon, component: ProfileScreen },
];

const REPARTIDOR_TABS: TabDef[] = [
  { name: "Inicio", label: "Inicio", icon: HouseIcon, component: RepartidorDisponiblesScreen },
  { name: "Entregas", label: "Entregas", icon: PackageIcon, component: RepartidorEntregasScreen },
  { name: "Reels", label: "Reels", icon: VideoCameraIcon, component: ReelsScreen },
  { name: "Chat", label: "Chat", icon: ChatCircleDotsIcon, component: ChatListScreen },
  { name: "Perfil", label: "Perfil", icon: UserIcon, component: ProfileScreen },
];

export function getTabsForRole(rol: Rol): TabDef[] {
  if (rol === "vendedor") return VENDEDOR_TABS;
  if (rol === "repartidor") return REPARTIDOR_TABS;
  return COMPRADOR_TABS;
}
