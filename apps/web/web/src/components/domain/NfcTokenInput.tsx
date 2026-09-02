import { useState } from "react";
import { CreditCard, Keyboard, Radio } from "@phosphor-icons/react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

type NdefRecord = { recordType?: string; encoding?: string; data?: DataView };
type NdefReadingEvent = { message: { records: NdefRecord[] }; serialNumber: string };
interface NdefReaderLike {
  scan: () => Promise<void>;
  addEventListener: (type: "reading" | "readingerror", cb: (e: NdefReadingEvent) => void) => void;
}

function crearLectorNfc(): NdefReaderLike | null {
  const Ctor = (window as unknown as { NDEFReader?: new () => NdefReaderLike }).NDEFReader;
  return Ctor ? new Ctor() : null;
}

type Estado = { tipo: "inactivo" | "esperando" | "error"; mensaje?: string };

/**
 * Lee el token de una tarjeta NFC (Web NFC / NDEFReader, solo Chrome + Android con chip NFC)
 * y, como respaldo -- útil mientras no hay una tarjeta física a mano, o en cualquier
 * navegador/dispositivo sin soporte -- deja escribir el mismo código a mano.
 */
export function NfcTokenInput({ onToken, disabled }: { onToken: (token: string) => void; disabled?: boolean }) {
  const [estado, setEstado] = useState<Estado>({ tipo: "inactivo" });
  const [manual, setManual] = useState("");
  const [modoManual, setModoManual] = useState(false);

  const escanear = async () => {
    const lector = crearLectorNfc();
    if (!lector) {
      setEstado({ tipo: "error", mensaje: "Este navegador no soporta NFC. Usa Chrome en un Android con NFC, o escribe el código manualmente." });
      setModoManual(true);
      return;
    }
    try {
      await lector.scan();
      setEstado({ tipo: "esperando", mensaje: "Acerca la tarjeta a la parte trasera del teléfono…" });
      lector.addEventListener("reading", (e) => {
        const record = e.message.records[0];
        if (!record?.data) return;
        const decoder = new TextDecoder(record.encoding || "utf-8");
        const token = decoder.decode(record.data).trim();
        if (token) onToken(token);
      });
      lector.addEventListener("readingerror", () => {
        setEstado({ tipo: "error", mensaje: "No se pudo leer la tarjeta. Intenta de nuevo." });
      });
    } catch (err) {
      setEstado({ tipo: "error", mensaje: err instanceof Error ? err.message : "No se pudo activar el lector NFC." });
    }
  };

  const enviarManual = () => {
    const token = manual.trim();
    if (!token) return;
    onToken(token);
    setManual("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <button
        onClick={escanear}
        disabled={disabled || estado.tipo === "esperando"}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          padding: "28px 16px",
          borderRadius: "var(--radius-lg)",
          border: `1.5px dashed ${estado.tipo === "esperando" ? "var(--cyan)" : "var(--border)"}`,
          background: estado.tipo === "esperando" ? "var(--cyan-bg)" : "var(--surface-2)",
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "center",
        }}
      >
        {estado.tipo === "esperando" ? (
          <Radio size={30} weight="fill" color="var(--cyan)" className="nfc-pulse" />
        ) : (
          <CreditCard size={30} color="var(--text-muted)" />
        )}
        <span style={{ fontSize: 13.5, fontWeight: 700 }}>{estado.tipo === "esperando" ? "Esperando tarjeta…" : "Acercar tarjeta NFC"}</span>
        <span style={{ fontSize: 11.5, color: "var(--text-muted)", maxWidth: 260 }}>
          {estado.mensaje ?? "Requiere Chrome en un teléfono Android con NFC activado."}
        </span>
      </button>

      {!modoManual ? (
        <button
          onClick={() => setModoManual(true)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "var(--text-secondary)" }}
        >
          <Keyboard size={14} /> No tengo la tarjeta a mano — ingresar código manualmente
        </button>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <Input label="Código de la tarjeta" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="ej. CARD_TOKEN_VENDEDOR_1024" style={{ flex: 1 }} />
          <Button variant="secondary" onClick={enviarManual} disabled={disabled || !manual.trim()}>
            Usar
          </Button>
        </div>
      )}

      <style>{`
        @keyframes nfc-pulse-anim { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        .nfc-pulse { animation: nfc-pulse-anim 1.3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
