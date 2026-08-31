import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { chatApi } from "../lib/api";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

export type TipoLlamada = "voz" | "video";
export type EstadoLlamada = "idle" | "entrante" | "saliente" | "activa";

export interface OtroEnLlamada {
  id: number;
  nombre: string;
  foto_perfil: string | null;
}

interface CallContextValue {
  estado: EstadoLlamada;
  tipo: TipoLlamada;
  otro: OtroEnLlamada | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  camaraApagada: boolean;
  duracion: number;
  iniciar: (otro: OtroEnLlamada, tipo: TipoLlamada) => void;
  aceptar: () => void;
  rechazar: () => void;
  colgar: () => void;
  toggleMute: () => void;
  toggleCamara: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

// Solo STUN público -- sin TURN configurado. Dos personas en la misma red o
// con NAT simple conectan bien; NAT simétrico en ambos extremos puede fallar
// (limitación real del transporte, no del código de señalización).
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

/** Mensaje específico según por qué falló el acceso a micrófono/cámara, en vez de un genérico "revisa permisos". */
function mensajeErrorMedia(err: unknown, tipo: TipoLlamada): string {
  if (!window.isSecureContext) {
    return "Las llamadas requieren una conexión segura (HTTPS o localhost). Este sitio se está sirviendo sin HTTPS, así que el navegador bloquea el micrófono/cámara.";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Tu navegador no soporta llamadas de audio/video.";
  }
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Permiso de micrófono/cámara denegado. Habilítalo en la configuración del sitio y vuelve a intentar.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return tipo === "video" ? "No se encontró cámara o micrófono en este dispositivo." : "No se encontró micrófono en este dispositivo.";
  }
  if (name === "NotReadableError") {
    return "El micrófono/cámara ya está siendo usado por otra aplicación.";
  }
  return "No se pudo iniciar la llamada. Revisa los permisos de micrófono/cámara.";
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const toast = useToast();
  const [estado, setEstado] = useState<EstadoLlamada>("idle");
  const [tipo, setTipo] = useState<TipoLlamada>("voz");
  const [otro, setOtro] = useState<OtroEnLlamada | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [camaraApagada, setCamaraApagada] = useState(false);
  const [duracion, setDuracion] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const llamadaIdRef = useRef<number | null>(null);
  const lastSignalIdRef = useRef(0);
  const pollRef = useRef<number | null>(null);
  const incomingPollRef = useRef<number | null>(null);
  const durTimerRef = useRef<number | null>(null);
  const estadoRef = useRef<EstadoLlamada>("idle");
  const candidatosPendientesRef = useRef<RTCIceCandidateInit[]>([]);
  const ringCtxRef = useRef<AudioContext | null>(null);
  const ringTimerRef = useRef<number | null>(null);

  useEffect(() => {
    estadoRef.current = estado;
  }, [estado]);

  const detenerRingtone = () => {
    if (ringTimerRef.current) window.clearInterval(ringTimerRef.current);
    ringTimerRef.current = null;
    ringCtxRef.current?.close().catch(() => {});
    ringCtxRef.current = null;
  };

