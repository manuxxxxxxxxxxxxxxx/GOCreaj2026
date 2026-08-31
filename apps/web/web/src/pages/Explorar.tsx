import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Compass, CrosshairSimple, ListBullets, MagnifyingGlass, MapPin, MapTrifold, Star, Storefront, X } from "@phosphor-icons/react";
import { productosApi } from "../lib/api";
import type { Municipio, Producto, Tienda } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { MapView, type MapMarker } from "../components/ui/MapView";
import { CATEGORIAS, CATEGORIA_LABEL, categoriaColor, categoriaIcon } from "../lib/categoryIcons";

interface StorePin {
  id: number;
  nombre: string;
  municipio?: string | null;
  lat: number;
  lng: number;
  categoria?: string | null;
  logo?: string | null;
  portada?: string | null;
  calificacion?: number;
  totalResenas?: number;
  distanciaKm?: number;
}

const GEO_VALUE = "__geo__";
const SEARCH_DEBOUNCE_MS = 380;

export function Explorar() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const categoria = params.get("categoria") ?? "";
  const departamento = params.get("departamento") ?? "";
  const [inputQ, setInputQ] = useState(q);

  const [municipios, setMunicipios] = useState<Municipio[] | null>(null);
  const [municipio, setMunicipio] = useState<string | null>(usuario?.municipio ?? null);
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [usandoUbicacion, setUsandoUbicacion] = useState(false);
  const [localizando, setLocalizando] = useState(false);

  const [tiendas, setTiendas] = useState<StorePin[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [seleccionadaId, setSeleccionadaId] = useState<number | null>(null);
  const [vista, setVista] = useState<"mapa" | "lista">("mapa");

  useEffect(() => setInputQ(q), [q]);

  // Búsqueda en vivo: cada tecleo actualiza la URL (y por lo tanto los resultados) tras
  // una pausa corta, sin esperar a que el usuario presione Enter o un botón de buscar.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (inputQ.trim()) next.set("q", inputQ.trim());
      else next.delete("q");
      if (next.toString() !== params.toString()) setParams(next, { replace: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputQ]);

  useEffect(() => {
    productosApi
      .municipiosCatalogo()
      .then((r) => {
        setMunicipios(r.municipios);
        if (!municipio && !usuario?.municipio) {
          const preferido = r.municipios.find((m) => m.nombre === "San Salvador") ?? r.municipios[0];
          if (preferido) setMunicipio(preferido.nombre);
        }
      })
      .catch(() => setMunicipios([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCargando(true);
    const catFiltro = categoria || undefined;

    const aStorePins = (list: Tienda[]): StorePin[] =>
      list
        .filter((t) => t.lat && t.lng)
        .map((t) => ({
          id: t.id,
          nombre: t.nombre,
          municipio: t.municipio,
          lat: Number(t.lat),
          lng: Number(t.lng),
          categoria: t.categoria,
          logo: t.logo,
          portada: t.portada,
          calificacion: t.calificacion_promedio ? Number(t.calificacion_promedio) : undefined,
          totalResenas: t.total_resenas ? Number(t.total_resenas) : undefined,
        }));

    const aStorePinsDesdeProductos = (list: Producto[]): StorePin[] => {
      const vistas = new Map<number, StorePin>();
      for (const p of list) {
        if (!p.tienda_id || !p.tienda_lat || !p.tienda_lng || vistas.has(p.tienda_id)) continue;
        vistas.set(p.tienda_id, {
          id: p.tienda_id,
          nombre: p.tienda_nombre ?? "Tienda",
          municipio: p.municipio,
          lat: Number(p.tienda_lat),
          lng: Number(p.tienda_lng),
          categoria: p.categoria,
          logo: p.tienda_logo ?? undefined,
          calificacion: p.tienda_calificacion ? Number(p.tienda_calificacion) : undefined,
          totalResenas: p.tienda_total_resenas,
        });
      }
      return Array.from(vistas.values());
    };

    let req: Promise<StorePin[]>;
    if (q.trim()) {
      req = productosApi
        .buscar({
          q,
          municipio: departamento || usandoUbicacion ? undefined : municipio || undefined,
          departamento: departamento || undefined,
          categoria: catFiltro,
          limit: 60,
        })
        .then((r) => aStorePinsDesdeProductos(r.productos));
    } else if (departamento) {
      req = productosApi.nuevasTiendas({ departamento, limit: 60 }).then((r) => aStorePins(catFiltro ? r.tiendas.filter((t) => t.categoria?.toLowerCase() === catFiltro) : r.tiendas));
    } else if (usandoUbicacion && ubicacion) {
      req = productosApi.cercanos({ lat: ubicacion.lat, lng: ubicacion.lng, categoria: catFiltro, limit: 40 }).then((r) => {
        const distancias = new Map(r.tiendas.map((t) => [t.id, Number(t.distancia_km)]));
        return aStorePins(r.tiendas).map((t) => ({ ...t, distanciaKm: distancias.get(t.id) }));
      });
    } else {
      req = productosApi.nuevasTiendas({ municipio: municipio || undefined, limit: 40 }).then((r) => aStorePins(catFiltro ? r.tiendas.filter((t) => t.categoria?.toLowerCase() === catFiltro) : r.tiendas));
    }

    req.then(setTiendas).catch(() => setTiendas([])).finally(() => setCargando(false));
  }, [q, categoria, municipio, usandoUbicacion, ubicacion, departamento]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (inputQ.trim()) next.set("q", inputQ.trim());
    else next.delete("q");
    setParams(next);
  };

  const toggleCategoria = (cat: string) => {
    const next = new URLSearchParams(params);
    if (categoria === cat) next.delete("categoria");
    else next.set("categoria", cat);
    setParams(next);
  };

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      toast.show("Tu navegador no soporta geolocalización.", "error");
      return;
    }
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUsandoUbicacion(true);
        setLocalizando(false);
      },
      () => {
        toast.show("No se pudo obtener tu ubicación.", "error");
        setLocalizando(false);
      },
    );
  };

  const onZonaChange = (value: string) => {
    quitarDepartamento();
    if (value === GEO_VALUE) {
      usarMiUbicacion();
      return;
    }
    setUsandoUbicacion(false);
    setMunicipio(value);
  };

  const quitarDepartamento = () => {
    if (!params.has("departamento")) return;
    const next = new URLSearchParams(params);
    next.delete("departamento");
    setParams(next);
  };

  const municipiosPorDepto = useMemo(() => {
    if (!municipios) return [];
    const grupos = new Map<string, Municipio[]>();
    for (const m of municipios) {
      if (!grupos.has(m.departamento)) grupos.set(m.departamento, []);
      grupos.get(m.departamento)!.push(m);
    }
    return Array.from(grupos.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [municipios]);

  const markers: MapMarker[] = useMemo(
    () =>
      (tiendas ?? []).map((t) => ({
        id: t.id,
        lat: t.lat,
        lng: t.lng,
        color: seleccionadaId === t.id ? "var(--ok)" : "var(--warn)",
        label: t.nombre,
        photo: t.logo,
        banner: t.portada,
        subtitle: t.municipio ?? undefined,
        rating: t.calificacion ?? undefined,
        ratingCount: t.totalResenas,
        actionLabel: "Ver tienda",
        onClick: () => navigate(`/tienda/${t.id}`),
      })),
    [tiendas, seleccionadaId, navigate],
  );

  const segBtnStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 12px",
    borderRadius: "var(--radius-pill)",
    border: "none",
    background: active ? "var(--cyan-bg)" : "transparent",
    color: active ? "var(--cyan)" : "var(--text-secondary)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out)",
  });

  return (
    <div style={{ position: "fixed", top: 68, left: 0, right: 0, bottom: 0, display: "flex", overflow: "hidden" }}>
      <div
        style={{
          width: vista === "mapa" ? 420 : "100%",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: vista === "mapa" ? "1px solid var(--border)" : "none",
          background: "var(--bg-page)",
        }}
      >
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", background: "var(--cyan-bg)", color: "var(--cyan)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Compass size={16} weight="bold" />
              </div>
              <div>
                <h1 style={{ fontSize: 19, marginBottom: 2 }}>Explorar</h1>
                <p style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>Busca por producto, tienda o categoría.</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2, padding: 3, borderRadius: "var(--radius-pill)", background: "var(--surface-1)", border: "1px solid var(--border)", flexShrink: 0 }}>
              <button type="button" onClick={() => setVista("mapa")} style={segBtnStyle(vista === "mapa")}>
                <MapTrifold size={13} weight="bold" />
                Mapa
              </button>
              <button type="button" onClick={() => setVista("lista")} style={segBtnStyle(vista === "lista")}>
                <ListBullets size={13} weight="bold" />
                Lista
              </button>
            </div>
          </div>

          <form onSubmit={submit} style={{ position: "relative", marginTop: 14, marginBottom: 10 }}>
            <MagnifyingGlass size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              value={inputQ}
              onChange={(e) => setInputQ(e.target.value)}
              placeholder="Pizza, frutería, tacos…"
              aria-label="Buscar productos o tiendas"
              style={{
                width: "100%",
                height: 44,
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--surface-1)",
                padding: `0 ${inputQ ? 36 : 14}px 0 36px`,
                fontSize: 13.5,
                transition: "border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)",
              }}
              className="es-search-input"
            />
            {inputQ && (
              <button
                type="button"
                onClick={() => setInputQ("")}
                aria-label="Limpiar búsqueda"
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  border: "none",
                  background: "var(--surface-2)",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={12} weight="bold" />
              </button>
            )}
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <MapPin size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <select
              value={usandoUbicacion ? GEO_VALUE : municipio ?? ""}
              onChange={(e) => onZonaChange(e.target.value)}
              style={{ flex: 1, height: 38, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface-1)", color: "var(--text-primary)", padding: "0 10px", fontSize: 12.5 }}
            >
              <option value={GEO_VALUE}>📍 Mi ubicación actual</option>
              {municipiosPorDepto.map(([depto, ms]) => (
                <optgroup key={depto} label={depto}>
                  {ms.map((m) => (
                    <option key={m.id} value={m.nombre} disabled={m.cobertura_activa === 0}>
                      {m.nombre}
                      {m.cobertura_activa === 0 ? " (próximamente)" : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {localizando && <CrosshairSimple size={16} color="var(--cyan)" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />}
          </div>

          {departamento && (
            <button
              type="button"
              onClick={quitarDepartamento}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                alignSelf: "flex-start",
                marginBottom: 10,
                padding: "6px 10px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--cyan)",
                background: "var(--cyan-bg)",
                color: "var(--cyan)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <MapPin size={13} weight="fill" />
              {departamento}
              <X size={12} weight="bold" />
            </button>
          )}

          <div className="explorar-cat-rail" style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", paddingBottom: 2, marginInline: -2, paddingInline: 2 }}>
            {CATEGORIAS.map((cat) => {
              const active = categoria === cat;
              const color = categoriaColor(cat);
              const Icon = categoriaIcon(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategoria(cat)}
                  className="es-cat-chip"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    flexShrink: 0,
                    padding: "6px 10px",
                    borderRadius: "var(--radius-pill)",
                    border: `1px solid ${active ? color : "var(--border)"}`,
                    background: active ? `color-mix(in srgb, ${color} 16%, var(--surface-1))` : "var(--surface-1)",
                    color: active ? color : "var(--text-secondary)",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon size={13} weight={active ? "fill" : "regular"} />
                  {CATEGORIA_LABEL[cat]}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 0" }}>
          <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>
            {cargando || tiendas === null ? "Buscando…" : `${tiendas.length} ${tiendas.length === 1 ? "resultado" : "resultados"}`}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: vista === "mapa" ? "10px 14px 14px" : "10px 24px 24px" }}>
          {cargando || tiendas === null ? (
            vista === "mapa" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} height={92} radius="var(--radius-md)" />
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} height={240} radius="var(--radius-md)" />
                ))}
              </div>
            )
          ) : tiendas.length === 0 ? (
            <EmptyState icon={<Storefront size={24} />} title="Sin tiendas por aquí" description="Prueba otra zona, categoría o búsqueda." />
          ) : vista === "mapa" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tiendas.map((t, i) => (
                <TiendaRow key={t.id} tienda={t} index={i} activa={seleccionadaId === t.id} onHover={() => setSeleccionadaId(t.id)} onClick={() => navigate(`/tienda/${t.id}`)} />
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
              {tiendas.map((t, i) => (
                <TiendaCard key={t.id} tienda={t} index={i} onClick={() => navigate(`/tienda/${t.id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {vista === "mapa" && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <MapView markers={markers} height="100%" radius="0" fitToMarkers zoom={13} layersControl />
        </div>
      )}
    </div>
  );
}

function RatingPill({ calificacion, totalResenas }: { calificacion?: number; totalResenas?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        padding: "3px 7px",
        borderRadius: "var(--radius-pill)",
        background: "rgba(8,11,20,0.6)",
        backdropFilter: "blur(6px)",
      }}
    >
      <Star size={10.5} weight="fill" color="#ffb648" />
      <span className="tabular" style={{ fontSize: 10.5, fontWeight: 700, color: "#fff" }}>
        {calificacion ? calificacion.toFixed(1) : "Nuevo"}
      </span>
      {totalResenas ? <span style={{ fontSize: 10, color: "rgba(255,255,255,0.75)" }}>({totalResenas})</span> : null}
    </div>
  );
}

function CategoriaBadge({ categoria }: { categoria?: string | null }) {
  const color = categoriaColor(categoria ?? undefined);
  const Icon = categoriaIcon(categoria ?? undefined);
  return (
    <div style={{ width: 24, height: 24, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.35)" }}>
      <Icon size={12} weight="fill" color="#fff" />
    </div>
  );
}

function TiendaRow({ tienda, index, activa, onHover, onClick }: { tienda: StorePin; index: number; activa: boolean; onHover: () => void; onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={onHover}
      onKeyDown={(e) => (e.key === "Enter" ? onClick() : undefined)}
      className="product-card"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: 10,
        borderRadius: "var(--radius-md)",
        border: `1px solid ${activa ? "var(--cyan)" : "var(--border)"}`,
        background: activa ? "var(--cyan-bg)" : "var(--surface-1)",
        cursor: "pointer",
        animation: `rise var(--dur-slow) var(--ease-out) both`,
        animationDelay: `${Math.min(index, 10) * 45}ms`,
      }}
    >
      <div style={{ width: 64, height: 64, borderRadius: "var(--radius-sm)", background: "var(--surface-2)", overflow: "hidden", flexShrink: 0, position: "relative" }}>
        {tienda.portada ? <img src={tienda.portada} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Storefront size={20} color="var(--text-muted)" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />}
        {tienda.logo && (
          <img src={tienda.logo} alt="" loading="lazy" decoding="async" style={{ position: "absolute", left: 4, bottom: 4, width: 22, height: 22, borderRadius: 7, objectFit: "cover", border: "2px solid var(--surface-1)" }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tienda.nombre}</div>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
          {tienda.municipio}
          {tienda.distanciaKm !== undefined ? ` · ${tienda.distanciaKm.toFixed(1)} km` : ""}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700 }}>
          <Star size={12} weight="fill" color="var(--warn)" />
          <span className="tabular">{tienda.calificacion ? tienda.calificacion.toFixed(1) : "Nuevo"}</span>
          {tienda.totalResenas ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({tienda.totalResenas})</span> : null}
        </div>
      </div>
      {tienda.categoria && <CategoriaBadge categoria={tienda.categoria} />}
    </div>
  );
}

function TiendaCard({ tienda, index, onClick }: { tienda: StorePin; index: number; onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" ? onClick() : undefined)}
      className="product-card"
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--surface-1)",
        overflow: "hidden",
        cursor: "pointer",
        animation: `rise var(--dur-slow) var(--ease-out) both`,
        animationDelay: `${Math.min(index, 12) * 55}ms`,
      }}
    >
      <div style={{ aspectRatio: "4 / 3", background: "var(--surface-2)", position: "relative" }}>
        {tienda.portada ? (
          <img src={tienda.portada} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Storefront size={26} color="var(--text-muted)" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.35) 100%)" }} />
        <div style={{ position: "absolute", top: 8, left: 8 }}>{tienda.categoria && <CategoriaBadge categoria={tienda.categoria} />}</div>
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          <RatingPill calificacion={tienda.calificacion} totalResenas={tienda.totalResenas} />
        </div>
        {tienda.logo && (
          <img
            src={tienda.logo}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ position: "absolute", left: 10, bottom: -14, width: 40, height: 40, borderRadius: 12, objectFit: "cover", border: "2px solid var(--surface-1)" }}
          />
        )}
      </div>
      <div style={{ padding: "22px 12px 12px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tienda.nombre}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {tienda.municipio}
          {tienda.distanciaKm !== undefined ? ` · ${tienda.distanciaKm.toFixed(1)} km` : ""}
        </div>
      </div>
    </div>
  );
}
