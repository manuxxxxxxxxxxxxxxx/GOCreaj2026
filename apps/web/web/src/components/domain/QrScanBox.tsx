import { useEffect, useRef, useState } from "react";
import { CameraRotate } from "@phosphor-icons/react";
import { useToast } from "../../context/ToastContext";

export function QrScanBox({ valor, onChange, hint }: { valor: string; onChange: (v: string) => void; hint?: string }) {
  const [soportado, setSoportado] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [escaneando, setEscaneando] = useState(false);
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{hint ?? "Escanea el código QR, o pégalo abajo."}</p>
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
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Código"
        style={{ height: 44, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: "0 14px", fontSize: 14, fontFamily: "var(--font-mono)" }}
      />
    </div>
  );
}
