import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Microphone, MicrophoneSlash, Phone, PhoneDisconnect, VideoCamera, VideoCameraSlash } from "@phosphor-icons/react";
import { useCall } from "../../../context/CallContext";
import { Avatar } from "../../ui/Avatar";

function formatoDuracion(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Se monta una sola vez en la raíz de la app: aparece sobre cualquier página en cuanto hay una llamada. */
export function CallOverlay() {
  const { estado, tipo, otro, localStream, remoteStream, muted, camaraApagada, duracion, aceptar, rechazar, colgar, toggleMute, toggleCamara } = useCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  if (estado === "idle") return null;

  const esVideo = tipo === "video";

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: esVideo && estado === "activa" ? "#000" : "linear-gradient(180deg, var(--surface-0), var(--surface-1))",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        animation: "fade-in var(--dur-base) var(--ease-out) both",
      }}
    >
      {esVideo && estado === "activa" && (
        <video ref={remoteVideoRef} autoPlay playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#000" }} />
      )}
      {!esVideo && <audio ref={remoteAudioRef} autoPlay />}

      {esVideo && estado === "activa" && localStream && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{ position: "absolute", top: 20, right: 20, width: 130, height: 174, borderRadius: "var(--radius-md)", objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)", boxShadow: "var(--shadow-lg)", opacity: camaraApagada ? 0.2 : 1 }}
        />
      )}

      {(!esVideo || estado !== "activa") && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, position: "relative", zIndex: 1 }}>
          <div style={{ position: "relative" }}>
            {estado === "entrante" && (
              <span
                aria-hidden="true"
                style={{ position: "absolute", inset: -14, borderRadius: "50%", border: "2px solid var(--cyan)", animation: "icon-pulse 1.6s ease-in-out infinite" }}
              />
            )}
            <Avatar nombre={otro?.nombre ?? "?"} foto={otro?.foto_perfil ?? null} size={104} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 21 }}>{otro?.nombre}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              {estado === "entrante" && `Llamada de ${esVideo ? "video" : "voz"} entrante…`}
              {estado === "saliente" && "Llamando…"}
              {estado === "activa" && <span className="tabular">{formatoDuracion(duracion)}</span>}
            </div>
          </div>
        </div>
      )}

      {esVideo && estado === "activa" && (
        <div style={{ position: "absolute", bottom: 96, left: "50%", transform: "translateX(-50%)", color: "#fff", textAlign: "center", zIndex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{otro?.nombre}</div>
          <div className="tabular" style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>
            {formatoDuracion(duracion)}
          </div>
        </div>
      )}

      <div style={{ position: "absolute", bottom: 40, display: "flex", alignItems: "center", gap: 20, zIndex: 1 }}>
        {estado === "entrante" ? (
          <>
            <RedondoBtn tono="danger" onClick={rechazar} label="Rechazar">
              <PhoneDisconnect size={24} weight="fill" />
            </RedondoBtn>
            <RedondoBtn tono="ok" onClick={aceptar} label="Aceptar">
              <Phone size={24} weight="fill" />
            </RedondoBtn>
          </>
        ) : (
          <>
            {estado === "activa" && (
              <RedondoBtn tono={muted ? "activo" : "neutro"} onClick={toggleMute} label={muted ? "Activar micrófono" : "Silenciar"} translucido={esVideo}>
                {muted ? <MicrophoneSlash size={20} /> : <Microphone size={20} />}
              </RedondoBtn>
            )}
            {estado === "activa" && esVideo && (
              <RedondoBtn tono={camaraApagada ? "activo" : "neutro"} onClick={toggleCamara} label={camaraApagada ? "Activar cámara" : "Apagar cámara"} translucido>
                {camaraApagada ? <VideoCameraSlash size={20} /> : <VideoCamera size={20} />}
              </RedondoBtn>
            )}
            <RedondoBtn tono="danger" onClick={colgar} label="Colgar" grande>
              <PhoneDisconnect size={24} weight="fill" />
            </RedondoBtn>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function RedondoBtn({
  children,
  onClick,
  label,
  tono = "neutro",
  grande,
  translucido,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  tono?: "neutro" | "danger" | "ok" | "activo";
  grande?: boolean;
  translucido?: boolean;
}) {
  const bg = tono === "danger" ? "var(--danger)" : tono === "ok" ? "var(--ok)" : tono === "activo" ? "var(--cyan)" : translucido ? "rgba(255,255,255,0.16)" : "var(--surface-2)";
  const color = tono === "danger" || tono === "ok" ? "#fff" : tono === "activo" ? "var(--cyan-ink)" : translucido ? "#fff" : "var(--text-primary)";
  const size = grande ? 62 : 52;
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: translucido ? "1px solid rgba(255,255,255,0.3)" : "none",
        background: bg,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {children}
    </button>
  );
}
