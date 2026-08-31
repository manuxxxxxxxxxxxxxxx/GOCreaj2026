import { Outlet } from "react-router-dom";
import { ChatCircleDots, Gauge, Package, User, Wallet as WalletIcon } from "@phosphor-icons/react";
import { SidebarLayout } from "../../components/layout/SidebarLayout";

export function RepartidorLayout() {
  return (
    <SidebarLayout
      brand="SV[Go] Repartidor"
      sections={[
        {
          label: "General",
          items: [
            { to: "/repartidor", label: "Disponibles", icon: Gauge, end: true },
            { to: "/repartidor/entregas", label: "Mi pedido actual", icon: Package },
          ],
        },
        {
          label: "Cuenta",
          items: [
            { to: "/repartidor/perfil", label: "Mi perfil", icon: User },
            { to: "/repartidor/wallet", label: "Billetera", icon: WalletIcon },
            { to: "/chat", label: "Chat", icon: ChatCircleDots },
          ],
        },
      ]}
    >
      <div style={{ padding: "24px 28px 60px" }}>
        <Outlet />
      </div>
    </SidebarLayout>
  );
}
