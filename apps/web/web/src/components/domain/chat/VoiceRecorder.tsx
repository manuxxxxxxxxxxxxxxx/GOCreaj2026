import { useEffect, useRef, useState } from "react";
import { CaretUp, LockSimple, Microphone, Pause, PaperPlaneTilt, Play, Trash } from "@phosphor-icons/react";
import { useToast } from "../../../context/ToastContext";

interface Props {
  onSend: (dataUri: string, duracionSeg: number) => void;
  disabled?: boolean;
}

type Fase = "idle" | "sosteniendo" | "bloqueada";

const UMBRAL_BLOQUEO_PX = 64;
const MIN_SOSTENER_MS = 300;
const MIME_CANDIDATOS = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

function elegirMimeType(): string {
  for (const m of MIME_CANDIDATOS) {
    if (window.MediaRecorder?.isTypeSupported?.(m)) return m;
  }
  return "";
}

function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatoTiempo(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VoiceRecorder({ onSend, disabled }: Props) {
  const toast = useToast();
  const [fase, setFase] = useState<Fase>("idle");
  const [pausado, setPausado] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [niveles, setNiveles] = useState<number[]>(Array(24).fill(4));

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startYRef = useRef(0);
  const startTsRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const canceladaRef = useRef(false);
  const faseRef = useRef<Fase>("idle");

  useEffect(() => {
    faseRef.current = fase;
  }, [fase]);

  const detenerVisualizacion = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
  };

  const detenerTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const limpiarTodo = () => {
    detenerTimer();
    detenerVisualizacion();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setSegundos(0);
    setPausado(false);
    setNiveles(Array(24).fill(4));
    setFase("idle");
  };

  const visualizar = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const bandas = 24;
      const paso = Math.floor(data.length / bandas);
      const nuevos: number[] = [];
      for (let i = 0; i < bandas; i++) {
        const v = data[i * paso] ?? 0;
        nuevos.push(Math.max(4, Math.round((v / 255) * 26)));
      }
      setNiveles(nuevos);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const iniciarGrabacion = async (esMouse: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      canceladaRef.current = false;

      const mimeType = elegirMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      recorderRef.current = recorder;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      visualizar();

      startTsRef.current = Date.now();
      detenerTimer();
      timerRef.current = window.setInterval(() => {
        setSegundos((s) => s + 1);
      }, 1000);

      setFase(esMouse ? "bloqueada" : "sosteniendo");
    } catch {
      toast.show("No se pudo acceder al micrófono. Revisa los permisos.", "error");
      limpiarTodo();
    }
  };

  const cancelarGrabacion = () => {
    canceladaRef.current = true;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    limpiarTodo();
  };

  const detenerYEnviar = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      limpiarTodo();
      return;
    }
    const duracion = segundos;
    recorder.onstop = async () => {
      if (canceladaRef.current) return;
      const tipo = recorder.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: tipo });
      if (blob.size < 300) {
        toast.show("La nota de voz fue muy corta.", "info");
      } else {
        const dataUri = await blobABase64(blob);
        onSend(dataUri, Math.max(1, duracion));
      }
      limpiarTodo();
    };
    recorder.stop();
  };

  const togglePausa = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (pausado) {
      recorder.resume();
      timerRef.current = window.setInterval(() => setSegundos((s) => s + 1), 1000);
      visualizar();
    } else {
      recorder.pause();
      detenerTimer();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    setPausado((p) => !p);
  };

  useEffect(() => () => limpiarTodo(), []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || fase !== "idle") return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointer ya no está activo (algunos navegadores/dispositivos) -- seguimos
      // igual, solo perdemos la captura automática si el cursor sale del botón.
    }
    startYRef.current = e.clientY;
    iniciarGrabacion(e.pointerType === "mouse");
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (faseRef.current !== "sosteniendo") return;
    const delta = startYRef.current - e.clientY;
    if (delta > UMBRAL_BLOQUEO_PX) setFase("bloqueada");
  };

  const onPointerUp = () => {
    if (faseRef.current !== "sosteniendo") return;
    const sostenido = Date.now() - startTsRef.current;
    if (sostenido < MIN_SOSTENER_MS) {
      toast.show("Mantén presionado para grabar, suelta para enviar.", "info");
      cancelarGrabacion();
    } else {
      detenerYEnviar();
    }
  };

  if (fase === "idle") {
    return (
      <button
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerMove={onPointerMove}
        onPointerCancel={cancelarGrabacion}
        disabled={disabled}
        aria-label="Mantén presionado para grabar una nota de voz"
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "var(--cyan)",
          color: "var(--cyan-ink)",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          touchAction: "none",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Microphone size={17} weight="fill" />
      </button>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--surface-1)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 12px",
        borderRadius: "inherit",
        zIndex: 4,
      }}
    >
      <button
        onClick={cancelarGrabacion}
        aria-label="Descartar grabación"
        style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "var(--danger-bg)", color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
      >
        <Trash size={16} />
      </button>

      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--danger)", flexShrink: 0, animation: "icon-pulse 1.4s ease-in-out infinite" }} />
      <span className="tabular" style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, minWidth: 34 }}>
        {formatoTiempo(segundos)}
      </span>

      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 2, height: 30, overflow: "hidden" }} aria-hidden="true">
        {niveles.map((h, i) => (
          <span
            key={i}
            style={{
              width: 2.5,
              height: 26,
              borderRadius: 2,
              background: "var(--cyan)",
              opacity: pausado ? 0.35 : 0.85,
              transform: `scaleY(${(pausado ? 4 : h) / 26})`,
              transformOrigin: "bottom",
              transition: "transform 90ms linear",
            }}
          />
        ))}
      </div>

      {fase === "sosteniendo" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", fontSize: 11, flexShrink: 0 }}>
          <CaretUp size={13} />
          <LockSimple size={13} />
        </div>
      ) : (
        <button
          onClick={togglePausa}
          aria-label={pausado ? "Reanudar" : "Pausar"}
          style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
        >
          {pausado ? <Play size={14} weight="fill" /> : <Pause size={14} weight="fill" />}
        </button>
      )}

      <button
        onClick={detenerYEnviar}
        aria-label="Enviar nota de voz"
        style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: "var(--cyan)", color: "var(--cyan-ink)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
      >
        <PaperPlaneTilt size={17} weight="fill" />
      </button>
    </div>
  );
}
