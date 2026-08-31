import { Outlet } from "react-router-dom";
import { ChatCircleDots, Gauge, Package, Star, Storefront, Wallet as WalletIcon } from "@phosphor-icons/react";
import { SidebarLayout } from "../../components/layout/SidebarLayout";

export function VendedorLayout() {
  return (
    <SidebarLayout
      brand="SV[Go] Vendedor"
      sections={[
        {
          label: "General",
          items: [
            { to: "/vendedor", label: "Resumen", icon: Gauge, end: true },
            { to: "/vendedor/pedidos", label: "Pedidos", icon: Package },
            { to: "/vendedor/productos", label: "Productos", icon: Storefront },
            { to: "/vendedor/resenas", label: "Reseñas", icon: Star },
          ],
        },
        {
          label: "Cuenta",
          items: [
            { to: "/vendedor/tienda", label: "Mi tienda", icon: Storefront },
            { to: "/vendedor/wallet", label: "Billetera", icon: WalletIcon },
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
