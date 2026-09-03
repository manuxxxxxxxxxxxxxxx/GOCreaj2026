import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CreditCard,
  Crosshair,
  Eye,
  MapPinLine,
  MagnifyingGlass,
  Money,
  PaypalLogo,
  Storefront,
  X,
} from "@phosphor-icons/react";
import { vendedorApi, productosApi, ApiError } from "../../lib/api";
import type { Tienda, Municipio } from "../../lib/types";
import { fileToBase64 } from "../../lib/format";
import { geocodificarInverso, buscarDireccion, type ResultadoBusquedaDireccion } from "../../lib/geocoding";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { Skeleton } from "../../components/ui/Skeleton";
import { MapView } from "../../components/ui/MapView";
import { MultiCategoryPicker } from "../../components/domain/MultiCategoryPicker";
import { CATEGORIA_LABEL, categoriaColor, categoriaIcon, type Categoria } from "../../lib/categoryIcons";

const EL_SALVADOR_CENTER: [number, number] = [-89.2182, 13.6929];
const MAX_NOMBRE_TIENDA = 50;
const MAX_DESCRIPCION_TIENDA = 400;
const SUGERENCIAS_DIRECCION_BASE = ["Colonia Centro", "Barrio El Centro", "Residencial Las Flores", "Zona Rosa", "Reparto San José"];

const METODOS: { key: string; label: string; icon: typeof Money }[] = [
  { key: "efectivo", label: "Efectivo", icon: Money },
  { key: "tarjeta", label: "Tarjeta", icon: CreditCard },
  { key: "paypal", label: "PayPal", icon: PaypalLogo },
];

/** Tarjeta contenedora de sección del formulario -- unifica el look de todo "Mi tienda". */
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "22px 22px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function CharCounter({ current, max }: { current: number; max: number }) {
  const cerca = current >= max * 0.9;
  return (
    <span style={{ fontSize: 11, color: cerca ? "var(--warn-ink)" : "var(--text-muted)", alignSelf: "flex-end" }}>
      {current}/{max}
    </span>
  );
}

