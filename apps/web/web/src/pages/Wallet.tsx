import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, CreditCard, Plus, Trash, Wallet as WalletIcon } from "@phosphor-icons/react";
import { walletApi, ApiError } from "../lib/api";
import type { Retiro, WalletMovimiento } from "../lib/types";
import { money, formatDateTime } from "../lib/format";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Sheet } from "../components/ui/Sheet";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { BackButton } from "../components/ui/BackButton";
import { NfcTokenInput } from "../components/domain/NfcTokenInput";

const LABELS: Record<WalletMovimiento["tipo"], string> = {
  venta: "Venta",
  entrega: "Entrega completada",
  reembolso: "Reembolso",
  retiro_solicitado: "Retiro solicitado",
  retiro_rechazado: "Retiro rechazado (devuelto)",
  retiro_nfc: "Retiro con tarjeta NFC",
};

const METODO_LABELS: Record<string, string> = {
  transferencia: "Transferencia bancaria",
  tigo_money: "Tigo Money",
  deposito: "Depósito",
  nfc: "Tarjeta NFC",
};

interface TarjetaNfc {
  id: number;
  alias: string | null;
  created_at: string;
}

export function Wallet() {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [pendientes, setPendientes] = useState(0);
  const [movimientos, setMovimientos] = useState<WalletMovimiento[]>([]);
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [tarjetas, setTarjetas] = useState<TarjetaNfc[]>([]);
  const [retiroOpen, setRetiroOpen] = useState(false);
  const [retiroNfcOpen, setRetiroNfcOpen] = useState(false);
  const [vincularOpen, setVincularOpen] = useState(false);
  const toast = useToast();

  const cargar = () => {
    walletApi.saldo().then((r) => {
      setSaldo(r.saldo);
      setPendientes(r.retiros_pendientes);
      setMovimientos(r.movimientos);
    });
    walletApi.misRetiros().then((r) => setRetiros(r.retiros)).catch(() => {});
    walletApi.misTarjetas().then((r) => setTarjetas(r.tarjetas)).catch(() => {});
  };

  useEffect(cargar, []);

  const quitarTarjeta = async (id: number) => {
    try {
      await walletApi.desvincularTarjeta(id);
      setTarjetas((prev) => prev.filter((t) => t.id !== id));
      toast.show("Tarjeta desvinculada", "info");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo quitar la tarjeta.", "error");
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <BackButton />
        <h1 style={{ fontSize: 22 }}>Billetera</h1>
      </div>

      <div className="glow-mesh" style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 24 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Saldo disponible</div>
        {saldo === null ? (
          <Skeleton height={40} width={160} style={{ marginTop: 8 }} />
        ) : (
          <div className="tabular" style={{ fontSize: 34, fontWeight: 800, marginTop: 6 }}>
            {money(saldo)}
          </div>
        )}
        {pendientes > 0 && (
          <div className="tabular" style={{ fontSize: 12, color: "var(--warn)", marginTop: 4 }}>
            {money(pendientes)} en retiros pendientes
          </div>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <Button onClick={() => setRetiroOpen(true)} disabled={!saldo}>
            Solicitar retiro
          </Button>
          <Button variant="secondary" onClick={() => setRetiroNfcOpen(true)} disabled={!saldo || tarjetas.length === 0}>
            <CreditCard size={16} /> Retirar con tarjeta NFC
          </Button>
        </div>
        {saldo !== null && !!saldo && tarjetas.length === 0 && (
          <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>Vincula una tarjeta NFC abajo para poder retirar con solo acercarla.</p>
        )}
      </div>

      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 style={{ fontSize: 13.5 }}>Tarjeta NFC</h2>
          <button onClick={() => setVincularOpen(true)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "var(--cyan)" }}>
            <Plus size={14} weight="bold" /> Vincular tarjeta
          </button>
        </div>
        {tarjetas.length === 0 ? (
          <EmptyState icon={<CreditCard size={22} />} title="Sin tarjetas vinculadas" description="Vincula una tarjeta física con chip NFC para retirar solo con acercarla al teléfono." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tarjetas.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: "var(--radius-sm)", background: "var(--surface-1)", border: "1px solid var(--border)" }}>
                <span style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--cyan-bg)", color: "var(--cyan)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <CreditCard size={15} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.alias || "Tarjeta sin nombre"}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Vinculada el {formatDateTime(t.created_at)}</div>
                </div>
                <button onClick={() => quitarTarjeta(t.id)} aria-label="Quitar tarjeta" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 6 }}>
                  <Trash size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {retiros.length > 0 && (
        <section>
          <h2 style={{ fontSize: 13.5, marginBottom: 10 }}>Retiros</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {retiros.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: 12, borderRadius: "var(--radius-sm)", background: "var(--surface-1)", border: "1px solid var(--border)", fontSize: 13 }}>
                <span>
                  {METODO_LABELS[r.metodo] ?? r.metodo} · <span style={{ textTransform: "capitalize", color: "var(--text-muted)" }}>{r.estado}</span>
                </span>
                <span className="tabular" style={{ fontWeight: 700 }}>{money(r.monto)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 style={{ fontSize: 13.5, marginBottom: 10 }}>Movimientos</h2>
        {movimientos.length === 0 ? (
          <EmptyState icon={<WalletIcon size={22} />} title="Sin movimientos todavía" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {movimientos.map((m) => {
              const positivo = m.monto >= 0;
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: "var(--radius-sm)", background: "var(--surface-1)", border: "1px solid var(--border)" }}>
                  <span style={{ width: 30, height: 30, borderRadius: "50%", background: positivo ? "var(--ok-bg)" : "var(--danger-bg)", color: positivo ? "var(--ok)" : "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {positivo ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{LABELS[m.tipo] ?? m.tipo}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatDateTime(m.created_at)}</div>
                  </div>
                  <span className="tabular" style={{ fontWeight: 700, color: positivo ? "var(--ok)" : "var(--danger)" }}>
                    {positivo ? "+" : ""}
                    {money(m.monto)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <RetiroSheet open={retiroOpen} onClose={() => setRetiroOpen(false)} maxMonto={saldo ?? 0} onDone={() => { setRetiroOpen(false); cargar(); toast.show("Solicitud de retiro enviada", "success"); }} />
      <VincularTarjetaSheet open={vincularOpen} onClose={() => setVincularOpen(false)} onDone={() => { setVincularOpen(false); cargar(); }} />
      <RetiroNfcSheet open={retiroNfcOpen} onClose={() => setRetiroNfcOpen(false)} maxMonto={saldo ?? 0} onDone={() => { setRetiroNfcOpen(false); cargar(); }} />
    </div>
  );
}

function VincularTarjetaSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [alias, setAlias] = useState("");
  const [vinculando, setVinculando] = useState(false);
  const toast = useToast();

  const onToken = async (token: string) => {
    setVinculando(true);
    try {
      await walletApi.vincularTarjeta({ token, alias: alias.trim() || undefined });
      toast.show("Tarjeta vinculada", "success");
      setAlias("");
      onDone();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo vincular la tarjeta.", "error");
    } finally {
      setVinculando(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Vincular tarjeta NFC">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
          Graba un código único en el chip de tu tarjeta con la app <strong>NFC Tools</strong> y luego acércala aquí para vincularla a tu cuenta.
        </p>
        <Input label="Nombre de la tarjeta (opcional)" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="ej. Mi tarjeta SVGo" />
        <NfcTokenInput onToken={onToken} disabled={vinculando} />
      </div>
    </Sheet>
  );
}

function RetiroNfcSheet({ open, onClose, maxMonto, onDone }: { open: boolean; onClose: () => void; maxMonto: number; onDone: () => void }) {
  const [monto, setMonto] = useState("");
  const [procesando, setProcesando] = useState(false);
  const toast = useToast();

  const montoValido = () => {
    const m = Number(monto);
    if (!m || m < 5) {
      toast.show("El retiro mínimo es $5.00.", "warning");
      return null;
    }
    if (m > maxMonto) {
      toast.show("No tienes saldo suficiente.", "warning");
      return null;
    }
    return m;
  };

  const onToken = async (token: string) => {
    const m = montoValido();
    if (!m) return;
    setProcesando(true);
    try {
      const r = await walletApi.retiroNfc({ token, monto: m });
      toast.show(`¡Retiro de ${money(m)} autorizado! Nuevo saldo: ${money(r.nuevo_saldo)}`, "success");
      setMonto("");
      onDone();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo procesar el retiro.", "error");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Retirar con tarjeta NFC">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Input label="Monto a retirar" type="number" min={5} step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Mínimo $5.00" hint={`Disponible: ${money(maxMonto)}`} />
        <NfcTokenInput onToken={onToken} disabled={procesando} />
      </div>
    </Sheet>
  );
}

function RetiroSheet({ open, onClose, maxMonto, onDone }: { open: boolean; onClose: () => void; maxMonto: number; onDone: () => void }) {
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("transferencia");
  const [cuenta, setCuenta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  const enviar = async () => {
    const m = Number(monto);
    if (!m || m < 5) return toast.show("El retiro mínimo es $5.00.", "warning");
    if (m > maxMonto) return toast.show("No tienes saldo suficiente.", "warning");
    if (!cuenta.trim()) return toast.show("Indica los datos de tu cuenta.", "warning");
    setEnviando(true);
    try {
      await walletApi.solicitarRetiro({ monto: m, metodo, datos_cuenta: cuenta });
      setMonto("");
      setCuenta("");
      onDone();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo solicitar el retiro.", "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Solicitar retiro">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Input label="Monto" type="number" min={5} step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Mínimo $5.00" hint={`Disponible: ${money(maxMonto)}`} />
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Método</label>
          <select value={metodo} onChange={(e) => setMetodo(e.target.value)} style={{ width: "100%", height: 44, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", marginTop: 6, padding: "0 12px", fontSize: 14, background: "var(--surface-1)" }}>
            <option value="transferencia">Transferencia bancaria</option>
            <option value="tigo_money">Tigo Money</option>
            <option value="deposito">Depósito</option>
          </select>
        </div>
        <Input label="Datos de la cuenta" value={cuenta} onChange={(e) => setCuenta(e.target.value)} placeholder="Nombre y número de cuenta" />
        <Button fullWidth onClick={enviar} loading={enviando}>
          Enviar solicitud
        </Button>
      </div>
    </Sheet>
  );
}
