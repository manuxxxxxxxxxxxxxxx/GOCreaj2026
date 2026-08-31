import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Money, PaypalLogo, Plus, Rocket, Truck } from "@phosphor-icons/react";
import { carritoApi, direccionesApi, ApiError } from "../lib/api";
import type { Cupon, DireccionUsuario, MetodoPago } from "../lib/types";
import { money } from "../lib/format";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";

type MetodoUI = "efectivo" | "tarjeta" | "paypal";

export function Checkout() {
  const { items, total, refrescar } = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  const [direcciones, setDirecciones] = useState<DireccionUsuario[] | null>(null);
  const [direccionId, setDireccionId] = useState<number | null>(null);
  const [metodosGuardados, setMetodosGuardados] = useState<MetodoPago[]>([]);
  const [metodo, setMetodo] = useState<MetodoUI>("efectivo");
  const [envioModo, setEnvioModo] = useState<"estandar" | "express">("estandar");
  const [metodoPagoId, setMetodoPagoId] = useState<number | null>(null);
  const [tarjetaNumero, setTarjetaNumero] = useState("");
  const [tarjetaExp, setTarjetaExp] = useState("");
  const [tarjetaCvv, setTarjetaCvv] = useState("");
  const [guardarTarjeta, setGuardarTarjeta] = useState(false);
  const [paypal2fa, setPaypal2fa] = useState("");
  const [efectivoPagaCon, setEfectivoPagaCon] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cupon: { cupon: Cupon; descuento: number } | null = (() => {
    try {
      const raw = sessionStorage.getItem("gocreaj_cupon");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    direccionesApi.listar().then((r) => {
      setDirecciones(r.direcciones);
      const principal = r.direcciones.find((d) => d.es_principal) ?? r.direcciones[0];
      if (principal) setDireccionId(principal.id);
    });
    carritoApi.metodosListar().then((r) => setMetodosGuardados(r.metodos));
  }, []);

  const direccion = direcciones?.find((d) => d.id === direccionId) ?? null;
  const costoEnvio = envioModo === "express" ? 4.99 : 2.5;
  const descuento = cupon?.descuento ?? 0;
  const totalFinal = Math.max(0, total - descuento) + costoEnvio;

  const confirmar = async () => {
    if (!direccion) return toast.show("Selecciona una dirección de entrega.", "warning");
    if (metodo === "tarjeta" && !metodoPagoId) {
      const numero = tarjetaNumero.replace(/\D/g, "");
      if (numero.length < 13 || tarjetaCvv.length < 3 || !/^\d{2}\/\d{2}$/.test(tarjetaExp)) {
        return toast.show("Revisa los datos de la tarjeta.", "warning");
      }
    }
    if (metodo === "paypal" && !paypal2fa.trim()) return toast.show("Ingresa el código 2FA de PayPal.", "warning");

    setEnviando(true);
    try {
      const res = await carritoApi.checkout({
        metodo_pago: metodo,
        direccion_entrega: `${direccion.direccion}${direccion.referencia ? ", " + direccion.referencia : ""}`,
        lat: direccion.lat ?? undefined,
        lng: direccion.lng ?? undefined,
        municipio: direccion.municipio,
        departamento: direccion.departamento,
        metodo_pago_id: metodoPagoId ?? undefined,
        tarjeta_numero: metodo === "tarjeta" && !metodoPagoId ? tarjetaNumero : undefined,
        tarjeta_cvv: metodo === "tarjeta" && !metodoPagoId ? tarjetaCvv : undefined,
        tarjeta_exp: metodo === "tarjeta" && !metodoPagoId ? tarjetaExp : undefined,
        guardar_tarjeta: metodo === "tarjeta" && !metodoPagoId ? guardarTarjeta : undefined,
        paypal_codigo_2fa: metodo === "paypal" ? paypal2fa : undefined,
        efectivo_paga_con: metodo === "efectivo" && efectivoPagaCon ? Number(efectivoPagaCon) : undefined,
        envio_modo: envioModo,
        cupon_codigo: cupon?.cupon.codigo,
      });
      sessionStorage.removeItem("gocreaj_cupon");
      await refrescar();
      toast.show("Pedido realizado con éxito", "success");
      navigate(`/pedidos/${res.pedidos[0]}`);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo completar el pedido.", "error");
    } finally {
      setEnviando(false);
    }
  };

  if (items.length === 0) {
    navigate("/carrito", { replace: true });
    return null;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 28, alignItems: "start", maxWidth: 900 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <h1 style={{ fontSize: 22 }}>Checkout</h1>

        <section>
          <h2 style={{ fontSize: 14, marginBottom: 10 }}>Dirección de entrega</h2>
          {direcciones === null ? (
            <Skeleton height={80} />
          ) : direcciones.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              No tienes direcciones guardadas.{" "}
              <button onClick={() => navigate("/direcciones")} style={{ color: "var(--cyan)", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
                Agregar una
              </button>
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {direcciones.map((d) => (
                <label
                  key={d.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    padding: 12,
                    border: `1px solid ${direccionId === d.id ? "var(--cyan)" : "var(--border)"}`,
                    borderRadius: "var(--radius-md)",
                    background: direccionId === d.id ? "var(--cyan-bg)" : "var(--surface-1)",
                    cursor: "pointer",
                  }}
                >
                  <input type="radio" name="direccion" checked={direccionId === d.id} onChange={() => setDireccionId(d.id)} style={{ marginTop: 3 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{d.alias}</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                      {d.direccion}, {d.municipio}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: 14, marginBottom: 10 }}>Modo de envío</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <OptionCard active={envioModo === "estandar"} onClick={() => setEnvioModo("estandar")} icon={<Truck size={18} />} title="Estándar" subtitle={money(2.5)} />
            <OptionCard active={envioModo === "express"} onClick={() => setEnvioModo("express")} icon={<Rocket size={18} />} title="Express" subtitle={money(4.99)} />
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 14, marginBottom: 10 }}>Método de pago</h2>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <OptionCard active={metodo === "efectivo"} onClick={() => setMetodo("efectivo")} icon={<Money size={18} />} title="Efectivo" subtitle="Contra entrega" />
            <OptionCard active={metodo === "tarjeta"} onClick={() => setMetodo("tarjeta")} icon={<CreditCard size={18} />} title="Tarjeta" subtitle="Crédito o débito" />
            <OptionCard active={metodo === "paypal"} onClick={() => setMetodo("paypal")} icon={<PaypalLogo size={18} />} title="PayPal" subtitle="Con 2FA" />
          </div>

          {metodo === "efectivo" && (
            <Input label="¿Con cuánto pagas? (opcional)" type="number" min={0} step="0.01" value={efectivoPagaCon} onChange={(e) => setEfectivoPagaCon(e.target.value)} placeholder={money(totalFinal)} hint="Así el repartidor lleva tu cambio listo." />
          )}

          {metodo === "tarjeta" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {metodosGuardados.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {metodosGuardados.map((m) => (
                    <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, border: `1px solid ${metodoPagoId === m.id ? "var(--cyan)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
                      <input type="radio" name="metodo_guardado" checked={metodoPagoId === m.id} onChange={() => setMetodoPagoId(m.id)} />
                      <CreditCard size={16} />
                      <span style={{ fontSize: 13, textTransform: "capitalize" }}>
                        {m.marca} •••• {m.ultimos4}
                      </span>
                      <span className="tabular" style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
                        {String(m.exp_mes).padStart(2, "0")}/{String(m.exp_anio).slice(-2)}
                      </span>
                    </label>
                  ))}
                  <label style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, border: `1px solid ${metodoPagoId === null ? "var(--cyan)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
                    <input type="radio" name="metodo_guardado" checked={metodoPagoId === null} onChange={() => setMetodoPagoId(null)} />
                    <Plus size={16} />
                    <span style={{ fontSize: 13 }}>Usar una tarjeta nueva</span>
                  </label>
                </div>
              )}
              {metodoPagoId === null && (
                <>
                  <Input label="Número de tarjeta" inputMode="numeric" autoComplete="cc-number" value={tarjetaNumero} onChange={(e) => setTarjetaNumero(e.target.value)} placeholder="4242 4242 4242 4242" />
                  <div style={{ display: "flex", gap: 10 }}>
                    <Input label="Vencimiento" autoComplete="cc-exp" value={tarjetaExp} onChange={(e) => setTarjetaExp(e.target.value)} placeholder="MM/AA" style={{ maxWidth: 120 }} />
                    <Input label="CVV" autoComplete="cc-csc" inputMode="numeric" value={tarjetaCvv} onChange={(e) => setTarjetaCvv(e.target.value)} placeholder="123" style={{ maxWidth: 100 }} />
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                    <input type="checkbox" checked={guardarTarjeta} onChange={(e) => setGuardarTarjeta(e.target.checked)} /> Guardar esta tarjeta para la próxima
                  </label>
                </>
              )}
            </div>
          )}

          {metodo === "paypal" && <Input label="Código 2FA de PayPal" inputMode="numeric" value={paypal2fa} onChange={(e) => setPaypal2fa(e.target.value)} placeholder="123456" />}
        </section>
      </div>

      <div style={{ position: "sticky", top: 80, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 15 }}>Total a pagar</h2>
        <Row label="Subtotal" value={money(total)} />
        {cupon && <Row label={`Cupón ${cupon.cupon.codigo}`} value={`− ${money(descuento)}`} tone="var(--ok)" />}
        <Row label="Envío" value={money(costoEnvio)} />
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontWeight: 700 }}>Total</span>
          <span className="tabular" style={{ fontSize: 20, fontWeight: 800 }}>
            {money(totalFinal)}
          </span>
        </div>
        <Button size="lg" fullWidth hero onClick={confirmar} loading={enviando}>
          Confirmar pedido
        </Button>
      </div>
    </div>
  );
}

function OptionCard({ active, onClick, icon, title, subtitle }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <button
      onClick={onClick}
      style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 10px", borderRadius: "var(--radius-md)", border: `1px solid ${active ? "var(--cyan)" : "var(--border)"}`, background: active ? "var(--cyan-bg)" : "var(--surface-1)", color: active ? "var(--cyan)" : "var(--text-primary)", cursor: "pointer" }}
    >
      {icon}
      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{title}</span>
      <span className="tabular" style={{ fontSize: 11, color: "var(--text-muted)" }}>
        {subtitle}
      </span>
    </button>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "var(--text-secondary)" }}>
      <span>{label}</span>
      <span className="tabular" style={{ color: tone, fontWeight: tone ? 700 : undefined }}>
        {value}
      </span>
    </div>
  );
}
