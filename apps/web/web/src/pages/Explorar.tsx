import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CaretDown, CaretLeft, Compass, CrosshairSimple, Globe, ListBullets, MagnifyingGlass, MapPin, MapTrifold, SquaresFour, Star, Storefront, X } from "@phosphor-icons/react";
import { productosApi } from "../lib/api";
import type { Municipio, Producto, Tienda } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { MapView, type MapMarker } from "../components/ui/MapView";
import { CATEGORIA_GRUPOS, CATEGORIA_LABEL, type Categoria, type CategoriaGrupo, categoriaColor, categoriaEmoji, categoriaIcon } from "../lib/categoryIcons";

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
  horaApertura?: string | null;
  horaCierre?: string | null;
}

const SEARCH_DEBOUNCE_MS = 380;

/** null cuando la tienda no publicó horario -- no mostramos un estado inventado. */
function estaAbierta(apertura?: string | null, cierre?: string | null): boolean | null {
  if (!apertura || !cierre) return null;
  const toMinutos = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const ahora = new Date();
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();
  const apeMin = toMinutos(apertura);
  const cieMin = toMinutos(cierre);
  if (cieMin <= apeMin) return minutos >= apeMin || minutos < cieMin; // cruza medianoche
  return minutos >= apeMin && minutos < cieMin;
}

