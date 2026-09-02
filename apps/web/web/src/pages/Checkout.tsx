import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Money, PaypalLogo, Plus, Rocket, Storefront, Truck } from "@phosphor-icons/react";
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
  const { items, total, cargando: cargandoCart, refrescar } = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  const [direcciones, setDirecciones] = useState<DireccionUsuario[] | null>(null);
  const [direccionId, setDireccionId] = useState<number | null>(null);
  const [metodosGuardados, setMetodosGuardados] = useState<MetodoPago[]>([]);
  const [metodo, setMetodo] = useState<MetodoUI>("efectivo");
  const [tipoEntrega, setTipoEntrega] = useState<"domicilio" | "recogida">("domicilio");
  const [envioModo, setEnvioModo] = useState<"estandar" | "express">("estandar");
  const [notas, setNotas] = useState("");
  const [metodoPagoId, setMetodoPagoId] = useState<number | null>(null);
  const [tarjetaNumero, setTarjetaNumero] = useState("");
  const [tarjetaExp, setTarjetaExp] = useState("");
  const [tarjetaCvv, setTarjetaCvv] = useState("");
  const [guardarTarjeta, setGuardarTarjeta] = useState(false);
  const [paypal2fa, setPaypal2fa] = useState("");
  const [efectivoPagaCon, setEfectivoPagaCon] = useState("");
  const [enviando, setEnviando] = useState(false);
  const pedidoRealizadoRef = useRef(false);

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

  // El carrito puede tardar un tick en hidratarse desde CartContext al montar esta
  // página (ej. navegación directa a /checkout) -- redirigir en un efecto, no durante
  // el render, evita el falso positivo de "carrito vacío" en ese primer render.
  useEffect(() => {
    if (!pedidoRealizadoRef.current && !cargandoCart && items.length === 0) navigate("/carrito", { replace: true });
  }, [cargandoCart, items.length, navigate]);

  const direccion = direcciones?.find((d) => d.id === direccionId) ?? null;
  const esRecogida = tipoEntrega === "recogida";
  const costoEnvio = esRecogida ? 0 : envioModo === "express" ? 4.99 : 2.5;
  const descuento = cupon?.descuento ?? 0;
  const totalFinal = Math.max(0, total - descuento) + costoEnvio;
  const PICKUP_EFECTIVO_MAX = 20;
  const recogidaEfectivoBloqueado = esRecogida && metodo === "efectivo" && totalFinal > PICKUP_EFECTIVO_MAX;

  const confirmar = async () => {
    if (!esRecogida && !direccion) return toast.show("Selecciona una dirección de entrega.", "warning");
    if (recogidaEfectivoBloqueado) return toast.show(`Para recoger en tienda, pedidos de más de $${PICKUP_EFECTIVO_MAX} deben pagarse con tarjeta.`, "warning");
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
        tipo_entrega: tipoEntrega,
        direccion_entrega: direccion ? `${direccion.direccion}${direccion.referencia ? ", " + direccion.referencia : ""}` : undefined,
        lat: direccion?.lat ?? undefined,
        lng: direccion?.lng ?? undefined,
        municipio: direccion?.municipio,
        departamento: direccion?.departamento,
        metodo_pago_id: metodoPagoId ?? undefined,
        tarjeta_numero: metodo === "tarjeta" && !metodoPagoId ? tarjetaNumero : undefined,
        tarjeta_cvv: metodo === "tarjeta" && !metodoPagoId ? tarjetaCvv : undefined,
        tarjeta_exp: metodo === "tarjeta" && !metodoPagoId ? tarjetaExp : undefined,
        guardar_tarjeta: metodo === "tarjeta" && !metodoPagoId ? guardarTarjeta : undefined,
        paypal_codigo_2fa: metodo === "paypal" ? paypal2fa : undefined,
        efectivo_paga_con: metodo === "efectivo" && efectivoPagaCon ? Number(efectivoPagaCon) : undefined,
        envio_modo: envioModo,
        cupon_codigo: cupon?.cupon.codigo,
        notas: notas.trim() || undefined,
      });
      sessionStorage.removeItem("gocreaj_cupon");
      pedidoRealizadoRef.current = true;
      await refrescar();
      const numero = res.numeros_pedido?.[0];
      toast.show(numero ? `¡Pedido #${numero} realizado con éxito!` : "Pedido realizado con éxito", "success");
      navigate(`/pedidos/${res.pedidos[0]}`, { state: { recienCreado: true, totalPedidos: res.pedidos.length } });
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo completar el pedido.", "error");
    } finally {
      setEnviando(false);
    }
  };

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 12 }}>
        <Skeleton height={200} radius="var(--radius-lg)" />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 28, alignItems: "start", maxWidth: 900 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <h1 style={{ fontSize: 22 }}>Checkout</h1>

        <section>
          <h2 style={{ fontSize: 14, marginBottom: 10 }}>Entrega</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <OptionCard active={!esRecogida && envioModo === "estandar"} onClick={() => { setTipoEntrega("domicilio"); setEnvioModo("estandar"); }} icon={<Truck size={18} />} title="Estándar" subtitle={money(2.5)} />
            <OptionCard active={!esRecogida && envioModo === "express"} onClick={() => { setTipoEntrega("domicilio"); setEnvioModo("express"); }} icon={<Rocket size={18} />} title="Express" subtitle={money(4.99)} />
            <OptionCard active={esRecogida} onClick={() => setTipoEntrega("recogida")} icon={<Storefront size={18} />} title="Recoger" subtitle="En tienda" />
          </div>
        </section>

        {esRecogida ? (
          <section style={{ padding: 12, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--surface-1)" }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>Recoges tú mismo en la tienda</div>
            <p style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>Sin costo de envío. La tienda te avisará cuando esté listo, con un código para confirmar la recogida.</p>
          </section>
        ) : (
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
        )}

        <section>
          <h2 style={{ fontSize: 14, marginBottom: 10 }}>Método de pago</h2>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <OptionCard active={metodo === "efectivo"} onClick={() => setMetodo("efectivo")} icon={<Money size={18} />} title="Efectivo" subtitle={esRecogida ? "Hasta $20" : "Contra entrega"} />
            <OptionCard active={metodo === "tarjeta"} onClick={() => setMetodo("tarjeta")} icon={<CreditCard size={18} />} title="Tarjeta" subtitle="Crédito o débito" />
            <OptionCard active={metodo === "paypal"} onClick={() => setMetodo("paypal")} icon={<PaypalLogo size={18} />} title="PayPal" subtitle="Con 2FA" />
          </div>

          {recogidaEfectivoBloqueado && (
            <p style={{ fontSize: 12.5, color: "var(--danger)", marginBottom: 12 }}>
              Para recoger en tienda, los pedidos de más de ${PICKUP_EFECTIVO_MAX} deben pagarse con tarjeta.
            </p>
          )}

          {metodo === "efectivo" && !esRecogida && (
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

        <section>
          <h2 style={{ fontSize: 14, marginBottom: 10 }}>Notas para el pedido (opcional)</h2>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
            placeholder={esRecogida ? "Ej. Llego en carro rojo, avísame por chat" : "Ej. Sin cebolla, tocar el timbre"}
            style={{ width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: 12, fontSize: 13.5, fontFamily: "inherit", resize: "vertical" }}
          />
        </section>
      </div>

      <div style={{ position: "sticky", top: 80, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 15 }}>Total a pagar</h2>
        <Row label="Subtotal" value={money(total)} />
        {cupon && <Row label={`Cupón ${cupon.cupon.codigo}`} value={`− ${money(descuento)}`} tone="var(--ok)" />}
        <Row label="Envío" value={esRecogida ? "Gratis" : money(costoEnvio)} />
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontWeight: 700 }}>Total</span>
          <span className="tabular" style={{ fontSize: 20, fontWeight: 800 }}>
            {money(totalFinal)}
          </span>
        </div>
        <Button size="lg" fullWidth hero onClick={confirmar} loading={enviando} disabled={recogidaEfectivoBloqueado}>
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
