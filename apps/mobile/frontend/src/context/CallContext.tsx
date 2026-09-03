import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Vibration } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import type { MediaStream, RTCPeerConnection as RTCPeerConnectionT } from "react-native-webrtc";
import { chatApi } from "../lib/api";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

export type EstadoLlamada = "idle" | "entrante" | "saliente" | "activa";

export interface OtroEnLlamada {
  id: number;
  nombre: string;
  foto_perfil: string | null;
}

interface CallContextValue {
  estado: EstadoLlamada;
  otro: OtroEnLlamada | null;
  muted: boolean;
  duracion: number;
  iniciar: (otro: OtroEnLlamada) => void;
  aceptar: () => void;
  rechazar: () => void;
  colgar: () => void;
  toggleMute: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

// Solo STUN público -- sin TURN configurado. Mismo criterio y misma limitación real que
// apps/web/web/src/context/CallContext.tsx, del que se portó este archivo: NAT simétrico
// en ambos extremos puede fallar en conectar directo.
const RTC_CONFIG = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

// Patrón de vibración para "está sonando" -- react-native-webrtc no trae Web Audio API
// para sintetizar un tono como hace la versión web (ver CallContext.tsx de apps/web/web),
// así que acá el aviso de llamada entrante es vibración repetida en vez de sonido.
const PATRON_TIMBRE = [0, 600, 400];

type WebRTCModule = typeof import("react-native-webrtc");
let webrtcModule: WebRTCModule | null | undefined;

// Expo Go es precisamente el "cliente de la tienda" (StoreClient) -- ahí react-native-webrtc
// NUNCA existe, sin excepción. Esto se revisa ANTES de intentar el require de más abajo a
// propósito: Expo Go trata "un módulo nativo no existe" como un error de desarrollo que
// muestra sí o sí en pantalla roja, sin importar que el código lo haya atrapado con
// try/catch (es la misma pantalla que ya viste, con el mensaje de Expo pidiendo un dev
// build) -- la única forma de evitar que aparezca es no llegar siquiera a intentar el
// require cuando ya se sabe de antemano que va a fallar.
const esExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * react-native-webrtc es un módulo NATIVO: no existe dentro de Expo Go, solo en un dev
 * build propio (mismo motivo por el que react-native-webview sí funciona en Expo Go pero
 * este no -- ver el comentario en components/ui/WebMapView.tsx). Cargarlo perezoso (recién
 * cuando alguien de verdad intenta llamar, nunca al arrancar la app) evita que el resto de
 * la app -- mapas, chat de texto, pedidos, todo lo que NO es llamadas -- se caiga entera en
 * Expo Go solo por tener esta dependencia en el proyecto.
 */
function getWebRTC(): WebRTCModule | null {
  if (webrtcModule !== undefined) return webrtcModule;
  if (esExpoGo) {
    webrtcModule = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga perezosa a propósito, ver comentario de arriba.
    webrtcModule = require("react-native-webrtc") as WebRTCModule;
  } catch {
    webrtcModule = null;
  }
  return webrtcModule;
}

const SIN_DEV_BUILD = "Las llamadas necesitan un build nuevo de la app (no funcionan en Expo Go). Pide que te generen uno.";

/** Mensaje específico según por qué falló el acceso al micrófono, en vez de un genérico "revisa permisos". */
function mensajeErrorMedia(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (/permission/i.test(msg)) return "Permiso de micrófono denegado. Habilítalo en los ajustes del teléfono y vuelve a intentar.";
  if (/not\s*found|no.*device/i.test(msg)) return "No se encontró micrófono en este dispositivo.";
  return "No se pudo iniciar la llamada. Revisa los permisos de micrófono.";
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const toast = useToast();
  const [estado, setEstado] = useState<EstadoLlamada>("idle");
  const [otro, setOtro] = useState<OtroEnLlamada | null>(null);
  const [muted, setMuted] = useState(false);
  const [duracion, setDuracion] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnectionT | null>(null);
  const llamadaIdRef = useRef<number | null>(null);
  const lastSignalIdRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const incomingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const estadoRef = useRef<EstadoLlamada>("idle");
  const candidatosPendientesRef = useRef<unknown[]>([]);

  useEffect(() => {
    estadoRef.current = estado;
  }, [estado]);

  const limpiarLlamada = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    if (durTimerRef.current) clearInterval(durTimerRef.current);
    durTimerRef.current = null;
    Vibration.cancel();
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    llamadaIdRef.current = null;
    lastSignalIdRef.current = 0;
    candidatosPendientesRef.current = [];
    setMuted(false);
    setDuracion(0);
    setOtro(null);
    setEstado("idle");
  }, []);

  const iniciarDuracion = () => {
    if (durTimerRef.current) clearInterval(durTimerRef.current);
    durTimerRef.current = setInterval(() => setDuracion((d) => d + 1), 1000);
  };

  const procesarSenal = useCallback(
    async (tipoSenal: string, payload: unknown) => {
      const pc = pcRef.current;
      const webrtc = getWebRTC();
      if (!pc || !webrtc) return;

      if (tipoSenal === "offer") {
        if (pc.remoteDescription) return;
        await pc.setRemoteDescription(new webrtc.RTCSessionDescription(payload as { sdp: string; type: string }));
        for (const c of candidatosPendientesRef.current) await pc.addIceCandidate(new webrtc.RTCIceCandidate(c as RTCIceCandidateInit)).catch(() => {});
        candidatosPendientesRef.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (llamadaIdRef.current) await chatApi.enviarSenal(llamadaIdRef.current, "answer", answer);
        setEstado("activa");
        iniciarDuracion();
      } else if (tipoSenal === "answer") {
        if (pc.remoteDescription) return;
        await pc.setRemoteDescription(new webrtc.RTCSessionDescription(payload as { sdp: string; type: string }));
        for (const c of candidatosPendientesRef.current) await pc.addIceCandidate(new webrtc.RTCIceCandidate(c as RTCIceCandidateInit)).catch(() => {});
        candidatosPendientesRef.current = [];
        setEstado("activa");
        iniciarDuracion();
      } else if (tipoSenal === "candidate") {
        if (pc.remoteDescription) await pc.addIceCandidate(new webrtc.RTCIceCandidate(payload as RTCIceCandidateInit)).catch(() => {});
        else candidatosPendientesRef.current.push(payload);
      } else if (tipoSenal === "hangup") {
        limpiarLlamada();
      }
    },
    [limpiarLlamada],
  );

  const iniciarPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      const llamadaId = llamadaIdRef.current;
      if (!llamadaId) return;
      chatApi
        .obtenerSenales(llamadaId, lastSignalIdRef.current)
        .then((r) => {
          for (const s of r.senales) {
            lastSignalIdRef.current = Math.max(lastSignalIdRef.current, s.id);
            procesarSenal(s.tipo, s.payload);
          }
        })
        .catch(() => {});
    }, 1000);
  }, [procesarSenal]);

  const crearPeerConnection = (llamadaId: number, webrtc: WebRTCModule) => {
    const pc = new webrtc.RTCPeerConnection(RTC_CONFIG);
    pc.onicecandidate = (e: unknown) => {
      const candidate = (e as { candidate: unknown }).candidate;
      if (candidate) chatApi.enviarSenal(llamadaId, "candidate", candidate).catch(() => {});
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") toast.show("Se perdió la conexión de la llamada.", "error");
    };
    pcRef.current = pc;
    return pc;
  };

  const iniciar = useCallback(
    async (otroInfo: OtroEnLlamada) => {
      const webrtc = getWebRTC();
      if (!webrtc) {
        toast.show(SIN_DEV_BUILD, "error");
        return;
      }
      setOtro(otroInfo);
      setEstado("saliente");
      try {
        const r = await chatApi.iniciarLlamada(otroInfo.id, "voz");
        llamadaIdRef.current = r.llamada_id;
        const stream = await webrtc.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream as unknown as MediaStream;
        const pc = crearPeerConnection(r.llamada_id, webrtc);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream as unknown as MediaStream));
        const offer = await pc.createOffer({});
        await pc.setLocalDescription(offer);
        await chatApi.enviarSenal(r.llamada_id, "offer", offer);
        iniciarPolling();
      } catch (err) {
        toast.show(mensajeErrorMedia(err), "error");
        // El registro de la llamada ya se creó en el backend antes de que fallara el
        // micrófono: si no la finalizamos, el receptor la vería sonar 30s sin que nadie
        // vaya a contestar de este lado.
        if (llamadaIdRef.current) await chatApi.finalizarLlamada(llamadaIdRef.current, 0).catch(() => {});
        limpiarLlamada();
      }
    },
    [iniciarPolling, limpiarLlamada, toast],
  );

  const aceptar = useCallback(async () => {
    Vibration.cancel();
    const llamadaId = llamadaIdRef.current;
    if (!llamadaId) return;
    const webrtc = getWebRTC();
    if (!webrtc) {
      toast.show(SIN_DEV_BUILD, "error");
      await chatApi.responderLlamada(llamadaId, false).catch(() => {});
      limpiarLlamada();
      return;
    }
    try {
      const stream = await webrtc.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream as unknown as MediaStream;
      const pc = crearPeerConnection(llamadaId, webrtc);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream as unknown as MediaStream));
      await chatApi.responderLlamada(llamadaId, true);
      lastSignalIdRef.current = 0;
      iniciarPolling();
    } catch (err) {
      toast.show(mensajeErrorMedia(err), "error");
      // Avisamos que rechazamos: si no, quien llamó se queda esperando una respuesta que
      // nunca va a llegar porque de este lado nunca se armó la conexión.
      await chatApi.responderLlamada(llamadaId, false).catch(() => {});
      limpiarLlamada();
    }
  }, [iniciarPolling, limpiarLlamada, toast]);

  const rechazar = useCallback(() => {
    Vibration.cancel();
    const llamadaId = llamadaIdRef.current;
    if (llamadaId) chatApi.responderLlamada(llamadaId, false).catch(() => {});
    limpiarLlamada();
  }, [limpiarLlamada]);

  const colgar = useCallback(() => {
    const llamadaId = llamadaIdRef.current;
    if (llamadaId) {
      chatApi.enviarSenal(llamadaId, "hangup", {}).catch(() => {});
      chatApi.finalizarLlamada(llamadaId, duracion).catch(() => {});
    }
    limpiarLlamada();
  }, [duracion, limpiarLlamada]);

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMuted((m) => !m);
  };

  // Detección global de llamadas entrantes -- corre mientras haya sesión, sin importar en
  // qué pantalla esté el usuario (mismo criterio que la versión web). Esto sí funciona en
  // Expo Go (es solo REST) -- lo único que necesita el dev build nativo es aceptar/iniciar.
  useEffect(() => {
    if (!usuario) return;
    const tick = () => {
      if (estadoRef.current !== "idle") return;
      chatApi
        .llamadasEntrantes()
        .then((r) => {
          if (!r.llamada || estadoRef.current !== "idle") return;
          llamadaIdRef.current = r.llamada.id;
          lastSignalIdRef.current = 0;
          setOtro({ id: r.llamada.emisor_id, nombre: r.llamada.nombre, foto_perfil: r.llamada.foto_perfil });
          setEstado("entrante");
          Vibration.vibrate(PATRON_TIMBRE, true);
        })
        .catch(() => {});
    };
    incomingPollRef.current = setInterval(tick, 2500);
    return () => {
      if (incomingPollRef.current) clearInterval(incomingPollRef.current);
    };
  }, [usuario]);

  useEffect(() => () => limpiarLlamada(), [limpiarLlamada]);

  const value: CallContextValue = { estado, otro, muted, duracion, iniciar, aceptar, rechazar, colgar, toggleMute };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall debe usarse dentro de CallProvider");
  return ctx;
}
