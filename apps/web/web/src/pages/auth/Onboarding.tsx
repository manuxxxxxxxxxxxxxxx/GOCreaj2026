import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, MapPin, Phone, ShieldCheck } from "@phosphor-icons/react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { productosApi, authApi, ApiError } from "../../lib/api";
import type { Municipio } from "../../lib/types";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { Button } from "../../components/ui/Button";
import { MapView, type MapMarker } from "../../components/ui/MapView";

const STEPS = ["Teléfono", "Permisos", "Ubicación"] as const;

export function Onboarding() {
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [telefono, setTelefono] = useState("");
  const [guardandoTelefono, setGuardandoTelefono] = useState(false);
  const [permisoEstado, setPermisoEstado] = useState<"idle" | "pidiendo" | "concedido" | "denegado">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [municipios, setMunicipios] = useState<Municipio[] | null>(null);
  const [municipio, setMunicipio] = useState("");
  const [guardandoUbicacion, setGuardandoUbicacion] = useState(false);

  useEffect(() => {
    if (usuario === null) navigate("/login", { replace: true });
  }, [usuario, navigate]);

  useEffect(() => {
    productosApi.municipiosCatalogo().then((r) => {
      setMunicipios(r.municipios);
      if (!municipio && usuario?.municipio) setMunicipio(usuario.municipio);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const municipiosPorDepto = useMemo(() => {
    if (!municipios) return [];
    const grupos = new Map<string, Municipio[]>();
    for (const m of municipios) {
      if (!grupos.has(m.departamento)) grupos.set(m.departamento, []);
      grupos.get(m.departamento)!.push(m);
    }
    return Array.from(grupos.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [municipios]);

  const irA = (n: number) => setStep(Math.max(0, Math.min(STEPS.length - 1, n)));

  const guardarTelefono = async (saltar: boolean) => {
    if (!saltar && telefono.trim()) {
      setGuardandoTelefono(true);
      try {
        const r = await authApi.actualizarPerfil({ telefono: telefono.trim() });
        actualizarUsuarioLocal(r.usuario);
      } catch (err) {
        toast.show(err instanceof ApiError ? err.message : "No se pudo guardar tu teléfono.", "error");
        setGuardandoTelefono(false);
        return;
      }
      setGuardandoTelefono(false);
    }
    irA(1);
  };

  const pedirPermiso = () => {
    if (!navigator.geolocation) {
      setPermisoEstado("denegado");
      return;
    }
    setPermisoEstado("pidiendo");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPermisoEstado("concedido");
        window.setTimeout(() => irA(2), 700);
      },
      () => setPermisoEstado("denegado"),
      { timeout: 10000 },
    );
  };

  const finalizar = async () => {
    if (!municipio) return toast.show("Selecciona tu municipio.", "warning");
    setGuardandoUbicacion(true);
    try {
      await authApi.actualizarUbicacion({ municipio, lat: coords?.lat, lng: coords?.lng });
      toast.show("¡Todo listo!", "success");
      navigate("/", { replace: true });
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo guardar tu ubicación.", "error");
    } finally {
      setGuardandoUbicacion(false);
    }
  };

  const markers: MapMarker[] = coords ? [{ id: "yo", lat: coords.lat, lng: coords.lng, color: "var(--cyan)", label: "Tu ubicación" }] : [];

  return (
    <div className="glow-mesh" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <div style={{ height: 4, borderRadius: "var(--radius-pill)", background: "var(--border)", overflow: "hidden" }}>
                <motion.div
                  initial={false}
                  animate={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: "100%", background: "var(--cyan)" }}
                />
              </div>
              <div style={{ fontSize: 10.5, color: i <= step ? "var(--cyan)" : "var(--text-muted)", marginTop: 4, fontWeight: 600, textAlign: "center" }}>{s}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: 28,
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
            minHeight: 340,
            position: "relative",
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {step === 0 && (
              <motion.div key="tel" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--cyan-bg)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Phone size={22} color="var(--cyan)" weight="bold" />
                </div>
                <h1 style={{ fontSize: 20, marginBottom: 6 }}>¿Cuál es tu número?</h1>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>Lo usamos para avisarte del estado de tus pedidos. Puedes agregarlo después si prefieres.</p>
                <PhoneInput value={telefono} onChange={setTelefono} />
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <Button variant="secondary" fullWidth onClick={() => guardarTelefono(true)}>
                    Omitir
                  </Button>
                  <Button fullWidth loading={guardandoTelefono} onClick={() => guardarTelefono(false)}>
                    Continuar
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="perm" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--cyan-bg)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <ShieldCheck size={22} color="var(--cyan)" weight="bold" />
                </div>
                <h1 style={{ fontSize: 20, marginBottom: 6 }}>Permite tu ubicación</h1>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>Así te mostramos tiendas cercanas y calculamos tiempos de entrega más precisos.</p>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "20px 0" }}>
                  <AnimatePresence mode="wait">
                    {permisoEstado === "concedido" ? (
                      <motion.div key="ok" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }}>
                        <CheckCircle size={56} weight="fill" color="var(--ok)" />
                      </motion.div>
                    ) : permisoEstado === "pidiendo" ? (
                      <motion.span key="loading" className="spinner" style={{ width: 40, height: 40, borderWidth: 3, color: "var(--cyan)" }} />
                    ) : (
                      <motion.div key="icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <MapPin size={56} color="var(--text-muted)" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {permisoEstado === "denegado" && <p style={{ fontSize: 12, color: "var(--warn)" }}>No se pudo obtener tu ubicación. Puedes elegirla manualmente en el siguiente paso.</p>}
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <Button variant="secondary" fullWidth onClick={() => irA(2)}>
                    Ahora no
                  </Button>
                  <Button fullWidth loading={permisoEstado === "pidiendo"} onClick={pedirPermiso}>
                    Permitir ubicación
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="ubi" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--cyan-bg)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <MapPin size={22} color="var(--cyan)" weight="bold" />
                </div>
                <h1 style={{ fontSize: 20, marginBottom: 6 }}>Confirma tu zona</h1>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>Usamos tu municipio para mostrarte tiendas y calcular envíos.</p>

                {markers.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <MapView markers={markers} height={140} zoom={14} fitToMarkers />
                  </div>
                )}

                <select
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  style={{ width: "100%", height: 44, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface-1)", color: "var(--text-primary)", padding: "0 12px", fontSize: 13.5, marginBottom: 20 }}
                >
                  <option value="" disabled>
                    Selecciona tu municipio
                  </option>
                  {municipiosPorDepto.map(([depto, ms]) => (
                    <optgroup key={depto} label={depto}>
                      {ms.map((m) => (
                        <option key={m.id} value={m.nombre}>
                          {m.nombre}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <Button fullWidth size="lg" loading={guardandoUbicacion} onClick={finalizar}>
                  Empezar a explorar
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => navigate("/", { replace: true })}
          style={{ display: "block", margin: "16px auto 0", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 12.5 }}
        >
          Saltar por ahora
        </button>
      </div>
    </div>
  );
}
