import { useEffect, useState } from "react";
import { MagnifyingGlass, Prohibit } from "@phosphor-icons/react";
import { adminApi, ApiError } from "../../lib/api";
import type { Rol, Usuario } from "../../lib/types";
import { formatDate } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { Avatar } from "../../components/ui/Avatar";
import { Skeleton } from "../../components/ui/Skeleton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

const ROLES: (Rol | "")[] = ["", "comprador", "vendedor", "repartidor", "admin"];

export function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [rol, setRol] = useState<Rol | "">("");
  const [baneando, setBaneando] = useState<Usuario | null>(null);
  const toast = useToast();
  const limit = 15;

  const cargar = () => {
    adminApi.usuarios({ page, limit, q: q || undefined, rol: rol || undefined }).then((r) => {
      setUsuarios(r.usuarios);
      setTotal(r.total);
    });
  };

  useEffect(cargar, [page, rol]);

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    cargar();
  };

  const banear = async () => {
    if (!baneando) return;
    try {
      const r = await adminApi.banearUsuario(baneando.id);
      toast.show(r.activo ? "Usuario reactivado" : "Usuario suspendido", "success");
      setBaneando(null);
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
    }
  };

  const cambiarRol = async (u: Usuario, nuevoRol: Rol) => {
    try {
      await adminApi.actualizarUsuario({ usuario_id: u.id, rol: nuevoRol });
      toast.show("Rol actualizado", "success");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo cambiar el rol.", "error");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h1 style={{ fontSize: 20 }}>Usuarios</h1>

      <div style={{ display: "flex", gap: 10 }}>
        <form onSubmit={buscar} style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <MagnifyingGlass size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o correo" style={{ width: "100%", height: 38, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: "0 12px 0 34px", fontSize: 13 }} />
        </form>
        <select value={rol} onChange={(e) => setRol(e.target.value as Rol | "")} style={{ height: 38, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: "0 10px", fontSize: 13, background: "var(--surface-1)" }}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r || "Todos los roles"}
            </option>
          ))}
        </select>
      </div>

      {usuarios === null ? (
        <Skeleton height={300} />
      ) : (
        <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--surface-2)", textAlign: "left" }}>
                <Th>Usuario</Th>
                <Th>Rol</Th>
                <Th>Estado</Th>
                <Th>Desde</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar nombre={u.nombre} foto={u.foto_perfil} size={28} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.nombre}</div>
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{u.email ?? u.telefono}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <select value={u.rol} onChange={(e) => cambiarRol(u, e.target.value as Rol)} style={{ fontSize: 12, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "4px 8px", background: "var(--surface-1)", textTransform: "capitalize" }}>
                      {(["comprador", "vendedor", "repartidor", "admin"] as Rol[]).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: u.activo ? "var(--ok)" : "var(--danger)" }}>{u.activo ? "Activo" : "Suspendido"}</span>
                  </td>
                  <td className="tabular" style={{ padding: "10px 14px", color: "var(--text-muted)" }}>
                    {u.created_at ? formatDate(u.created_at) : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    <button onClick={() => setBaneando(u)} aria-label="Suspender usuario" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", display: "flex" }}>
                      <Prohibit size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", border: `1px solid ${page === i + 1 ? "var(--cyan)" : "var(--border)"}`, background: page === i + 1 ? "var(--cyan-bg)" : "var(--surface-1)", color: page === i + 1 ? "var(--cyan)" : "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!baneando}
        title={baneando?.activo ? "¿Suspender usuario?" : "¿Reactivar usuario?"}
        description={baneando?.activo ? "El usuario no podrá acceder a la plataforma hasta que lo reactives." : "El usuario recuperará acceso normal."}
        danger={!!baneando?.activo}
        confirmLabel={baneando?.activo ? "Suspender" : "Reactivar"}
        onCancel={() => setBaneando(null)}
        onConfirm={banear}
      />
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{children}</th>;
}
