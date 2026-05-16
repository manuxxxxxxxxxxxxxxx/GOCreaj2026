import React, { useState } from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate, Link } from 'react-router-dom';
import '../../css/Chat.css';
import '../../css/dark.css';

const MOCK_CONTACTS = [
  { id: 1, name: 'Panadería Don José', role: 'Vendedor', status: 'online', avatar: '🥖', lastMsg: '¡Claro! Tu pedido estará listo en 15 min.', time: '10:45 AM', unread: 2, color: '#f59e0b' },
  { id: 2, name: 'Carlos Reparto', role: 'driver', status: 'online', avatar: '🛵', lastMsg: 'Estoy a 5 minutos de tu ubicación.', time: '09:30 AM', unread: 0, color: '#22c55e' },
  { id: 3, name: 'Huerto Verde', role: 'Vendedor', status: 'offline', avatar: '🥦', lastMsg: 'Gracias por tu compra.', time: 'Ayer', unread: 0, color: '#10b981' },
];

const MOCK_MESSAGES = [
  { id: 1, sender: 'recv', text: 'Hola, ¿en qué puedo ayudarte?', time: '10:40 AM' },
  { id: 2, sender: 'sent', text: 'Hola, ¿tienen pan integral hoy?', time: '10:42 AM' },
  { id: 3, sender: 'recv', text: '¡Sí! Acabamos de sacar una tanda del horno.', time: '10:44 AM' },
  { id: 4, sender: 'recv', text: '¡Claro! Tu pedido estará listo en 15 min.', time: '10:45 AM' },
];

export default function Chat() {
  const { toggleTheme, cartCount } = useGlobal();
  const navigate = useNavigate();
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [msg, setMsg] = useState('');

  return (
    <div className="chat-layout-wrapper">
      <nav>
        <Link to="/" className="nav-logo">
          <div className="logo-icon" style={{color: '#fff'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
              <path d="M9 22V12h6v10M2 9l10-7 10 7"/>
            </svg>
          </div>
          LocalMarket
        </Link>
        <ul className="nav-links">
          <li><Link to="/market">Marketplace</Link></li>
          <li><Link to="/reels">Reels</Link></li>
          <li><Link to="/chat" className="active">Mensajes</Link></li>
        </ul>
        <div className="nav-right">
          <button className="lm-theme-toggle" onClick={toggleTheme} title="Cambiar tema"></button>
          <button className="cart-btn" onClick={() => navigate('/carritoypago')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span className="cart-badge">{cartCount}</span>
          </button>
        </div>
      </nav>

      <div className="chat-page">
        <aside className="contacts-sidebar">
          <div className="sidebar-header">
            <h1 className="sidebar-title">Mensajes</h1>
            <button className="icon-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
          </div>
          <div className="search-wrap">
            <input type="search" placeholder="Buscar conversación..." />
          </div>
          <div className="contacts-list">
            {MOCK_CONTACTS.map(c => (
              <div 
                key={c.id} 
                className={`contact-item ${selectedChat?.id === c.id ? 'active' : ''}`}
                onClick={() => setSelectedChat(c)}
              >
                <div className="contact-avatar">
                   <div className="avatar-circle" style={{ background: c.color }}>{c.avatar}</div>
                   {c.status === 'online' && <div className="online-dot"></div>}
                </div>
                <div className="contact-info">
                  <div className="contact-top">
                    <span className="contact-name">{c.name}</span>
                    <span className="contact-time">{c.time}</span>
                  </div>
                  <div className="contact-bottom">
                    <span className="contact-preview">{c.lastMsg}</span>
                    {c.unread > 0 && <div className="unread-badge">{c.unread}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="chat-main">
          {selectedChat ? (
            <div className="chat-window visible">
              <header className="chat-header">
                <div className="ch-avatar-slot">
                  <div className="avatar-circle" style={{ background: selectedChat.color }}>{selectedChat.avatar}</div>
                </div>
                <div className="ch-meta">
                  <div className="ch-name-row">
                    <div className="ch-name">{selectedChat.name}</div>
                    <span className={`ch-role ${selectedChat.role}`}>{selectedChat.role}</span>
                  </div>
                  <div className={`ch-status ${selectedChat.status === 'online' ? 'online' : ''}`}>
                    {selectedChat.status === 'online' ? (
                      <><span className="ch-status-dot"></span> En línea</>
                    ) : 'Desconectado'}
                  </div>
                </div>
                <div className="ch-actions">
                  <button className="ch-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17z"/></svg></button>
                  <button className="ch-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg></button>
                </div>
              </header>
              <div className="messages-area">
                <div className="date-sep">Hoy</div>
                {MOCK_MESSAGES.map(m => (
                  <div key={m.id} className={`msg-row ${m.sender}`}>
                    <div className="msg-bubble-wrap">
                      <div className="msg-bubble">
                        {m.text}
                      </div>
                      <div className="msg-meta">
                        {m.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <footer className="msg-footer">
                <div className="msg-bar">
                  <textarea 
                    placeholder="Escribe un mensaje..." 
                    rows={1}
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                  />
                  <button className="send-btn" onClick={() => setMsg('')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </div>
              </footer>
            </div>
          ) : (
            <div className="chat-empty">
              <div className="empty-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <h3>Tus mensajes</h3>
              <p>Chatea con vendedores y repartidores en tiempo real.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