export function Explorar() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const categoria = params.get("categoria") ?? "";
  const grupo = params.get("grupo") ?? "";
  const departamento = params.get("departamento") ?? "";
  const [inputQ, setInputQ] = useState(q);

  const [municipios, setMunicipios] = useState<Municipio[] | null>(null);
  // null = "todas las tiendas" (sin acotar por municipio), a menos que el usuario tenga
  // una zona guardada en su perfil, que se respeta como preferencia inicial.
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
      .then((r) => setMunicipios(r.municipios))
      .catch(() => setMunicipios([]));
  }, []);

  useEffect(() => {
    setCargando(true);
    const catFiltro = categoria || undefined;
    const grupoActivo = !catFiltro && grupo ? CATEGORIA_GRUPOS.find((g) => g.id === grupo) : undefined;

    const cumpleFiltro = (cat?: string | null): boolean => {
      if (catFiltro) return (cat ?? "").toLowerCase() === catFiltro;
      if (grupoActivo) return grupoActivo.categorias.includes((cat ?? "general").toLowerCase() as Categoria);
      return true;
    };

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
          horaApertura: t.hora_apertura,
          horaCierre: t.hora_cierre,
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
        .then((r) => aStorePinsDesdeProductos(grupoActivo ? r.productos.filter((p) => cumpleFiltro(p.categoria)) : r.productos));
    } else if (departamento) {
      req = productosApi.nuevasTiendas({ departamento, limit: 60 }).then((r) => aStorePins(r.tiendas.filter((t) => cumpleFiltro(t.categoria))));
    } else if (usandoUbicacion && ubicacion) {
      req = productosApi.cercanos({ lat: ubicacion.lat, lng: ubicacion.lng, categoria: catFiltro, limit: 40 }).then((r) => {
        const distancias = new Map(r.tiendas.map((t) => [t.id, Number(t.distancia_km)]));
        const filtradas = grupoActivo ? r.tiendas.filter((t) => cumpleFiltro(t.categoria)) : r.tiendas;
        return aStorePins(filtradas).map((t) => ({ ...t, distanciaKm: distancias.get(t.id) }));
      });
    } else {
      req = productosApi.nuevasTiendas({ municipio: municipio || undefined, limit: 40 }).then((r) => aStorePins(r.tiendas.filter((t) => cumpleFiltro(t.categoria))));
    }

    req.then(setTiendas).catch(() => setTiendas([])).finally(() => setCargando(false));
  }, [q, categoria, grupo, municipio, usandoUbicacion, ubicacion, departamento]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (inputQ.trim()) next.set("q", inputQ.trim());
    else next.delete("q");
    setParams(next);
  };

  const elegirTodasCategorias = () => {
    const next = new URLSearchParams(params);
    next.delete("grupo");
    next.delete("categoria");
    setParams(next);
  };

  const elegirTodoGrupo = (g: CategoriaGrupo) => {
    const next = new URLSearchParams(params);
    next.set("grupo", g.id);
    next.delete("categoria");
    setParams(next);
  };

  const elegirCategoriaHija = (cat: Categoria, grupoId: string) => {
    const next = new URLSearchParams(params);
    next.set("categoria", cat);
    next.set("grupo", grupoId);
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

  const elegirTodas = () => {
    quitarDepartamento();
    setUsandoUbicacion(false);
    setMunicipio(null);
  };

  const elegirGeo = () => {
    quitarDepartamento();
    usarMiUbicacion();
  };

  const elegirMunicipio = (nombre: string) => {
    quitarDepartamento();
    setUsandoUbicacion(false);
    setMunicipio(nombre);
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
      (tiendas ?? []).map((t) => {
        const abierta = estaAbierta(t.horaApertura, t.horaCierre);
        return {
          id: t.id,
          lat: t.lat,
          lng: t.lng,
          color: categoriaColor(t.categoria ?? undefined),
          emoji: categoriaEmoji(t.categoria ?? undefined),
          active: seleccionadaId === t.id,
          label: t.nombre,
          banner: t.portada,
          subtitle: t.municipio ?? undefined,
          rating: t.calificacion ?? undefined,
          ratingCount: t.totalResenas,
          estado: abierta === null ? null : abierta ? ("abierto" as const) : ("cerrado" as const),
          actionLabel: "Ver tienda",
          onClick: () => navigate(`/tienda/${t.id}`),
        };
      }),
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

  let zonaLabel = "Todas las tiendas";
  let zonaActiva: "todas" | "geo" | "municipio" = "todas";
  if (usandoUbicacion) {
    zonaLabel = "Mi ubicación actual";
    zonaActiva = "geo";
  } else if (municipio) {
    zonaLabel = municipio;
    zonaActiva = "municipio";
  }

  return (
    <div style={{ position: "fixed", top: 68, left: 0, right: 0, bottom: 0, display: "flex", overflow: "hidden" }}>
      <div
        style={{
          width: 420,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--border)",
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

          <div style={{ marginBottom: 10 }}>
            <ZonaPicker
              municipiosPorDepto={municipiosPorDepto}
              label={zonaLabel}
              activa={zonaActiva}
              municipioActivo={municipio}
              onTodas={elegirTodas}
              onGeo={elegirGeo}
              onMunicipio={elegirMunicipio}
              localizando={localizando}
            />
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

          <CategoriaPicker categoria={categoria} grupo={grupo} onTodas={elegirTodasCategorias} onTodoGrupo={elegirTodoGrupo} onHijo={elegirCategoriaHija} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 0" }}>
          <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>
            {cargando || tiendas === null ? "Buscando…" : `${tiendas.length} ${tiendas.length === 1 ? "resultado" : "resultados"}`}
          </span>
        </div>

        {vista === "mapa" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px 14px" }}>
            {cargando || tiendas === null ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} height={92} radius="var(--radius-md)" />
                ))}
              </div>
            ) : tiendas.length === 0 ? (
              <EmptyState icon={<Storefront size={24} />} title="Sin tiendas por aquí" description="Prueba otra zona, categoría o búsqueda." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {tiendas.map((t, i) => (
                  <TiendaRow key={t.id} tienda={t} index={i} activa={seleccionadaId === t.id} onHover={() => setSeleccionadaId(t.id)} onClick={() => navigate(`/tienda/${t.id}`)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {vista === "mapa" ? (
          <MapView markers={markers} height="100%" radius="0" fitToMarkers zoom={13} layersControl />
        ) : (
          <div style={{ height: "100%", overflowY: "auto", padding: 24 }}>
            {cargando || tiendas === null ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} height={240} radius="var(--radius-md)" />
                ))}
              </div>
            ) : tiendas.length === 0 ? (
              <EmptyState icon={<Storefront size={24} />} title="Sin tiendas por aquí" description="Prueba otra zona, categoría o búsqueda." />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
                {tiendas.map((t, i) => (
                  <TiendaCard key={t.id} tienda={t} index={i} onClick={() => navigate(`/tienda/${t.id}`)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
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

function ZonaPicker({
  municipiosPorDepto,
  label,
  activa,
  municipioActivo,
  onTodas,
  onGeo,
  onMunicipio,
  localizando,
}: {
  municipiosPorDepto: [string, Municipio[]][];
  label: string;
  activa: "todas" | "geo" | "municipio";
  municipioActivo: string | null;
  onTodas: () => void;
  onGeo: () => void;
  onMunicipio: (nombre: string) => void;
  localizando: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const onClickFuera = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setAbierto(false);
        setBusqueda("");
      }
    };
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, [abierto]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return municipiosPorDepto;
    return municipiosPorDepto
      .map(([depto, ms]) => [depto, ms.filter((m) => m.nombre.toLowerCase().includes(q))] as [string, Municipio[]])
      .filter(([, ms]) => ms.length > 0);
  }, [municipiosPorDepto, busqueda]);

  const cerrar = () => {
    setAbierto(false);
    setBusqueda("");
  };

  const optionStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    width: "100%",
    textAlign: "left",
    gap: 8,
    padding: "8px 10px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: active ? "var(--cyan-bg)" : "transparent",
    color: active ? "var(--cyan)" : "var(--text-primary)",
    fontSize: 12.5,
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
  });

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          height: 38,
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          background: "var(--surface-1)",
          color: "var(--text-primary)",
          padding: "0 10px",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {activa === "todas" ? <Globe size={14} color="var(--text-muted)" /> : <MapPin size={14} color="var(--cyan)" weight="fill" />}
        <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        {localizando ? <CrosshairSimple size={14} color="var(--cyan)" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} /> : <CaretDown size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
      </button>

      {abierto && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 20,
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
            overflow: "hidden",
            animation: "rise var(--dur-fast) var(--ease-out) both",
          }}
        >
          <div style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>
            <input
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar municipio…"
              aria-label="Buscar municipio"
              style={{ width: "100%", height: 32, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg-page)", color: "var(--text-primary)", padding: "0 10px", fontSize: 12.5 }}
            />
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto", padding: 6 }}>
            <button type="button" onClick={() => (onTodas(), cerrar())} style={optionStyle(activa === "todas")}>
              <Globe size={15} weight={activa === "todas" ? "fill" : "regular"} />
              Todas las tiendas
            </button>
            <button type="button" onClick={() => (onGeo(), cerrar())} style={optionStyle(activa === "geo")}>
              <CrosshairSimple size={15} weight={activa === "geo" ? "fill" : "regular"} />
              Mi ubicación actual
            </button>
            {filtrados.map(([depto, ms]) => (
              <div key={depto}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, padding: "10px 10px 4px" }}>{depto}</div>
                {ms.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={m.cobertura_activa === 0}
                    onClick={() => (onMunicipio(m.nombre), cerrar())}
                    style={{ ...optionStyle(activa === "municipio" && municipioActivo === m.nombre), opacity: m.cobertura_activa === 0 ? 0.45 : 1, cursor: m.cobertura_activa === 0 ? "not-allowed" : "pointer" }}
                  >
                    {m.nombre}
                    {m.cobertura_activa === 0 ? " (próximamente)" : ""}
                  </button>
                ))}
              </div>
            ))}
            {filtrados.length === 0 && <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>Sin resultados</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoriaPicker({
  categoria,
  grupo,
  onTodas,
  onTodoGrupo,
  onHijo,
}: {
  categoria: string;
  grupo: string;
  onTodas: () => void;
  onTodoGrupo: (g: CategoriaGrupo) => void;
  onHijo: (cat: Categoria, grupoId: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [verGrupo, setVerGrupo] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const onClickFuera = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) cerrar();
    };
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const abrir = () => {
    setVerGrupo(grupo || null);
    setBusqueda("");
    setAbierto((v) => !v);
  };

  const cerrar = () => {
    setAbierto(false);
    setBusqueda("");
  };

  const grupoActual = grupo ? CATEGORIA_GRUPOS.find((g) => g.id === grupo) : undefined;
  const label = categoria ? CATEGORIA_LABEL[categoria as Categoria] : grupoActual ? `Todo ${grupoActual.label}` : "Todas las categorías";
  const emoji = categoria ? categoriaEmoji(categoria) : grupoActual ? grupoActual.emoji : null;
  const activo = !!(categoria || grupo);
  const grupoVisto = verGrupo ? CATEGORIA_GRUPOS.find((g) => g.id === verGrupo) : undefined;

  const resultadosBusqueda = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    const out: { cat: Categoria; grupo: CategoriaGrupo }[] = [];
    for (const g of CATEGORIA_GRUPOS) {
      for (const c of g.categorias) {
        if (CATEGORIA_LABEL[c].toLowerCase().includes(q)) out.push({ cat: c, grupo: g });
      }
    }
    return out;
  }, [busqueda]);

  const optionStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    width: "100%",
    textAlign: "left",
    gap: 8,
    padding: "8px 10px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: active ? "var(--cyan-bg)" : "transparent",
    color: active ? "var(--cyan)" : "var(--text-primary)",
    fontSize: 12.5,
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
  });

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={abrir}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          height: 38,
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${activo ? "var(--cyan)" : "var(--border)"}`,
          background: "var(--surface-1)",
          color: activo ? "var(--cyan)" : "var(--text-primary)",
          padding: "0 10px",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {emoji ? <span style={{ fontSize: 15, lineHeight: 1 }}>{emoji}</span> : <SquaresFour size={15} weight={activo ? "fill" : "regular"} />}
        <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <CaretDown size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      </button>

      {abierto && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: 320,
            zIndex: 20,
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
            overflow: "hidden",
            animation: "rise var(--dur-fast) var(--ease-out) both",
          }}
        >
          <div style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>
            <input
              autoFocus
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setVerGrupo(null);
              }}
              placeholder="Buscar categoría…"
              aria-label="Buscar categoría"
              style={{ width: "100%", height: 32, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg-page)", color: "var(--text-primary)", padding: "0 10px", fontSize: 12.5 }}
            />
          </div>

          <div style={{ maxHeight: 360, overflowY: "auto", padding: 10 }}>
            {busqueda ? (
              resultadosBusqueda.length === 0 ? (
                <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>Sin resultados</div>
              ) : (
                resultadosBusqueda.map(({ cat, grupo: g }) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      onHijo(cat, g.id);
                      cerrar();
                    }}
                    style={optionStyle(categoria === cat)}
                  >
                    <span style={{ fontSize: 16 }}>{categoriaEmoji(cat)}</span>
                    {CATEGORIA_LABEL[cat]}
                  </button>
                ))
              )
            ) : grupoVisto ? (
              <div>
                <button type="button" onClick={() => setVerGrupo(null)} style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: "none", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "4px 6px 10px" }}>
                  <CaretLeft size={12} /> Todas las categorías
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTodoGrupo(grupoVisto);
                    cerrar();
                  }}
                  style={optionStyle(grupo === grupoVisto.id && !categoria)}
                >
                  <span style={{ fontSize: 16 }}>{grupoVisto.emoji}</span>
                  Todo {grupoVisto.label}
                </button>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {grupoVisto.categorias
                    .filter((c) => c !== grupoVisto.id)
                    .map((c) => {
                      const active = categoria === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            onHijo(c, grupoVisto.id);
                            cerrar();
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "6px 10px",
                            borderRadius: "var(--radius-pill)",
                            border: `1px solid ${active ? "var(--cyan)" : "var(--border)"}`,
                            background: active ? "var(--cyan-bg)" : "var(--surface-2)",
                            color: active ? "var(--cyan)" : "var(--text-secondary)",
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span style={{ fontSize: 13 }}>{categoriaEmoji(c)}</span>
                          {CATEGORIA_LABEL[c]}
                        </button>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    onTodas();
                    cerrar();
                  }}
                  style={optionStyle(!categoria && !grupo)}
                >
                  <SquaresFour size={15} weight={!categoria && !grupo ? "fill" : "regular"} />
                  Todas las categorías
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
                  {CATEGORIA_GRUPOS.map((g) => {
                    const active = grupo === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setVerGrupo(g.id)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          aspectRatio: "1",
                          borderRadius: "var(--radius-md)",
                          border: `1px solid ${active ? "var(--cyan)" : "var(--border)"}`,
                          background: active ? "var(--cyan-bg)" : "var(--surface-2)",
                          padding: 6,
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontSize: 24, lineHeight: 1 }}>{g.emoji}</span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, textAlign: "center", color: active ? "var(--cyan)" : "var(--text-secondary)" }}>{g.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
