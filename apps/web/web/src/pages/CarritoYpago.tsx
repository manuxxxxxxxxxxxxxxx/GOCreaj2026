import { useState, useEffect } from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { api } from '../api';
import '../../css/carritoypago.css';
import '../../css/dark.css';

// ── Card number formatting helpers ────────────────────────────────────────────
function formatCardNumber(val: string) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}
function detectBrand(num: string): 'visa' | 'mastercard' | 'amex' | null {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  return null;
}

type Direccion = {
  id: number;
  alias: string;
  municipio: string;
  departamento: string;
  direccion: string;
  referencia?: string | null;
  lat?: number | null;
  lng?: number | null;
  es_principal: number;
};

export default function CarritoYpago() {
  const { cart, removeFromCart, updateCartQty, clearCart, user } = useGlobal();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [showReview, setShowReview] = useState(false);

  const [shippingMode, setShippingMode] = useState(1);
  const [paymentMode, setPaymentMode] = useState(1);

  // Card form state
  const [cardNum, setCardNum] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [showCvv, setShowCvv] = useState(false);
  const [efectivoPagaCon, setEfectivoPagaCon] = useState('');

  // Tarjetas guardadas
  const [tarjetasGuardadas, setTarjetasGuardadas] = useState<any[]>([]);
  const [tarjetaGuardadaId, setTarjetaGuardadaId] = useState<number | null>(null);
  const [guardarTarjeta, setGuardarTarjeta] = useState(false);

  // Dirección de entrega
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | 'nueva'>('nueva');
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [nuevaDireccion, setNuevaDireccion] = useState('');
  const [nuevoMunicipio, setNuevoMunicipio] = useState('');
  const [nuevaReferencia, setNuevaReferencia] = useState('');

  // Cupón de descuento
  const [cuponCodigo, setCuponCodigo] = useState('');
  const [cuponAplicado, setCuponAplicado] = useState<{ codigo: string; descuento: number } | null>(null);
  const [cuponError, setCuponError] = useState('');
  const [cuponLoading, setCuponLoading] = useState(false);

  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState<{ pedidos: number[]; pago_referencia: string | null; pago_estado: string } | null>(null);

  useEffect(() => {
    if (user?.rol === 'admin') {
      navigate('/', { replace: true });
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    api.get('/direcciones.php?action=listar').then(res => {
      if (res.data.ok) {
        const dirs: Direccion[] = res.data.direcciones || [];
        setDirecciones(dirs);
        const principal = dirs.find(d => d.es_principal);
        if (principal) setSelectedAddressId(principal.id);
        else if (dirs.length > 0) setSelectedAddressId(dirs[0].id);
      }
    }).catch(() => {});
    api.get('/productos.php?action=municipios').then(res => {
      if (res.data.ok) setMunicipios(res.data.municipios || []);
    }).catch(() => {});
    api.get('/carrito_pagos.php?action=metodos_listar').then(res => {
      if (res.data.ok) {
        const metodos = res.data.metodos || [];
        setTarjetasGuardadas(metodos);
        const pred = metodos.find((m: any) => m.predeterminado);
        if (pred) setTarjetaGuardadaId(pred.id);
      }
    }).catch(() => {});
  }, [user]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
  const shippingCost = shippingMode === 1 ? 2.50 : 4.99;
  const descuento = cuponAplicado?.descuento || 0;
  const total = Math.max(0, subtotal - descuento) + shippingCost;
  const brand = detectBrand(cardNum);

  const direccionSeleccionada = selectedAddressId !== 'nueva'
    ? direcciones.find(d => d.id === selectedAddressId)
    : null;

  const handleQty = (id: number | string, delta: number) => {
    const item = cart.find(p => p.id === id);
    if (item) {
      updateCartQty(id, (item.qty || 1) + delta);
    }
  };

  const handleRemove = (id: number | string) => {
    removeFromCart(id);
  };

  const aplicarCupon = async () => {
    if (!cuponCodigo.trim()) return;
    setCuponLoading(true);
    setCuponError('');
    try {
      const res = await api.post('/cupones.php?action=validar', { codigo: cuponCodigo.trim(), monto: subtotal });
      if (res.data.ok) {
        setCuponAplicado({ codigo: res.data.cupon.codigo, descuento: res.data.descuento });
      } else {
        setCuponAplicado(null);
        setCuponError(res.data.error || 'Cupón no válido');
      }
    } catch (e: any) {
      setCuponAplicado(null);
      setCuponError(e.response?.data?.error || 'No se pudo validar el cupón');
    } finally {
      setCuponLoading(false);
    }
  };

  const quitarCupon = () => {
    setCuponAplicado(null);
    setCuponCodigo('');
    setCuponError('');
  };

  const irARevision = () => {
    setCheckoutError('');
    const direccionTexto = direccionSeleccionada
      ? `${direccionSeleccionada.direccion}${direccionSeleccionada.referencia ? ' (' + direccionSeleccionada.referencia + ')' : ''}`
      : nuevaDireccion.trim();
    const municipioVal = direccionSeleccionada ? direccionSeleccionada.municipio : nuevoMunicipio;

    if (!direccionTexto) { setCheckoutError('Ingresa o selecciona una dirección de entrega.'); return; }
    if (!municipioVal) { setCheckoutError('Selecciona el municipio de entrega.'); return; }
    if (paymentMode === 1 && !tarjetaGuardadaId) {
      if (formatCardNumber(cardNum).replace(/\s/g, '').length < 13 || !cardName || cardExpiry.length < 5 || cardCvv.length < 3) {
        setCheckoutError('Completa los datos de tu tarjeta.');
        return;
      }
    }
    setShowReview(true);
  };

  const handleConfirm = async () => {
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const direccionTexto = direccionSeleccionada
        ? `${direccionSeleccionada.direccion}${direccionSeleccionada.referencia ? ' (' + direccionSeleccionada.referencia + ')' : ''}`
        : nuevaDireccion.trim();
      const municipioVal = direccionSeleccionada ? direccionSeleccionada.municipio : nuevoMunicipio;
      const departamentoVal = direccionSeleccionada ? direccionSeleccionada.departamento : undefined;

      const payload: Record<string, any> = {
        metodo_pago: paymentMode === 1 ? 'tarjeta' : 'efectivo',
        direccion_entrega: direccionTexto,
        municipio: municipioVal,
        departamento: departamentoVal,
        lat: direccionSeleccionada?.lat ?? undefined,
        lng: direccionSeleccionada?.lng ?? undefined,
        envio_modo: shippingMode === 2 ? 'express' : 'estandar',
      };
      if (paymentMode === 1) {
        if (tarjetaGuardadaId) {
          payload.metodo_pago_id = tarjetaGuardadaId;
        } else {
          payload.tarjeta_numero = cardNum.replace(/\s/g, '');
          payload.tarjeta_cvv = cardCvv;
          payload.tarjeta_exp = cardExpiry;
          if (guardarTarjeta) payload.guardar_tarjeta = true;
        }
      } else if (efectivoPagaCon) {
        payload.efectivo_paga_con = efectivoPagaCon;
      }
      if (cuponAplicado) payload.cupon_codigo = cuponAplicado.codigo;

      const res = await api.post('/carrito_pagos.php?action=checkout', payload);
      if (res.data.ok) {
        setPedidoConfirmado({
          pedidos: res.data.pedidos || [],
          pago_referencia: res.data.pago_referencia || null,
          pago_estado: res.data.pago_estado || 'pendiente',
        });
        clearCart();
        setShowReview(false);
        setStep(3);
      } else {
        setCheckoutError(res.data.error || 'Error al procesar el pedido');
      }
    } catch (e: any) {
      setCheckoutError(e.response?.data?.error || 'Hubo un error de conexión');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Brand logo component
  const BrandBadge = () => {
    if (brand === 'visa') return (
      <svg viewBox="0 0 48 16" width="44" height="14" aria-label="Visa">
        <text x="0" y="13" fontFamily="Arial,sans-serif" fontSize="15" fontWeight="900" fill="#1a1f71">VISA</text>
      </svg>
    );
    if (brand === 'mastercard') return (
      <svg viewBox="0 0 38 24" width="36" height="22">
        <circle cx="13" cy="12" r="12" fill="#EB001B" opacity=".9"/>
        <circle cx="25" cy="12" r="12" fill="#F79E1B" opacity=".9"/>
      </svg>
    );
    if (brand === 'amex') return (
      <span style={{ fontSize: '0.6rem', fontWeight: '800', color: '#016FD0', background: '#e8f3fd', borderRadius: '4px', padding: '1px 5px' }}>AMEX</span>
    );
    return null;
  };

  // Shared input style
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    border: '1.5px solid var(--line)',
    borderRadius: '10px',
    fontSize: '0.9rem',
    background: 'var(--surface)',
    color: 'var(--ink)',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  };

  const monoInputStyle: React.CSSProperties = {
    ...inputStyle,
    fontFamily: 'ui-monospace, monospace',
    letterSpacing: '2px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: 'var(--ink-3)',
    marginBottom: '6px',
    display: 'block',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  };

  return (
    <>
      <Header />

      <div className="page-wrapper">
        <header className="checkout-header">
          <h1>Finalizar compra</h1>
          <p className="subhead">Completa tu pedido de forma rápida y segura</p>
        </header>

        {step < 3 && (
          <div className="stepper">
            <button className={`step ${step === 1 ? 'active' : 'done'}`} onClick={() => { setStep(1); setShowReview(false); }}>
              <span className="step-num">1</span>
              <span className="step-label">Carrito</span>
            </button>
            <span className="step-connector"><span className="step-connector-fill" style={{width: step >= 2 ? '100%' : '0'}}></span></span>
            <button className={`step ${step === 2 ? 'active' : ''}`} onClick={() => cart.length > 0 && setStep(2)}>
              <span className="step-num">2</span>
              <span className="step-label">{showReview ? 'Revisión' : 'Pago y entrega'}</span>
            </button>
          </div>
        )}

        {/* ── STEP 1: CART ── */}
        <section className={`panel ${step === 1 ? 'active' : ''}`}>
          <div className="layout">
            <div className="layout-main">
              <div className="card">
                <div className="card-title">
                  <span className="card-title-text">Mi carrito</span>
                  <span className="badge">{cart.reduce((s, c) => s + (c.qty || 0), 0)} productos</span>
                </div>
                <div className="cart-items">
                  {cart.length === 0 ? (
                    <div className="empty-cart show">
                      <p className="empty-title">Tu carrito está vacío</p>
                      <button className="btn-secondary" onClick={() => navigate('/')}>Ver el menú</button>
                    </div>
                  ) : (
                    cart.map(p => (
                      <div key={p.id} className="product-row">
                        <div className="prod-img" style={{ background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {p.img
                            ? <img src={p.img} alt={p.name} style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'inherit'}}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            : <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" width="32" height="32"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                          }
                        </div>
                        <div className="prod-info">
                          <div className="prod-name">{p.name}</div>
                          <div className="prod-sub">{p.seller || p.desc || ''}</div>
                          <div className="prod-unit">${p.price.toFixed(2)} c/u</div>
                        </div>
                        <div className="prod-controls">
                          <div className="qty-ctrl">
                            <button className="qty-btn" onClick={() => handleQty(p.id, -1)}>−</button>
                            <span className="qty-val">{p.qty}</span>
                            <button className="qty-btn" onClick={() => handleQty(p.id, 1)}>+</button>
                          </div>
                          <div className="prod-price">${(p.price * (p.qty || 1)).toFixed(2)}</div>
                          <button className="trash-btn" onClick={() => handleRemove(p.id)}>🗑</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <aside className="summary-card">
              <div className="card">
                <div className="card-title"><span className="card-title-text">Resumen del pedido</span></div>
                <div className="sum-row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="sum-row"><span>Envío</span><span>${shippingCost.toFixed(2)}</span></div>
                <div className="sum-row total"><span>Total</span><span>${(subtotal + shippingCost).toFixed(2)}</span></div>
                <button className="btn-primary" disabled={cart.length === 0} onClick={() => setStep(2)}>
                  Continuar al pago
                </button>
              </div>
            </aside>
          </div>
        </section>

        {/* ── STEP 2: PAYMENT & SHIPPING (form) ── */}
        <section className={`panel ${step === 2 && !showReview ? 'active' : ''}`}>
          <div className="layout">
            <div className="layout-main">

              {/* Dirección de entrega */}
              <div className="card">
                <div className="card-title"><span className="card-title-text">Dirección de entrega</span></div>

                {direcciones.map(d => (
                  <div key={d.id} className={`radio-opt ${selectedAddressId === d.id ? 'selected' : ''}`} onClick={() => setSelectedAddressId(d.id)}>
                    <span className="radio-dot"><span className="radio-inner"></span></span>
                    <div className="radio-text">
                      <div className="rt">{d.alias} {d.es_principal ? '· Predeterminada' : ''}</div>
                      <div className="rs">{d.direccion}, {d.municipio}</div>
                    </div>
                  </div>
                ))}

                <div className={`radio-opt ${selectedAddressId === 'nueva' ? 'selected' : ''}`} onClick={() => setSelectedAddressId('nueva')}>
                  <span className="radio-dot"><span className="radio-inner"></span></span>
                  <div className="radio-text">
                    <div className="rt">Usar otra dirección</div>
                  </div>
                </div>

                {selectedAddressId === 'nueva' && (
                  <div style={{ margin: '10px 0 4px', padding: '16px', background: 'var(--accent-soft)', borderRadius: '14px', border: '1.5px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Dirección</label>
                      <input type="text" placeholder="Calle, casa/apto, colonia" value={nuevaDireccion} onChange={e => setNuevaDireccion(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Municipio</label>
                      <select value={nuevoMunicipio} onChange={e => setNuevoMunicipio(e.target.value)} style={inputStyle}>
                        <option value="">Selecciona tu municipio</option>
                        {municipios.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Referencia (opcional)</label>
                      <input type="text" placeholder="Ej: portón azul, frente a la tienda" value={nuevaReferencia} onChange={e => setNuevaReferencia(e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                )}
              </div>

              {/* Cupón de descuento */}
              <div className="card">
                <div className="card-title"><span className="card-title-text">Cupón de descuento</span></div>
                {cuponAplicado ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#DCFCE7', borderRadius: '10px', border: '1px solid #86EFAC' }}>
                    <span style={{ fontWeight: 700, color: '#166534' }}>✓ {cuponAplicado.codigo} aplicado — ahorras ${cuponAplicado.descuento.toFixed(2)}</span>
                    <button className="trash-btn" onClick={quitarCupon}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" placeholder="Código de cupón" value={cuponCodigo} onChange={e => setCuponCodigo(e.target.value.toUpperCase())} style={inputStyle} />
                    <button className="btn-secondary" disabled={cuponLoading || !cuponCodigo.trim()} onClick={aplicarCupon} style={{ whiteSpace: 'nowrap' }}>
                      {cuponLoading ? 'Validando...' : 'Aplicar'}
                    </button>
                  </div>
                )}
                {cuponError && <div style={{ marginTop: 8, color: '#DC2626', fontSize: '0.82rem', fontWeight: 600 }}>{cuponError}</div>}
              </div>

              {/* Payment method selector */}
              <div className="card">
                <div className="card-title"><span className="card-title-text">Método de pago</span></div>

                {/* Option 1: Card */}
                <div className={`radio-opt ${paymentMode === 1 ? 'selected' : ''}`} onClick={() => setPaymentMode(1)}>
                  <span className="radio-dot"><span className="radio-inner"></span></span>
                  <div className="radio-text">
                    <div className="rt">Tarjeta de crédito o débito</div>
                    <div className="rs" style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                      <svg viewBox="0 0 48 16" width="32" height="11"><text x="0" y="11" fontFamily="Arial,sans-serif" fontSize="12" fontWeight="900" fill="#1a1f71">VISA</text></svg>
                      <svg viewBox="0 0 38 24" width="26" height="16"><circle cx="13" cy="12" r="12" fill="#EB001B" opacity=".8"/><circle cx="25" cy="12" r="12" fill="#F79E1B" opacity=".8"/></svg>
                      <span style={{ fontSize: '0.6rem', fontWeight: '700', color: '#016FD0', background: '#e8f3fd', borderRadius: '3px', padding: '1px 4px' }}>AMEX</span>
                    </div>
                  </div>
                </div>

                {/* Card details — expand when card is selected */}
                {paymentMode === 1 && (
                  <div style={{
                    margin: '10px 0 12px',
                    padding: '20px',
                    background: 'var(--accent-soft)',
                    borderRadius: '14px',
                    border: '1.5px solid var(--line)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}>
                    {tarjetasGuardadas.length > 0 && (
                      <div>
                        <label style={labelStyle}>Tarjetas guardadas</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {tarjetasGuardadas.map((m: any) => (
                            <div
                              key={m.id}
                              onClick={() => setTarjetaGuardadaId(prev => prev === m.id ? null : m.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                                border: `1.5px solid ${tarjetaGuardadaId === m.id ? 'var(--accent)' : 'var(--line)'}`,
                                background: tarjetaGuardadaId === m.id ? 'var(--accent-soft)' : 'transparent',
                              }}
                            >
                              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                                {String(m.marca).charAt(0).toUpperCase() + String(m.marca).slice(1)} •••• {m.ultimos4}
                              </span>
                            </div>
                          ))}
                          <div onClick={() => setTarjetaGuardadaId(null)} style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)', cursor: 'pointer' }}>
                            {tarjetaGuardadaId ? '' : '↳ Usando datos de tarjeta nueva abajo'}
                          </div>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: tarjetaGuardadaId ? 0.4 : 1, pointerEvents: tarjetaGuardadaId ? 'none' : 'auto' }}>
                    {/* Card number */}
                    <div>
                      <label style={labelStyle}>Número de tarjeta</label>
                      <div style={{ position: 'relative' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)" strokeWidth="1.5" width="17" height="17"
                          style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                          <rect x="2" y="5" width="20" height="14" rx="3"/>
                          <path d="M2 10h20M7 15h2M15 15h2"/>
                        </svg>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="1234 5678 9012 3456"
                          value={cardNum}
                          onChange={e => setCardNum(formatCardNumber(e.target.value))}
                          maxLength={19}
                          style={{ ...monoInputStyle, paddingLeft: '40px', paddingRight: '56px', fontSize: '1rem', letterSpacing: '2.5px' }}
                          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                          onBlur={e => e.target.style.borderColor = 'var(--line)'}
                        />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                          <BrandBadge />
                        </span>
                      </div>
                    </div>

                    {/* Cardholder name */}
                    <div>
                      <label style={labelStyle}>Nombre en la tarjeta</label>
                      <input
                        type="text"
                        placeholder="JUAN PÉREZ"
                        value={cardName}
                        onChange={e => setCardName(e.target.value.toUpperCase())}
                        style={{ ...monoInputStyle, letterSpacing: '1.5px' }}
                        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={e => e.target.style.borderColor = 'var(--line)'}
                      />
                    </div>

                    {/* Expiry + CVV */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={labelStyle}>Vencimiento</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="MM/AA"
                          value={cardExpiry}
                          onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                          maxLength={5}
                          style={{ ...monoInputStyle, letterSpacing: '2px' }}
                          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                          onBlur={e => e.target.style.borderColor = 'var(--line)'}
                        />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '5px' }}>
                          CVV
                          <span title="3 dígitos en el reverso de tu tarjeta (4 en AMEX)" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', borderRadius: '50%', border: '1px solid var(--ink-4)', fontSize: '0.6rem', color: 'var(--ink-3)' }}>?</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showCvv ? 'text' : 'password'}
                            inputMode="numeric"
                            placeholder="•••"
                            value={cardCvv}
                            onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, brand === 'amex' ? 4 : 3))}
                            maxLength={brand === 'amex' ? 4 : 3}
                            style={{ ...monoInputStyle, paddingRight: '38px', letterSpacing: '3px' }}
                            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                            onBlur={e => e.target.style.borderColor = 'var(--line)'}
                          />
                          <button type="button" onClick={() => setShowCvv(v => !v)}
                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 0 }}>
                            {showCvv ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Guardar tarjeta */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setGuardarTarjeta(v => !v)}>
                      <input type="checkbox" checked={guardarTarjeta} onChange={e => setGuardarTarjeta(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Guardar esta tarjeta para la próxima vez</span>
                    </div>
                    </div>

                    {/* Security notice */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--ink-3)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      Tus datos están cifrados con SSL/TLS de 256 bits
                    </div>
                  </div>
                )}

                {/* Option 2: Cash on delivery */}
                <div className={`radio-opt ${paymentMode === 2 ? 'selected' : ''}`} onClick={() => setPaymentMode(2)}>
                  <span className="radio-dot"><span className="radio-inner"></span></span>
                  <div className="radio-text">
                    <div className="rt">Pago contra entrega</div>
                    <div className="rs">Paga en efectivo al recibir tu pedido</div>
                  </div>
                  <span style={{ fontSize: '1.2rem', marginLeft: 'auto' }}>💵</span>
                </div>

                {paymentMode === 2 && (
                  <div style={{ margin: '10px 0 4px', padding: '16px', background: 'var(--accent-soft)', borderRadius: '14px', border: '1.5px solid var(--line)' }}>
                    <label style={labelStyle}>¿Con cuánto vas a pagar? (opcional)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={`Ej: ${(Math.ceil(total / 5) * 5).toFixed(2)}`}
                      value={efectivoPagaCon}
                      onChange={e => setEfectivoPagaCon(e.target.value.replace(/[^0-9.]/g, ''))}
                      style={inputStyle}
                    />
                    <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--ink-3)' }}>Así tu repartidor lleva el cambio exacto.</div>
                  </div>
                )}
              </div>

              {/* Delivery options */}
              <div className="card">
                <div className="card-title"><span className="card-title-text">Opciones de entrega</span></div>
                <div className={`radio-opt ${shippingMode === 1 ? 'selected' : ''}`} onClick={() => setShippingMode(1)}>
                  <span className="radio-dot"><span className="radio-inner"></span></span>
                  <div className="radio-text">
                    <div className="rt">Entrega estándar</div>
                    <div className="rs">30–45 minutos</div>
                  </div>
                  <div className="radio-price">$2.50</div>
                </div>
                <div className={`radio-opt ${shippingMode === 2 ? 'selected' : ''}`} onClick={() => setShippingMode(2)}>
                  <span className="radio-dot"><span className="radio-inner"></span></span>
                  <div className="radio-text">
                    <div className="rt">Entrega express</div>
                    <div className="rs">15–20 minutos</div>
                  </div>
                  <div className="radio-price">$4.99</div>
                </div>
              </div>

              {checkoutError && (
                <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '12px', padding: '10px 14px', color: '#DC2626', fontSize: '0.875rem', fontWeight: '600' }}>
                  {checkoutError}
                </div>
              )}
            </div>

            <aside className="summary-card">
              <div className="card">
                <div className="card-title"><span className="card-title-text">Resumen</span></div>
                <div className="sum-row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                {descuento > 0 && <div className="sum-row" style={{ color: '#16A34A' }}><span>Descuento cupón</span><span>-${descuento.toFixed(2)}</span></div>}
                <div className="sum-row"><span>Envío</span><span>${shippingCost.toFixed(2)}</span></div>
                <div className="sum-row total"><span>Total</span><span>${total.toFixed(2)}</span></div>
                <button className="btn-primary" onClick={irARevision}>Revisar pedido</button>
                <button className="btn-outline" onClick={() => setStep(1)}>← Volver al carrito</button>
              </div>
            </aside>
          </div>
        </section>

        {/* ── STEP 2.5: REVIEW / CONFIRMATION ── */}
        <section className={`panel ${step === 2 && showReview ? 'active' : ''}`}>
          <div className="layout">
            <div className="layout-main">
              <div className="card">
                <div className="card-title"><span className="card-title-text">Revisa tu pedido antes de pagar</span></div>
                <div className="cart-items">
                  {cart.map(p => (
                    <div key={p.id} className="product-row">
                      <div className="prod-img" style={{ background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {p.img
                          ? <img src={p.img} alt={p.name} style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'inherit'}} />
                          : <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" width="32" height="32"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                        }
                      </div>
                      <div className="prod-info">
                        <div className="prod-name">{p.name}</div>
                        <div className="prod-sub">Cantidad: {p.qty}</div>
                      </div>
                      <div className="prod-price">${(p.price * (p.qty || 1)).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-title"><span className="card-title-text">Dirección de entrega</span></div>
                <p style={{ margin: 0, fontSize: '0.92rem' }}>
                  {direccionSeleccionada
                    ? `${direccionSeleccionada.direccion}${direccionSeleccionada.referencia ? ' (' + direccionSeleccionada.referencia + ')' : ''}, ${direccionSeleccionada.municipio}`
                    : `${nuevaDireccion}, ${nuevoMunicipio}`}
                </p>
              </div>

              <div className="card">
                <div className="card-title"><span className="card-title-text">Método de pago</span></div>
                <p style={{ margin: 0, fontSize: '0.92rem' }}>
                  {paymentMode === 1
                    ? `Tarjeta terminada en ${tarjetaGuardadaId ? tarjetasGuardadas.find((m: any) => m.id === tarjetaGuardadaId)?.ultimos4 : cardNum.replace(/\s/g, '').slice(-4)}`
                    : `Pago en efectivo contra entrega${efectivoPagaCon ? ' — pagas con $' + efectivoPagaCon : ''}`}
                </p>
              </div>

              {checkoutError && (
                <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '12px', padding: '10px 14px', color: '#DC2626', fontSize: '0.875rem', fontWeight: '600' }}>
                  {checkoutError}
                </div>
              )}
            </div>

            <aside className="summary-card">
              <div className="card">
                <div className="card-title"><span className="card-title-text">Total a pagar</span></div>
                <div className="sum-row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                {descuento > 0 && <div className="sum-row" style={{ color: '#16A34A' }}><span>Descuento cupón</span><span>-${descuento.toFixed(2)}</span></div>}
                <div className="sum-row"><span>Envío</span><span>${shippingCost.toFixed(2)}</span></div>
                <div className="sum-row total"><span>Total</span><span>${total.toFixed(2)}</span></div>
                <button className="btn-primary" disabled={checkoutLoading} onClick={handleConfirm}>
                  {checkoutLoading ? 'Procesando...' : 'Sí, confirmar y pagar'}
                </button>
                <button className="btn-outline" onClick={() => setShowReview(false)}>← Editar pedido</button>
              </div>
            </aside>
          </div>
        </section>

        {/* ── STEP 3: SUCCESS ── */}
        <section className={`panel ${step === 3 ? 'active' : ''}`}>
          <div className="card success-card">
            <h2 className="success-title">¡Pedido confirmado!</h2>
            <p className="success-sub">Tu pedido llegará en {shippingMode === 1 ? '30-45 minutos' : '15-20 minutos'}.</p>
            <div className="order-num-box">
              <span className="order-num-label">Número de pedido</span>
              <span className="order-num-val">#SV-{pedidoConfirmado?.pedidos?.[0] ?? '—'}</span>
            </div>
            {pedidoConfirmado?.pago_referencia && (
              <p style={{ fontSize: '0.82rem', color: 'var(--ink-3)' }}>Referencia de pago: {pedidoConfirmado.pago_referencia}</p>
            )}
            <button className="btn-primary success-btn" onClick={() => navigate('/historial')}>Ver mis pedidos</button>
            <button className="btn-outline success-btn" onClick={() => navigate('/')}>Hacer otro pedido</button>
          </div>
        </section>
      </div>
    </>
  );
}
