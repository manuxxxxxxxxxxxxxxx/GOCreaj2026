import { useEffect, useState } from "react";
import { Bicycle, Flag, ShoppingBag, Storefront, TreeStructure, UsersThree } from "@phosphor-icons/react";
import { adminApi, ApiError } from "../../lib/api";
import { money } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { Avatar } from "../../components/ui/Avatar";
import { Skeleton } from "../../components/ui/Skeleton";

type Arbol = Awaited<ReturnType<typeof adminApi.arbolControl>>["arbol"];
type Tab = "vendedores" | "repartidores" | "compradores" | "tiendas" | "productos" | "reels";

const TABS: { key: Tab; label: string; icon: typeof UsersThree }[] = [
  { key: "vendedores", label: "Vendedores", icon: Storefront },
  { key: "repartidores", label: "Repartidores", icon: Bicycle },
  { key: "compradores", label: "Compradores", icon: UsersThree },
  { key: "tiendas", label: "Tiendas", icon: Storefront },
  { key: "productos", label: "Productos", icon: ShoppingBag },
  { key: "reels", label: "Reels", icon: Flag },
];

export function AdminArbol() {
  const [arbol, setArbol] = useState<Arbol | null>(null);
  const [tab, setTab] = useState<Tab>("vendedores");
  const toast = useToast();

  useEffect(() => {
    adminApi.arbolControl().then((r) => setArbol(r.arbol)).catch((err) => toast.show(err instanceof ApiError ? err.message : "No se pudo cargar el árbol.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h1 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <TreeStructure size={20} /> Árbol de control
      </h1>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const count = arbol?.[t.key]?.length ?? 0;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: "var(--radius-pill)", border: `1px solid ${tab === t.key ? "var(--cyan)" : "var(--border)"}`, background: tab === t.key ? "var(--cyan-bg)" : "var(--surface-1)", color: tab === t.key ? "var(--cyan)" : "var(--text-secondary)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
            >
              <Icon size={14} />
              {t.label}
              <span className="tabular" style={{ opacity: 0.7 }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {arbol === null ? (
        <Skeleton height={300} />
      ) : (
        <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          {(tab === "vendedores" || tab === "repartidores" || tab === "compradores") &&
            arbol[tab].map((u) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                <Avatar nombre={u.nombre} foto={u.foto_perfil} size={30} online={!!u.en_linea} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{u.nombre}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{u.email}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: u.activo ? "var(--ok)" : "var(--danger)" }}>{u.activo ? "Activo" : "Suspendido"}</span>
              </div>
            ))}

          {tab === "tiendas" &&
            arbol.tiendas.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface-2)", overflow: "hidden", flexShrink: 0 }}>{t.logo && <img src={t.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{t.nombre}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    {t.vendedor_nombre} · {t.municipio}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: t.activo ? "var(--ok)" : "var(--danger)" }}>{t.activo ? "Activa" : "Suspendida"}</span>
              </div>
            ))}

          {tab === "productos" &&
            arbol.productos.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface-2)", overflow: "hidden", flexShrink: 0 }}>{p.imagen && <img src={p.imagen} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nombre}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{p.tienda_nombre}</div>
                </div>
                <span className="tabular" style={{ fontSize: 12, fontWeight: 700 }}>{money(p.precio)}</span>
              </div>
            ))}

          {tab === "reels" &&
            arbol.reels.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface-2)", overflow: "hidden", flexShrink: 0 }}>{r.imagen && <img src={r.imagen} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{r.nombre}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{r.tienda_nombre}</div>
                </div>
                {r.reportes > 0 && (
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: "var(--danger)", background: "var(--danger-bg)", padding: "3px 8px", borderRadius: "var(--radius-pill)" }}>{r.reportes} reportes</span>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
