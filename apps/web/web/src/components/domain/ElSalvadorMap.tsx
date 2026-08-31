import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Storefront } from "@phosphor-icons/react";
import { EL_SALVADOR_DEPARTAMENTOS, EL_SALVADOR_OUTLINE_D, EL_SALVADOR_VIEWBOX } from "../../lib/elSalvadorGeo";
import { useTheme } from "../../context/ThemeContext";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { ProductCard } from "./ProductCard";
import { ZonaSelector } from "./ZonaSelector";
import type { Producto } from "../../lib/types";

const MAP_W = 1080;
const MAP_H = 600;

/** Mezcla lineal entre dos colores hex ("#rrggbb"), t en [0,1]. */
function lerpColor(a: string, b: string, t: number): string {
  const clamp = Math.max(0, Math.min(1, t));
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const mix = pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp));
  return `#${mix.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** PRNG determinístico sembrado por texto: los puntitos de tiendas no saltan en cada render. */
function seededRandoms(seed: string, n: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  let s = h >>> 0 || 1;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    out.push(((t ^ (t >>> 14)) >>> 0) / 4294967296);
  }
  return out;
}

// Resueltos vía JS (no CSS vars) porque se usan en cálculos de mezcla de color.
const SURFACE3: Record<"light" | "dark", string> = { light: "#d5dae6", dark: "#1e2537" };
const CYAN: Record<"light" | "dark", string> = { light: "#0891b2", dark: "#38d6ff" };

interface Props {
  counts: Record<string, number> | null;
  productosZona: Producto[] | null;
  municipio?: string;
  onZonaChange: (municipio: string) => void;
}

export function ElSalvadorMap({ counts, productosZona, municipio, onZonaChange }: Props) {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const scheme: "light" | "dark" = resolvedTheme;
  const [active, setActive] = useState<string | null>(null);

  const maxCount = useMemo(() => {
    if (!counts) return 1;
    return Math.max(1, ...Object.values(counts));
  }, [counts]);

  const activeDept = active ? EL_SALVADOR_DEPARTAMENTOS.find((d) => d.nombre === active) ?? null : null;
  const activeCount = activeDept ? counts?.[activeDept.nombre] ?? 0 : 0;

  const irADepartamento = (nombre: string) => navigate(`/explorar?departamento=${encodeURIComponent(nombre)}`);

  if (counts === null) {
    return <Skeleton height={320} radius="var(--radius-lg)" />;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontSize: 17, marginBottom: 3 }}>Explora El Salvador</h2>
          <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Pasa el cursor sobre un departamento o haz clic para ver sus negocios</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <ZonaSelector value={municipio} onChange={onZonaChange} compact />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: lerpColor(SURFACE3[scheme], CYAN[scheme], 0.15) }} />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>menos</span>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--cyan)" }} />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>más negocios</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 36, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 320px", maxWidth: 420, margin: "0 auto" }}>
          <svg viewBox={EL_SALVADOR_VIEWBOX} style={{ width: "100%", height: "auto", display: "block" }}>
            <path d={EL_SALVADOR_OUTLINE_D} transform="translate(6,9)" fill={isDark ? "#000000" : "#0b1220"} opacity={isDark ? 0.35 : 0.08} />
            <path d={EL_SALVADOR_OUTLINE_D} fill="var(--surface-2)" stroke="var(--border)" strokeWidth={1} />

            {EL_SALVADOR_DEPARTAMENTOS.map((dep) => {
              const count = counts[dep.nombre] ?? 0;
              const isActive = active === dep.nombre;
              const intensity = count / maxCount;
              const fill = isActive ? CYAN[scheme] : lerpColor(SURFACE3[scheme], CYAN[scheme], 0.14 + intensity * 0.6);
              return (
                <path
                  key={dep.nombre}
                  d={dep.d}
                  fill={fill}
                  stroke="var(--bg-page)"
                  strokeWidth={isActive ? 2.5 : 1.5}
                  style={{ cursor: "pointer", transition: "fill 120ms ease" }}
                  onMouseEnter={() => setActive(dep.nombre)}
                  onMouseLeave={() => setActive((cur) => (cur === dep.nombre ? null : cur))}
                  onClick={() => irADepartamento(dep.nombre)}
                >
                  <title>
                    {dep.nombre} · {count} negocio{count === 1 ? "" : "s"}
                  </title>
                </path>
              );
            })}

            {EL_SALVADOR_DEPARTAMENTOS.map((dep) => {
              const count = counts[dep.nombre] ?? 0;
              if (count === 0) return null;
              const n = Math.min(count, 6);
              const rx = seededRandoms(dep.nombre + "x", n);
              const ry = seededRandoms(dep.nombre + "y", n);
              const spread = Math.min(dep.bbox[2] - dep.bbox[0], dep.bbox[3] - dep.bbox[1]) * 0.16;
              return (
                <g key={`dots-${dep.nombre}`} pointerEvents="none">
                  {rx.map((rv, i) => (
                    <circle
                      key={i}
                      cx={dep.cx + (rv - 0.5) * 2 * spread}
                      cy={dep.cy + (ry[i] - 0.5) * 2 * spread}
                      r={3.4}
                      fill="var(--coral)"
                      stroke="var(--bg-page)"
                      strokeWidth={1}
                      opacity={0.92}
                    />
                  ))}
                </g>
              );
            })}

            {EL_SALVADOR_DEPARTAMENTOS.map((dep) => {
              const count = counts[dep.nombre] ?? 0;
              if (count === 0) return null;
              return (
                <g key={`badge-${dep.nombre}`} pointerEvents="none">
                  <circle cx={dep.cx} cy={dep.cy} r={15} fill="var(--surface-1)" stroke="var(--border)" strokeWidth={1.5} />
                  <text x={dep.cx} y={dep.cy + 4.5} textAnchor="middle" fontSize={13} fontFamily="var(--font-mono)" fill="var(--text-primary)">
                    {count}
                  </text>
                </g>
              );
            })}
          </svg>

          {activeDept && (
            <div
              style={{
                position: "absolute",
                pointerEvents: "none",
                left: `clamp(4px, calc(${(activeDept.cx / MAP_W) * 100}% - 90px), calc(100% - 184px))`,
                top: `calc(${(activeDept.cy / MAP_H) * 100}% - 78px)`,
                width: 180,
                background: "var(--surface-1)",
                border: "1.5px solid var(--cyan)",
                borderRadius: "var(--radius-md)",
                padding: 12,
                boxShadow: "var(--shadow-lg)",
                animation: "rise var(--dur-fast) var(--ease-out) both",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <MapPin size={13} weight="fill" color="var(--cyan)" />
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13 }}>{activeDept.nombre}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, color: "var(--text-secondary)" }}>
                <Storefront size={12} />
                <span style={{ fontSize: 11.5 }}>{activeCount === 0 ? "Sin negocios aún" : `${activeCount} negocio${activeCount === 1 ? "" : "s"}`}</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--cyan)", marginTop: 5 }}>Clic para explorar →</div>
            </div>
          )}
        </div>

        <div style={{ flex: "1 1 300px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h3 style={{ fontSize: 13.5 }}>{municipio ? `Destacados en ${municipio}` : "Productos destacados de tu zona"}</h3>
            <Link to="/explorar" style={{ fontSize: 11.5, fontWeight: 700, color: "var(--cyan)" }}>
              Ver todo
            </Link>
          </div>
          {productosZona === null ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={150} radius="var(--radius-md)" />
              ))}
            </div>
          ) : productosZona.length === 0 ? (
            <EmptyState icon={<Storefront size={22} />} title="Aún no hay productos aquí" description="Elige otra zona o vuelve más tarde." />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {productosZona.slice(0, 4).map((p) => (
                <ProductCard key={p.id} producto={p} variant="small" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
