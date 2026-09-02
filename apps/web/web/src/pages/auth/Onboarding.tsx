import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Camera, CheckCircle, IdentificationCard, MapPin, Phone } from "@phosphor-icons/react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { productosApi, authApi, ApiError } from "../../lib/api";
import type { Municipio } from "../../lib/types";
import { fileToBase64 } from "../../lib/format";
import { Avatar } from "../../components/ui/Avatar";
import { Input } from "../../components/ui/Input";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { Button } from "../../components/ui/Button";
import { MapView, type MapMarker } from "../../components/ui/MapView";

type StepKey = "telefono" | "usuario" | "ubicacion";

/** Distancia en línea recta (km) -- mismo cálculo que distancia_km() en el backend
 * (conexion.php), usado aquí solo para encontrar el municipio más cercano a las
 * coordenadas del GPS, sin depender de ninguna llamada extra al servidor. */
function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function Onboarding() {
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Se calcula una sola vez al entrar (no en cada render): el usuario avanza dentro del
  // mismo set de pasos que vio al empezar, así verificar el teléfono a mitad de camino no
  // recalcula la lista y salta el paso de "Usuario" (telefono_verificado ya cambió a 1 antes
  // de llegar a ese paso, lo que lo sacaría de la lista si dependiera del estado en vivo).
  const [steps] = useState<StepKey[]>(() => {
    const s: StepKey[] = [];
    if (!usuario?.telefono_verificado) s.push("telefono");
    if (!usuario?.username) s.push("usuario");
    s.push("ubicacion");
    return s;
  });
  const stepLabels: Record<StepKey, string> = { telefono: "Teléfono", usuario: "Usuario", ubicacion: "Ubicación" };

  const [step, setStep] = useState(0);
  const current = steps[step];

  const sugerido = (location.state as { usernameSugerido?: string } | null)?.usernameSugerido ?? "";
  const [username, setUsername] = useState(sugerido);
  const [foto, setFoto] = useState<string | null>(null);
  const [subiendoUsuario, setSubiendoUsuario] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [telefono, setTelefono] = useState(usuario?.telefono ?? "");
  const [codigoTelEnviado, setCodigoTelEnviado] = useState(false);
  const [codigoTel, setCodigoTel] = useState("");
  const [enviandoTel, setEnviandoTel] = useState(false);
  const [verificandoTel, setVerificandoTel] = useState(false);

  const [detectando, setDetectando] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [ubicacionError, setUbicacionError] = useState<string | null>(null);
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

  const irA = (n: number) => setStep(Math.max(0, Math.min(steps.length - 1, n)));
  const siguiente = () => irA(step + 1);

  const elegirFoto = async (file: File) => setFoto(await fileToBase64(file));

  const guardarUsuario = async (saltar: boolean) => {
    setSubiendoUsuario(true);
    try {
      const data: { username?: string; foto_perfil?: string } = {};
      if (!saltar && username.trim()) data.username = username.trim();
      if (foto) data.foto_perfil = foto;
      if (Object.keys(data).length > 0) {
        const r = await authApi.actualizarPerfil(data);
        actualizarUsuarioLocal(r.usuario);
      }
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo guardar tu usuario.", "error");
      setSubiendoUsuario(false);
      return;
    }
    setSubiendoUsuario(false);
    siguiente();
  };

  const enviarCodigoTelefono = async () => {
    if (telefono.length !== 8) {
      toast.show("Ingresa tu número completo (8 dígitos).", "warning");
      return;
    }
    setEnviandoTel(true);
    try {
      const r = await authApi.enviarSms(telefono);
      setCodigoTelEnviado(true);
      toast.show(r.enviado ? `Te enviamos un código por WhatsApp a +503 ${telefono}.` : `Sin proveedor de WhatsApp configurado. Código simulado: ${r.codigo}`, "info");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar el código.", "error");
    } finally {
      setEnviandoTel(false);
    }
  };

  const verificarCodigoTelefono = async () => {
    if (codigoTel.trim().length !== 6) {
      toast.show("El código tiene 6 dígitos.", "warning");
      return;
    }
    setVerificandoTel(true);
    try {
      const r = await authApi.verificarSms(codigoTel.trim());
      actualizarUsuarioLocal(r.usuario);
      toast.show("Teléfono verificado", "success");
      siguiente();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Código inválido.", "error");
    } finally {
      setVerificandoTel(false);
    }
  };

  const detectarUbicacion = () => {
    if (!navigator.geolocation) {
      setUbicacionError("Tu navegador no soporta geolocalización. Elige tu municipio manualmente.");
      return;
    }
    setDetectando(true);
    setUbicacionError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        if (municipios && municipios.length > 0) {
          const masCercano = municipios.reduce((mejor, m) => (distanciaKm(c.lat, c.lng, m.lat, m.lng) < distanciaKm(c.lat, c.lng, mejor.lat, mejor.lng) ? m : mejor));
          setMunicipio(masCercano.nombre);
        }
        setDetectando(false);
      },
      () => {
        setUbicacionError("No se pudo obtener tu ubicación. Elige tu municipio manualmente.");
        setDetectando(false);
      },
      { timeout: 10000 },
    );
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => irA(step - 1)}
            aria-label="Volver al paso anterior"
            title="Volver"
            disabled={step === 0}
            style={{
              flexShrink: 0,
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: step === 0 ? "default" : "pointer",
              color: "var(--text-secondary)",
              visibility: step === 0 ? "hidden" : "visible",
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div style={{ display: "flex", gap: 6, flex: 1 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <div style={{ height: 4, borderRadius: "var(--radius-pill)", background: "var(--border)", overflow: "hidden" }}>
                <motion.div
                  initial={false}
                  animate={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: "100%", background: "var(--cyan)" }}
                />
              </div>
              <div style={{ fontSize: 10.5, color: i <= step ? "var(--cyan)" : "var(--text-muted)", marginTop: 4, fontWeight: 600, textAlign: "center" }}>{stepLabels[s]}</div>
            </div>
          ))}
          </div>
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
            {current === "telefono" && (
              <motion.div key="tel" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--cyan-bg)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Phone size={22} color="var(--cyan)" weight="bold" />
                </div>
                <h1 style={{ fontSize: 20, marginBottom: 6 }}>Verifica tu número</h1>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
                  Te lo pedimos para avisarte del estado de tus pedidos y proteger tu cuenta. Te mandamos un código por WhatsApp.
                </p>

                <PhoneInput value={telefono} onChange={(v) => { setTelefono(v); setCodigoTelEnviado(false); }} />

                {!codigoTelEnviado ? (
                  <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                    <Button variant="secondary" fullWidth onClick={siguiente}>
                      Omitir
                    </Button>
                    <Button fullWidth loading={enviandoTel} onClick={enviarCodigoTelefono}>
                      Enviar código por WhatsApp
                    </Button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                      <Input label="Código de 6 dígitos" inputMode="numeric" maxLength={6} value={codigoTel} onChange={(e) => setCodigoTel(e.target.value.replace(/\D/g, ""))} style={{ flex: 1 }} />
                      <Button loading={verificandoTel} onClick={verificarCodigoTelefono} style={{ alignSelf: "flex-end", height: 44 }}>
                        Verificar
                      </Button>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={enviarCodigoTelefono}
                        disabled={enviandoTel}
                        style={{ fontSize: 12.5, fontWeight: 600, color: "var(--cyan)", background: "none", border: "none", cursor: "pointer" }}
                      >
                        Reenviar código
                      </button>
                      <button
                        type="button"
                        onClick={siguiente}
                        style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}
                      >
                        Omitir por ahora
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {current === "usuario" && (
              <motion.div key="usuario" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--cyan-bg)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <IdentificationCard size={22} color="var(--cyan)" weight="bold" />
                </div>
                <h1 style={{ fontSize: 20, marginBottom: 6 }}>Elige tu usuario</h1>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>Así te van a encontrar los demás en SV[Go]. Te sugerimos uno, pero puedes cambiarlo.</p>

                <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                  <div style={{ position: "relative" }}>
                    <Avatar nombre={usuario?.nombre ?? ""} foto={foto ?? usuario?.foto_perfil ?? null} size={76} />
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && elegirFoto(e.target.files[0])} />
                    <button
                      onClick={() => fileRef.current?.click()}
                      aria-label="Elegir foto de perfil"
                      style={{ position: "absolute", bottom: -2, right: -2, width: 28, height: 28, borderRadius: "50%", background: "var(--cyan)", color: "var(--cyan-ink)", border: "2px solid var(--surface-1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    >
                      <Camera size={14} weight="bold" />
                    </button>
                  </div>
                </div>

                <Input
                  label="Nombre de usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="usuario123"
                  hint="Solo letras, números y guion bajo."
                />

                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <Button variant="secondary" fullWidth onClick={() => guardarUsuario(true)} disabled={subiendoUsuario}>
                    Omitir
                  </Button>
                  <Button fullWidth loading={subiendoUsuario} onClick={() => guardarUsuario(false)}>
                    Continuar
                  </Button>
                </div>
              </motion.div>
            )}

            {current === "ubicacion" && (
              <motion.div key="ubi" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--cyan-bg)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <MapPin size={22} color="var(--cyan)" weight="bold" />
                </div>
                <h1 style={{ fontSize: 20, marginBottom: 6 }}>¿Dónde estás?</h1>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
                  Detecta tu ubicación y elegimos tu municipio automáticamente, o selecciónalo tú mismo.
                </p>

                {coords && markers.length > 0 ? (
                  <div style={{ marginBottom: 16 }}>
                    <MapView markers={markers} height={140} zoom={14} fitToMarkers />
                  </div>
                ) : (
                  <Button variant="secondary" fullWidth loading={detectando} onClick={detectarUbicacion} style={{ marginBottom: 16 }}>
                    {detectando ? "Detectando…" : "Detectar mi ubicación"}
                  </Button>
                )}
                {coords && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 12, color: "var(--ok)" }}>
                    <CheckCircle size={14} weight="fill" /> Ubicación detectada
                  </div>
                )}
                {ubicacionError && <p style={{ fontSize: 12, color: "var(--warn)", marginBottom: 16 }}>{ubicacionError}</p>}

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
      </div>
    </div>
  );
}
