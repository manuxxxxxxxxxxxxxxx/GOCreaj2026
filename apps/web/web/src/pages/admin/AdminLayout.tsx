import { Outlet } from "react-router-dom";
import { ChartBar, CurrencyDollarSimple, Gauge, MapPinLine, Package, Storefront, Tag, TreeStructure, UsersThree, Headset, Bicycle } from "@phosphor-icons/react";
import { SidebarLayout } from "../../components/layout/SidebarLayout";

export function AdminLayout() {
  return (
    <SidebarLayout
      brand="SV[Go] Admin"
      sections={[
        {
          label: "General",
          items: [
            { to: "/admin", label: "Resumen", icon: Gauge, end: true },
            { to: "/admin/usuarios", label: "Usuarios", icon: UsersThree },
            { to: "/admin/pedidos", label: "Pedidos", icon: Package },
            { to: "/admin/productos", label: "Productos", icon: Storefront },
            { to: "/admin/arbol", label: "Árbol de control", icon: TreeStructure },
          ],
        },
        {
          label: "Operación",
          items: [
            { to: "/admin/repartidores", label: "Repartidores en vivo", icon: Bicycle },
            { to: "/admin/cobertura", label: "Zonas de cobertura", icon: MapPinLine },
            { to: "/admin/cupones", label: "Cupones", icon: Tag },
            { to: "/admin/finanzas", label: "Finanzas", icon: CurrencyDollarSimple },
          ],
        },
        {
          label: "Soporte",
          items: [
            { to: "/admin/soporte", label: "Tickets", icon: Headset },
            { to: "/admin/solicitudes", label: "Solicitudes de rol", icon: ChartBar },
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
