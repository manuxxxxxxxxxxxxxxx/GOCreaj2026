import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crosshair, Storefront } from "@phosphor-icons/react";
import { vendedorApi, ApiError } from "../../lib/api";
import type { Tienda } from "../../lib/types";
import { fileToBase64 } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { Skeleton } from "../../components/ui/Skeleton";

const METODOS = ["efectivo", "tarjeta", "paypal"];

export function VendedorTienda() {
  const [tienda, setTienda] = useState<Tienda | null | undefined>(undefined);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
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
  const toast = useToast();

  useEffect(() => {
    vendedorApi.misTiendas().then((r) => {
      const t = r.tiendas[0] ?? null;
      setTienda(t);
      if (t) {
        setNombre(t.nombre);
        setDescripcion(t.descripcion ?? "");
        setCategoria(t.categoria ?? "");
        setTelefono(t.telefono ?? "");
        setMunicipio(t.municipio);
        setDireccion(t.direccion ?? "");
        setHoraApertura(t.hora_apertura ?? "08:00");
        setHoraCierre(t.hora_cierre ?? "20:00");
        setLat(t.lat);
        setLng(t.lng);
        setLogo(t.logo);
        setPortada(t.portada);
        setMetodosPago(t.metodos_pago?.split(",") ?? ["efectivo"]);
      }
    });
  }, []);

  const usarUbicacion = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        toast.show("Ubicación capturada", "success");
      },
      () => toast.show("No se pudo obtener tu ubicación.", "error"),
    );
  };

  const toggleMetodo = (m: string) => {
    setMetodosPago((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const guardar = async () => {
    if (!nombre.trim() || !municipio.trim()) return toast.show("Nombre y municipio son obligatorios.", "warning");
    if (!tienda && (lat === null || lng === null)) return toast.show("Captura la ubicación de tu tienda.", "warning");
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
        toast.show("¡Tienda creada!", "success");
      }
      const r = await vendedorApi.misTiendas();
      setTienda(r.tiendas[0] ?? null);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo guardar la tienda.", "error");
    } finally {
      setGuardando(false);
    }
  };

  if (tienda === undefined) return <Skeleton height={300} />;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <Storefront size={20} /> {tienda ? "Mi tienda" : "Crea tu tienda"}
        </h1>
        {!tienda && <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>Completa estos datos para empezar a vender.</p>}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <label style={{ flex: 1, height: 90, borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px dashed var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden" }}>
          {portada ? <img src={portada} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Portada</span>}
          <input type="file" accept="image/*" hidden onChange={async (e) => e.target.files?.[0] && setPortada(await fileToBase64(e.target.files[0]))} />
        </label>
        <label style={{ width: 90, height: 90, borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px dashed var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", flexShrink: 0 }}>
          {logo ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Logo</span>}
          <input type="file" accept="image/*" hidden onChange={async (e) => e.target.files?.[0] && setLogo(await fileToBase64(e.target.files[0]))} />
        </label>
      </div>

      <Input label="Nombre de la tienda" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Descripción</label>
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} style={{ width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: 12, fontSize: 13.5, fontFamily: "inherit", resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Input label="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Comida rápida" />
        <PhoneInput value={telefono} onChange={setTelefono} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Input label="Municipio" value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
        <Input label="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Input label="Abre" type="time" value={horaApertura} onChange={(e) => setHoraApertura(e.target.value)} />
        <Input label="Cierra" type="time" value={horaCierre} onChange={(e) => setHoraCierre(e.target.value)} />
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Ubicación</span>
          <Button size="sm" variant="secondary" onClick={usarUbicacion}>
            <Crosshair size={14} /> Usar mi ubicación
          </Button>
        </div>
        <div className="tabular" style={{ fontSize: 12.5, color: lat ? "var(--ok)" : "var(--text-muted)" }}>
          {lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Sin capturar"}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Métodos de pago aceptados</div>
        <div style={{ display: "flex", gap: 8 }}>
          {METODOS.map((m) => (
            <button
              key={m}
              onClick={() => toggleMetodo(m)}
              style={{ padding: "8px 14px", borderRadius: "var(--radius-pill)", border: `1px solid ${metodosPago.includes(m) ? "var(--cyan)" : "var(--border)"}`, background: metodosPago.includes(m) ? "var(--cyan-bg)" : "var(--surface-1)", color: metodosPago.includes(m) ? "var(--cyan)" : "var(--text-secondary)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <Button size="lg" onClick={guardar} loading={guardando}>
        {tienda ? "Guardar cambios" : "Crear tienda"}
      </Button>
    </motion.div>
  );
}