export function VendedorTienda() {
  const navigate = useNavigate();
  const toast = useToast();
  const [tienda, setTienda] = useState<Tienda | null | undefined>(undefined);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categorias, setCategorias] = useState<string[]>([]);
  const [telefono, setTelefono] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [direccion, setDireccion] = useState("");
  const [horaApertura, setHoraApertura] = useState("08:00");
  const [horaCierre, setHoraCierre] = useState("20:00");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [portada, setPortada] = useState<string | null>(null);
  const [metodosPago, setMetodosPago] = useState<string[]>(["efectivo"]);
  const [guardando, setGuardando] = useState(false);
  const [ubicando, setUbicando] = useState(false);
  const [busquedaMapa, setBusquedaMapa] = useState("");
  const [resultadosMapa, setResultadosMapa] = useState<ResultadoBusquedaDireccion[] | null>(null);
  const [buscandoMapa, setBuscandoMapa] = useState(false);
  const [municipios, setMunicipios] = useState<Municipio[] | null>(null);

  useEffect(() => {
    vendedorApi.misTiendas().then((r) => {
      const t = r.tiendas[0] ?? null;
      setTienda(t);
      if (t) {
        setNombre(t.nombre);
        setDescripcion(t.descripcion ?? "");
        setCategorias(t.categoria ? t.categoria.split(",").filter(Boolean) : []);
        setTelefono(t.telefono ?? "");
        setMunicipio(t.municipio);
        setDireccion(t.direccion ?? "");
        setHoraApertura(t.hora_apertura ?? "08:00");
        setHoraCierre(t.hora_cierre ?? "20:00");
        setLat(t.lat);
        setLng(t.lng);
        setLogo(t.logo);
        setPortada(t.portada);
        setMetodosPago(t.metodos_pago?.split(",").filter(Boolean) ?? ["efectivo"]);
      }
    });
    productosApi.municipiosCatalogo().then((r) => setMunicipios(r.municipios)).catch(() => setMunicipios([]));
  }, []);

  // Búsqueda de dirección con debounce -- espera a que el usuario pare de teclear antes
  // de golpear Nominatim, para no mandar una consulta por cada letra. Se sesga con el
  // municipio elegido para que las sugerencias caigan dentro de la zona correcta.
  useEffect(() => {
    if (busquedaMapa.trim().length < 3) {
      setResultadosMapa(null);
      return;
    }
    setBuscandoMapa(true);
    const consulta = municipio ? `${busquedaMapa}, ${municipio}, El Salvador` : busquedaMapa;
    const t = setTimeout(() => {
      buscarDireccion(consulta)
        .then(setResultadosMapa)
        .catch(() => setResultadosMapa([]))
        .finally(() => setBuscandoMapa(false));
    }, 500);
    return () => clearTimeout(t);
  }, [busquedaMapa, municipio]);

  // Sugerencias de dirección formateadas en base al municipio elegido -- fallback simple
  // (colonia/barrio genérico + municipio) para cuando el vendedor todavía no ha buscado nada.
  const sugerenciasDireccion = useMemo(() => {
    if (!municipio) return [];
    return SUGERENCIAS_DIRECCION_BASE.map((s) => `${s}, ${municipio}`);
  }, [municipio]);

  const porDepartamento = useMemo(() => {
    if (!municipios) return [];
    const grupos = new Map<string, Municipio[]>();
    for (const m of municipios) {
      if (!grupos.has(m.departamento)) grupos.set(m.departamento, []);
      grupos.get(m.departamento)!.push(m);
    }
    return Array.from(grupos.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [municipios]);

  const aplicarUbicacion = async (coords: { lat: number; lng: number }, datos?: { direccion?: string; municipio?: string }) => {
    setLat(coords.lat);
    setLng(coords.lng);
    if (datos?.direccion || datos?.municipio) {
      if (datos.direccion) setDireccion(datos.direccion);
      if (datos.municipio) setMunicipio(datos.municipio);
      return;
    }
    setUbicando(true);
    try {
      const r = await geocodificarInverso(coords.lat, coords.lng);
      if (r.direccion) setDireccion(r.direccion);
      if (r.municipio) setMunicipio(r.municipio);
    } catch {
      toast.show("No se pudo detectar la calle — puedes escribirla manualmente.", "warning");
    } finally {
      setUbicando(false);
    }
  };

  const elegirResultadoBusqueda = (r: ResultadoBusquedaDireccion) => {
    aplicarUbicacion({ lat: r.lat, lng: r.lng }, { direccion: r.direccion, municipio: r.municipio });
    setBusquedaMapa("");
    setResultadosMapa(null);
  };

  const usarUbicacion = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => aplicarUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast.show("No se pudo obtener tu ubicación.", "error"),
    );
  };

  const toggleMetodo = (m: string) => {
    setMetodosPago((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const guardar = async () => {
    if (!nombre.trim() || !municipio.trim()) return toast.show("Nombre y municipio son obligatorios.", "warning");
    if (nombre.length > MAX_NOMBRE_TIENDA) return toast.show(`El nombre no puede pasar de ${MAX_NOMBRE_TIENDA} caracteres.`, "warning");
    if (descripcion.length > MAX_DESCRIPCION_TIENDA) return toast.show(`La descripción no puede pasar de ${MAX_DESCRIPCION_TIENDA} caracteres.`, "warning");
    if (!tienda && (lat === null || lng === null)) return toast.show("Ubica tu tienda en el mapa o busca la dirección.", "warning");
    const categoria = categorias.join(",");
    setGuardando(true);
    try {
      if (tienda) {
        await vendedorApi.actualizarTienda({
          tienda_id: tienda.id,
          nombre,
          descripcion,
          categoria,
          telefono,
          municipio,
          direccion,
          hora_apertura: horaApertura,
          hora_cierre: horaCierre,
          lat: lat ?? undefined,
          lng: lng ?? undefined,
          logo: logo && logo.startsWith("data:") ? logo : undefined,
          portada: portada && portada.startsWith("data:") ? portada : undefined,
          metodos_pago: metodosPago,
        });
        toast.show("Tienda actualizada", "success");
        const r = await vendedorApi.misTiendas();
        setTienda(r.tiendas[0] ?? null);
      } else {
        await vendedorApi.crearTienda({
          nombre,
          descripcion,
          categoria,
          telefono,
          municipio,
          direccion,
          lat: lat!,
          lng: lng!,
          hora_apertura: horaApertura,
          hora_cierre: horaCierre,
          logo: logo ?? undefined,
          portada: portada ?? undefined,
          metodos_pago: metodosPago,
        });
        toast.show("¡Tienda creada! Bienvenido a tu panel de vendedor.", "success");
        // Antes esto se quedaba en esta misma pantalla mostrando solo el aviso -- el
        // vendedor recién creado no veía su dashboard (Resumen) a menos que hiciera clic
        // manualmente en el sidebar. Ahora se navega directo al panel principal.
        navigate("/vendedor");
      }
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo guardar la tienda.", "error");
    } finally {
      setGuardando(false);
    }
  };

  if (tienda === undefined) return <Skeleton height={300} />;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} style={{ maxWidth: 1040 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, display: "flex", alignItems: "center", gap: 9 }}>
            <Storefront size={21} /> {tienda ? "Mi tienda" : "Crea tu tienda"}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            {tienda ? "Así es como te ven tus compradores. Edita cualquier campo y guarda los cambios." : "Completa estos datos para empezar a vender."}
          </p>
        </div>
        {tienda && (
          <Button variant="secondary" onClick={() => navigate(`/tienda/${tienda.id}`)}>
            <Eye size={16} /> Vista previa de mi tienda
          </Button>
        )}
      </div>

      <div className="vendedor-tienda-grid" style={{ display: "grid", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          <Section title="Identidad" subtitle="Portada, logo y presentación de tu tienda.">
            <div style={{ display: "flex", gap: 14 }}>
              <ImageBox label="Portada" value={portada} onPick={async (f) => setPortada(await fileToBase64(f))} onRemove={() => setPortada(null)} flex height={110} />
              <ImageBox label="Logo" value={logo} onPick={async (f) => setLogo(await fileToBase64(f))} onRemove={() => setLogo(null)} width={110} height={110} round />
            </div>

            <div>
              <Input label="Nombre de la tienda" value={nombre} maxLength={MAX_NOMBRE_TIENDA} onChange={(e) => setNombre(e.target.value)} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                <CharCounter current={nombre.length} max={MAX_NOMBRE_TIENDA} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Descripción</label>
              <textarea
                value={descripcion}
                maxLength={MAX_DESCRIPCION_TIENDA}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                style={{ width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: 12, fontSize: 13.5, fontFamily: "inherit", resize: "vertical" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                <CharCounter current={descripcion.length} max={MAX_DESCRIPCION_TIENDA} />
              </div>
            </div>
            <PhoneInput value={telefono} onChange={setTelefono} />
          </Section>

          <Section title="Categorías" subtitle="Elige todas las que apliquen -- ayuda a que te encuentren en más búsquedas.">
            <MultiCategoryPicker value={categorias} onChange={setCategorias} />
          </Section>

          <Section title="Ubicación y horario" subtitle="Dónde y cuándo te pueden encontrar tus compradores.">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 220px" }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Municipio</label>
                <select
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  disabled={!municipios}
                  style={{ width: "100%", height: 44, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface-1)", color: "var(--text-primary)", padding: "0 12px", fontSize: 14 }}
                >
                  <option value="" disabled>
                    {municipios ? "Elige un municipio…" : "Cargando…"}
                  </option>
                  {municipio && !municipios?.some((m) => m.nombre === municipio) && <option value={municipio}>{municipio}</option>}
                  {porDepartamento.map(([depto, ms]) => (
                    <optgroup key={depto} label={depto}>
                      {ms.map((m) => (
                        <option key={m.id} value={m.nombre}>
                          {m.nombre}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div style={{ flex: "1 1 220px" }}>
                <Input
                  label="Dirección"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  list="sugerencias-direccion-tienda"
                  placeholder={municipio ? `ej. Colonia Centro, ${municipio}` : "Elige un municipio primero"}
                />
                {sugerenciasDireccion.length > 0 && (
                  <datalist id="sugerencias-direccion-tienda">
                    {sugerenciasDireccion.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Abre" type="time" value={horaApertura} onChange={(e) => setHoraApertura(e.target.value)} />
              <Input label="Cierra" type="time" value={horaCierre} onChange={(e) => setHoraCierre(e.target.value)} />
            </div>

            <div>
              <div style={{ marginBottom: 8 }}>
                <Input
                  label="Buscar dirección exacta en el mapa"
                  value={busquedaMapa}
                  onChange={(e) => setBusquedaMapa(e.target.value)}
                  placeholder="Escribe una calle, colonia o punto de referencia..."
                  icon={<MagnifyingGlass size={16} color="var(--text-muted)" />}
                />
                {resultadosMapa && resultadosMapa.length > 0 && (
                  <div style={{ marginTop: 6, borderRadius: "var(--radius-md)", border: "1px solid var(--border)", overflow: "hidden" }}>
                    {resultadosMapa.map((r, i) => (
                      <button
                        key={`${r.lat}-${r.lng}`}
                        type="button"
                        onClick={() => elegirResultadoBusqueda(r)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          width: "100%",
                          padding: "10px 12px",
                          background: "var(--surface-1)",
                          border: "none",
                          borderBottom: i < resultadosMapa.length - 1 ? "1px solid var(--border)" : "none",
                          color: "var(--text-secondary)",
                          fontSize: 12.5,
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <MapPinLine size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                {buscandoMapa && (
                  <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <MagnifyingGlass size={12} /> Buscando...
                  </p>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>O toca el mapa para ubicar tu tienda</span>
                <Button size="sm" variant="secondary" onClick={usarUbicacion}>
                  <Crosshair size={14} /> Mi ubicación
                </Button>
              </div>
              <div style={{ height: 220, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border)" }}>
                <MapView
                  center={lat !== null && lng !== null ? [lng, lat] : EL_SALVADOR_CENTER}
                  zoom={lat !== null ? 16 : 12}
                  fitToMarkers={false}
                  height="100%"
                  onMapClick={(c) => aplicarUbicacion(c)}
                  markers={lat !== null && lng !== null ? [{ id: "tienda", lat, lng, color: "#38D6FF" }] : []}
                />
              </div>
              <div className="tabular" style={{ fontSize: 12.5, color: lat ? "var(--ok)" : "var(--text-muted)", marginTop: 6 }}>
                {ubicando ? "Detectando la calle…" : lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Sin ubicar"}
              </div>
            </div>
          </Section>

          <Section title="Métodos de pago" subtitle="Elige los que aceptas al momento de la entrega o pago en línea.">
            <div style={{ display: "flex", gap: 16 }}>
              {METODOS.map(({ key, label, icon: MetodoIcon }) => {
                const active = metodosPago.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleMetodo(key)}
                    aria-pressed={active}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    <span
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: `2px solid ${active ? "var(--cyan)" : "var(--border)"}`,
                        background: active ? "var(--cyan-bg)" : "var(--surface-2)",
                        color: active ? "var(--cyan)" : "var(--text-muted)",
                        transition: "border-color var(--dur-base), background var(--dur-base)",
                      }}
                    >
                      <MetodoIcon size={24} weight={active ? "fill" : "regular"} />
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: active ? "var(--cyan)" : "var(--text-secondary)" }}>{label}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Button size="lg" onClick={guardar} loading={guardando}>
            {tienda ? "Guardar cambios" : "Crear tienda"}
          </Button>
        </div>

        <aside style={{ position: "relative" }}>
          <div className="vendedor-tienda-preview-sticky">
            <TiendaPreviewCard
              nombre={nombre}
              descripcion={descripcion}
              portada={portada}
              logo={logo}
              categorias={categorias}
              municipio={municipio}
              direccion={direccion}
              metodosPago={metodosPago}
            />
          </div>
        </aside>
      </div>

      <style>{`
        .vendedor-tienda-grid { grid-template-columns: 1fr; }
        @media (min-width: 900px) {
          .vendedor-tienda-grid { grid-template-columns: 1fr 300px; align-items: start; }
          .vendedor-tienda-preview-sticky { position: sticky; top: 88px; }
        }
      `}</style>
    </motion.div>
  );
}

function ImageBox({
  label,
  value,
  onPick,
  onRemove,
  flex,
  width,
  height,
  round,
}: {
  label: string;
  value: string | null;
  onPick: (f: File) => void;
  onRemove: () => void;
  flex?: boolean;
  width?: number;
  height: number;
  round?: boolean;
}) {
  return (
    <div style={{ position: "relative", flex: flex ? 1 : undefined, width: flex ? undefined : width, flexShrink: 0 }}>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height,
          borderRadius: round ? "50%" : "var(--radius-md)",
          background: "var(--surface-2)",
          border: "1px dashed var(--border-strong)",
          cursor: "pointer",
          overflow: "hidden",
        }}
      >
        {value ? <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{label}</span>}
        <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
      </label>
      {value && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Eliminar ${label.toLowerCase()}`}
          title={`Eliminar ${label.toLowerCase()}`}
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "var(--danger)",
            color: "#fff",
            border: "2px solid var(--surface-1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={12} weight="bold" />
        </button>
      )}
    </div>
  );
}

/** Vista previa en vivo de cómo se ve la tarjeta/perfil de la tienda mientras se edita. */
function TiendaPreviewCard({
  nombre,
  descripcion,
  portada,
  logo,
  categorias,
  municipio,
  direccion,
  metodosPago,
}: {
  nombre: string;
  descripcion: string;
  portada: string | null;
  logo: string | null;
  categorias: string[];
  municipio: string;
  direccion: string;
  metodosPago: string[];
}) {
  return (
    <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
      <div style={{ height: 80, background: portada ? undefined : "var(--surface-2)", position: "relative" }}>
        {portada && <img src={portada} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", inset: 0, background: "rgba(8,11,20,0.18)" }} />
        <div style={{ position: "absolute", left: "50%", bottom: -26, transform: "translateX(-50%)", width: 56, height: 56, borderRadius: "50%", border: "3px solid var(--surface-1)", overflow: "hidden", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {logo ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Storefront size={20} color="var(--text-muted)" />}
        </div>
      </div>
      <div style={{ padding: "34px 16px 18px", textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre || "Nombre de tu tienda"}</div>
        {(municipio || direccion) && (
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {[direccion, municipio].filter(Boolean).join(", ")}
          </div>
        )}
        {descripcion && <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8, lineHeight: 1.5 }}>{descripcion.slice(0, 120)}{descripcion.length > 120 ? "…" : ""}</p>}
        {!!categorias.length && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10, justifyContent: "center" }}>
            {categorias.slice(0, 4).map((c) => {
              const color = categoriaColor(c);
              const Icon = categoriaIcon(c);
              return (
                <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: "var(--radius-pill)", background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
                  <Icon size={10} weight="fill" /> {CATEGORIA_LABEL[c as Categoria] ?? c}
                </span>
              );
            })}
            {categorias.length > 4 && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", alignSelf: "center" }}>+{categorias.length - 4}</span>}
          </div>
        )}
        {!!metodosPago.length && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
            {METODOS.filter((m) => metodosPago.includes(m.key)).map(({ key, icon: MetodoIcon, label }) => (
              <span key={key} title={label} style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--cyan-bg)", color: "var(--cyan)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MetodoIcon size={13} weight="fill" />
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
