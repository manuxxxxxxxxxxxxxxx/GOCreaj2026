import React, { useState, useEffect } from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import '../../css/carritoypago.css';
import '../../css/dark.css';

export default function CarritoYpago() {
  const { toggleTheme, cartCount } = useGlobal();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [cart, setCart] = useState([
    { id: 1, name: "Pan Artesanal Integral", desc: "Panadería Don José", price: 4.05, qty: 1, img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=640" },
    { id: 3, name: "Café Premium 250g", desc: "Café del Barrio", price: 8.75, qty: 2, img: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=640" }
  ]);
  
  const [shippingMode, setShippingMode] = useState(1);
  const [paymentMode, setPaymentMode] = useState(1);
  
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shippingCost = shippingMode === 1 ? 2.50 : 4.99;
  const total = subtotal + shippingCost;
  
  const handleQty = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }).filter(item => item.qty > 0));
  };
  
  const handleRemove = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleConfirm = () => {
    setStep(3);
    setCart([]);
  };

  return (
    <>
      <nav>
        <a onClick={() => navigate('/')} className="nav-logo" style={{cursor:'pointer'}}>
          <div className="logo-icon" style={{color: '#fff'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
              <path d="M9 22V12h6v10M2 9l10-7 10 7"/>
            </svg>
          </div>
          LocalMarket
        </a>
        <ul className="nav-links">
          <li><a onClick={() => navigate('/market')} style={{cursor:'pointer'}}>Marketplace</a></li>
          <li><a onClick={() => navigate('/reels')} style={{cursor:'pointer'}}>Reels</a></li>
          <li><a onClick={() => navigate('/chat')} style={{cursor:'pointer'}}>Mensajes</a></li>
        </ul>
        <div className="nav-right">
          <button className="lm-theme-toggle" onClick={toggleTheme} title="Cambiar tema"></button>
        </div>
      </nav>

      <div className="page-wrapper">
        <header className="checkout-header">
          <h1>Finalizar compra</h1>
          <p className="subhead">Completa tu pedido de forma rápida y segura</p>
        </header>

        {step < 3 && (
          <nav className="stepper">
            <button className={`step ${step === 1 ? 'active' : 'done'}`} onClick={() => setStep(1)}>
              <span className="step-num">1</span>
              <span className="step-label">Carrito</span>
            </button>
            <span className="step-connector"><span className="step-connector-fill" style={{width: step >= 2 ? '100%' : '0'}}></span></span>
            <button className={`step ${step === 2 ? 'active' : ''}`} onClick={() => cart.length > 0 && setStep(2)}>
              <span className="step-num">2</span>
              <span className="step-label">Pago y entrega</span>
            </button>
          </nav>
        )}

        {/* STEP 1: CART */}
        <section className={`panel ${step === 1 ? 'active' : ''}`}>
          <div className="layout">
            <div className="layout-main">
              <div className="card">
                <div className="card-title">
                  <span className="card-title-text">Mi carrito</span>
                  <span className="badge">{cart.reduce((s, c) => s + c.qty, 0)} productos</span>
                </div>

                <div className="cart-items">
                  {cart.length === 0 ? (
                    <div className="empty-cart show">
                      <p className="empty-title">Tu carrito está vacío</p>
                      <button className="btn-secondary" onClick={() => navigate('/market')}>Ver el menú</button>
                    </div>
                  ) : (
                    cart.map(p => (
                      <div key={p.id} className="product-row">
                        <div className="prod-img"><img src={p.img} alt="" style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'inherit'}} /></div>
                        <div className="prod-info">
                          <div className="prod-name">{p.name}</div>
                          <div className="prod-sub">{p.desc}</div>
                          <div className="prod-unit">${p.price.toFixed(2)} c/u</div>
                        </div>
                        <div className="prod-controls">
                          <div className="qty-ctrl">
                            <button className="qty-btn" onClick={() => handleQty(p.id, -1)}>−</button>
                            <span className="qty-val">{p.qty}</span>
                            <button className="qty-btn" onClick={() => handleQty(p.id, 1)}>+</button>
                          </div>
                          <div className="prod-price">${(p.price * p.qty).toFixed(2)}</div>
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
                <div className="sum-row total"><span>Total</span><span>${total.toFixed(2)}</span></div>
                <button className="btn-primary" disabled={cart.length === 0} onClick={() => setStep(2)}>
                  Continuar al pago
                </button>
              </div>
            </aside>
          </div>
        </section>

        {/* STEP 2: PAYMENT & SHIPPING */}
        <section className={`panel ${step === 2 ? 'active' : ''}`}>
          <div className="layout">
            <div className="layout-main">
              <div className="card">
                <div className="card-title"><span className="card-title-text">Método de pago</span></div>
                <div className={`radio-opt ${paymentMode === 1 ? 'selected' : ''}`} onClick={() => setPaymentMode(1)}>
                  <span className="radio-dot"><span className="radio-inner"></span></span>
                  <div className="radio-text">
                    <div className="rt">Tarjeta de crédito o débito</div>
                  </div>
                </div>
                <div className={`radio-opt ${paymentMode === 2 ? 'selected' : ''}`} onClick={() => setPaymentMode(2)}>
                  <span className="radio-dot"><span className="radio-inner"></span></span>
                  <div className="radio-text">
                    <div className="rt">Pago contra entrega</div>
                  </div>
                </div>
              </div>

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
            </div>

            <aside className="summary-card">
              <div className="card">
                <div className="card-title"><span className="card-title-text">Resumen</span></div>
                <div className="sum-row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="sum-row"><span>Envío</span><span>${shippingCost.toFixed(2)}</span></div>
                <div className="sum-row total"><span>Total</span><span>${total.toFixed(2)}</span></div>
                <button className="btn-primary" onClick={handleConfirm}>Confirmar pedido</button>
                <button className="btn-outline" onClick={() => setStep(1)}>← Volver al carrito</button>
              </div>
            </aside>
          </div>
        </section>

        {/* STEP 3: SUCCESS */}
        <section className={`panel ${step === 3 ? 'active' : ''}`}>
          <div className="card success-card">
            <h2 className="success-title">¡Pedido confirmado!</h2>
            <p className="success-sub">Tu pedido llegará en {shippingMode === 1 ? '30-45 minutos' : '15-20 minutos'}.</p>
            <div className="order-num-box">
              <span className="order-num-label">Número de pedido</span>
              <span className="order-num-val">#{Math.floor(100000 + Math.random() * 900000)}</span>
            </div>
            <button className="btn-primary success-btn" onClick={() => navigate('/market')}>Hacer otro pedido</button>
          </div>
        </section>
      </div>
    </>
  );
}
