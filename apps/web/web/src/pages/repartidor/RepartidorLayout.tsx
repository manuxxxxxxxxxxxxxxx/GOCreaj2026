import { Outlet } from "react-router-dom";
import { ClockCounterClockwise, Gauge, Package, User, Wallet as WalletIcon } from "@phosphor-icons/react";
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
            { to: "/repartidor/historial", label: "Historial", icon: ClockCounterClockwise },
          ],
        },
        {
          label: "Cuenta",
          items: [
            { to: "/repartidor/perfil", label: "Mi perfil", icon: User },
            { to: "/repartidor/wallet", label: "Billetera", icon: WalletIcon },
          ],
        },
      ]}
    >
      <div className="dashboard-content">
        <Outlet />
      </div>
    </SidebarLayout>
  );
}