  const iniciarRingtone = () => {
    detenerRingtone();
    const ctx = new AudioContext();
    ringCtxRef.current = ctx;
    const beep = () => {
      if (ctx.state === "closed") return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.42);
    };
    beep();
    ringTimerRef.current = window.setInterval(beep, 1500);
  };

  const limpiarLlamada = useCallback(() => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = null;
    if (durTimerRef.current) window.clearInterval(durTimerRef.current);
    durTimerRef.current = null;
    detenerRingtone();
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach((t) => t.stop());
    llamadaIdRef.current = null;
    lastSignalIdRef.current = 0;
    candidatosPendientesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCamaraApagada(false);
    setDuracion(0);
    setOtro(null);
    setEstado("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream]);

  const iniciarDuracion = () => {
    if (durTimerRef.current) window.clearInterval(durTimerRef.current);
    durTimerRef.current = window.setInterval(() => setDuracion((d) => d + 1), 1000);
  };

  const procesarSenal = useCallback(async (tipoSenal: string, payload: unknown) => {
    const pc = pcRef.current;
    if (!pc) return;

    if (tipoSenal === "offer") {
      if (pc.currentRemoteDescription) return;
      await pc.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
      for (const c of candidatosPendientesRef.current) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      candidatosPendientesRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (llamadaIdRef.current) await chatApi.enviarSenal(llamadaIdRef.current, "answer", answer);
      setEstado("activa");
      iniciarDuracion();
    } else if (tipoSenal === "answer") {
      if (pc.currentRemoteDescription) return;
      await pc.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
      for (const c of candidatosPendientesRef.current) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      candidatosPendientesRef.current = [];
      setEstado("activa");
      iniciarDuracion();
    } else if (tipoSenal === "candidate") {
      const candidato = payload as RTCIceCandidateInit;
      if (pc.currentRemoteDescription) await pc.addIceCandidate(new RTCIceCandidate(candidato)).catch(() => {});
      else candidatosPendientesRef.current.push(candidato);
    } else if (tipoSenal === "hangup") {
      limpiarLlamada();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limpiarLlamada]);

  const iniciarPolling = useCallback(() => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
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

  const crearPeerConnection = (llamadaId: number) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pc.onicecandidate = (e) => {
      if (e.candidate) chatApi.enviarSenal(llamadaId, "candidate", e.candidate.toJSON()).catch(() => {});
    };
    pc.ontrack = (e) => setRemoteStream(e.streams[0] ?? null);
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") toast.show("Se perdió la conexión de la llamada.", "error");
    };
    pcRef.current = pc;
    return pc;
  };

  const iniciar = useCallback(async (otroInfo: OtroEnLlamada, tipoLlamada: TipoLlamada) => {
    setOtro(otroInfo);
    setTipo(tipoLlamada);
    setEstado("saliente");
    try {
      const r = await chatApi.iniciarLlamada(otroInfo.id, tipoLlamada);
      llamadaIdRef.current = r.llamada_id;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: tipoLlamada === "video" });
      setLocalStream(stream);
      const pc = crearPeerConnection(r.llamada_id);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await chatApi.enviarSenal(r.llamada_id, "offer", offer);
      iniciarPolling();
    } catch (err) {
      toast.show(mensajeErrorMedia(err, tipoLlamada), "error");
      // El registro de la llamada ya se creó en el backend (iniciarLlamada de arriba) antes de
      // que fallara el micrófono/cámara: si no la finalizamos, el receptor la vería como una
      // llamada entrante real durante 30s sin que nadie vaya a contestar del otro lado.
      if (llamadaIdRef.current) await chatApi.finalizarLlamada(llamadaIdRef.current, 0).catch(() => {});
      limpiarLlamada();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iniciarPolling, limpiarLlamada, toast]);

  const aceptar = useCallback(async () => {
    detenerRingtone();
    const llamadaId = llamadaIdRef.current;
    if (!llamadaId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: tipo === "video" });
      setLocalStream(stream);
      const pc = crearPeerConnection(llamadaId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await chatApi.responderLlamada(llamadaId, true);
      lastSignalIdRef.current = 0;
      iniciarPolling();
    } catch (err) {
      toast.show(mensajeErrorMedia(err, tipo), "error");
      // Avisamos que rechazamos: si no, quien llamó se queda esperando una respuesta
      // que nunca va a llegar porque de este lado nunca se armó la conexión.
      await chatApi.responderLlamada(llamadaId, false).catch(() => {});
      limpiarLlamada();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, iniciarPolling, limpiarLlamada, toast]);

  const rechazar = useCallback(() => {
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
    localStream?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMuted((m) => !m);
  };

  const toggleCamara = () => {
    localStream?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCamaraApagada((c) => !c);
  };

  // Detección global de llamadas entrantes -- corre mientras haya sesión,
  // sin importar en qué página esté el usuario.
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
          setTipo(r.llamada.tipo === "video" ? "video" : "voz");
          setOtro({ id: r.llamada.emisor_id, nombre: r.llamada.nombre, foto_perfil: r.llamada.foto_perfil });
          setEstado("entrante");
          iniciarRingtone();
        })
        .catch(() => {});
    };
    incomingPollRef.current = window.setInterval(tick, 2500);
    return () => {
      if (incomingPollRef.current) window.clearInterval(incomingPollRef.current);
    };
  }, [usuario]);

  useEffect(() => () => limpiarLlamada(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const value: CallContextValue = {
    estado,
    tipo,
    otro,
    localStream,
    remoteStream,
    muted,
    camaraApagada,
    duracion,
    iniciar,
    aceptar,
    rechazar,
    colgar,
    toggleMute,
    toggleCamara,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall debe usarse dentro de CallProvider");
  return ctx;
}
