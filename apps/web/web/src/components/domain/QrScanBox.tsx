import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, CameraRotate, CheckCircle } from "@phosphor-icons/react";
import { useToast } from "../../context/ToastContext";
import { PinBoxInput } from "./PinBoxInput";

/** El mismo campo sirve para escanear el QR (siempre un token largo) o teclear el PIN de
 * respaldo de 6 dígitos (ver DESIGN.md "Flujo logístico", PARTE 2.A) -- se distingue solo
 * por la forma del valor, sin pedirle al usuario que elija un modo aparte. */
export function codigoDesdeValor(valor: string): { qr_token: string } | { pin: string } {
  const limpio = valor.trim();
  return /^\d{6}$/.test(limpio) ? { pin: limpio } : { qr_token: limpio };
}

export function QrScanBox({ valor, onChange, hint }: { valor: string; onChange: (v: string) => void; hint?: string }) {
  const [soportado, setSoportado] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [escaneando, setEscaneando] = useState(false);
  const [qrEscaneado, setQrEscaneado] = useState<string | null>(/^\d{6}$/.test(valor) ? null : valor || null);
  const scanningRef = useRef(false);
  const toast = useToast();

  useEffect(() => {
    setSoportado(typeof window !== "undefined" && "BarcodeDetector" in window);
    return () => {
      scanningRef.current = false;
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const iniciarCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanningRef.current = true;
      setEscaneando(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Detector = (window as any).BarcodeDetector;
      const detector = new Detector({ formats: ["qr_code"] });
      const tick = async () => {
        if (!scanningRef.current) return;
        if (!videoRef.current || videoRef.current.readyState < 2) {
          requestAnimationFrame(tick);
          return;
        }
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            onChange(codes[0].rawValue);
            setQrEscaneado(codes[0].rawValue);
            stream.getTracks().forEach((t) => t.stop());
            scanningRef.current = false;
            setEscaneando(false);
            return;
          }
        } catch {
          /* keep trying */
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {
      toast.show("No se pudo acceder a la cámara.", "error");
    }
  };

  const reiniciar = () => {
    setQrEscaneado(null);
    onChange("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{hint ?? "Escanea el código QR, o teclea el PIN de 6 dígitos."}</p>

      {qrEscaneado ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", borderRadius: "var(--radius-md)", border: "1.5px solid var(--ok)", background: "var(--ok-bg)", padding: "28px 0" }}>
          <CheckCircle size={28} weight="fill" color="var(--ok-ink)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ok-ink)", marginTop: 8 }}>Código QR escaneado</span>
          <button
            onClick={reiniciar}
            style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}
          >
            <ArrowCounterClockwise size={13} /> Escanear de nuevo
          </button>
        </div>
      ) : (
        <>
          {soportado && (
            <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--surface-2)", aspectRatio: "4/3", position: "relative" }}>
              <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {!escaneando && (
                <button
                  onClick={iniciarCamara}
                  style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(8,11,20,0.5)", color: "#fff", border: "none", cursor: "pointer" }}
                >
                  <CameraRotate size={26} />
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>Activar cámara</span>
                </button>
              )}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>o el PIN</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <PinBoxInput value={valor} onChange={onChange} />
        </>
      )}
    </div>
  );
}
