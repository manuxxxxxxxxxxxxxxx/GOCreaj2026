import { useState, useEffect, useRef } from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import '../../css/Chat.css';
import '../../css/dark.css';

interface Message {
  id: number;
  sender: 'sent' | 'recv';
  text: string;
  time: string;
}

interface Contact {
  id: number;
  name: string;
  role: string;
  status: 'online' | 'offline';
  avatar: string;
  lastMsg: string;
  time: string;
  unread: number;
  color: string;
}

const INITIAL_CONTACTS: Contact[] = [
  { id: 1, name: 'Panadería Don José', role: 'Vendedor', status: 'online', avatar: '🥖', lastMsg: '¡Claro! Tu pedido estará listo en 15 min.', time: '10:45 AM', unread: 2, color: '#4A6D8C' },
  { id: 2, name: 'Carlos Reparto', role: 'Repartidor', status: 'online', avatar: '🛵', lastMsg: 'Estoy a 5 minutos de tu ubicación.', time: '09:30 AM', unread: 0, color: '#2ecc71' },
  { id: 3, name: 'Huerto Verde', role: 'Vendedor', status: 'offline', avatar: '🥦', lastMsg: 'Gracias por tu compra.', time: 'Ayer', unread: 0, color: '#27ae60' },
];

const INITIAL_CONVERSATIONS: Record<number, Message[]> = {
  1: [
    { id: 1, sender: 'recv', text: 'Hola, ¿en qué puedo ayudarte?', time: '10:40 AM' },
    { id: 2, sender: 'sent', text: 'Hola, ¿tienen pan integral hoy?', time: '10:42 AM' },
    { id: 3, sender: 'recv', text: '¡Sí! Acabamos de sacar una tanda del horno.', time: '10:44 AM' },
    { id: 4, sender: 'recv', text: '¡Claro! Tu pedido estará listo en 15 min.', time: '10:45 AM' },
  ],
  2: [
    { id: 1, sender: 'sent', text: 'Hola Carlos, ¿dónde vienes con el pedido?', time: '09:25 AM' },
    { id: 2, sender: 'recv', text: 'Hola, ya salí de la tienda. Estoy a 5 minutos de tu ubicación.', time: '09:30 AM' },
  ],
  3: [
    { id: 1, sender: 'recv', text: 'Hola, tus verduras orgánicas ya están empacadas.', time: 'Ayer' },
    { id: 2, sender: 'sent', text: '¡Excelente, muchas gracias!', time: 'Ayer' },
    { id: 3, sender: 'recv', text: 'Gracias por tu compra.', time: 'Ayer' },
  ]
};

export default function Chat() {
  const { toggleTheme, cartCount, theme } = useGlobal();
  const navigate = useNavigate();

  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [selectedChat, setSelectedChat] = useState<Contact | null>(INITIAL_CONTACTS[0]); // default to first chat so it doesn't look empty!
  const [conversations, setConversations] = useState<Record<number, Message[]>>(INITIAL_CONVERSATIONS);
  const [msgInput, setMsgInput] = useState('');

  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesAreaRef.current) {
      messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
    // Clear unread count when chat is opened
    if (selectedChat && selectedChat.unread > 0) {
      setContacts(prev => prev.map(c => c.id === selectedChat.id ? { ...c, unread: 0 } : c));
    }
  }, [selectedChat, conversations]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!msgInput.trim() || !selectedChat) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessage: Message = {
      id: Date.now(),
      sender: 'sent',
      text: msgInput,
      time: currentTime
    };

    // Update conversation
    setConversations(prev => ({
      ...prev,
      [selectedChat.id]: [...(prev[selectedChat.id] || []), newMessage]
    }));

    // Update last message in contact sidebar
    setContacts(prev => prev.map(c => c.id === selectedChat.id ? { ...c, lastMsg: msgInput, time: currentTime } : c));
    
    const sentText = msgInput;
    setMsgInput('');

    // Trigger mock reply after 1.5 seconds
    setTimeout(() => {
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const replyText = `¡Recibido! Estaré al tanto de tu mensaje: "${sentText.substring(0, 15)}..."`;
      const replyMessage: Message = {
        id: Date.now() + 1,
        sender: 'recv',
        text: replyText,
        time: replyTime
      };

      setConversations(prev => ({
        ...prev,
        [selectedChat.id]: [...(prev[selectedChat.id] || []), replyMessage]
      }));

      setContacts(prev => prev.map(c => c.id === selectedChat.id ? { ...c, lastMsg: replyText, time: replyTime } : c));
    }, 1500);
  };

  const activeMessages = selectedChat ? (conversations[selectedChat.id] || []) : [];

  return (
    <div className="chat-layout-wrapper">
      <Header activeTab="chat" />

      {/* ══ CHAT INTERFACE ══ */}
      <div className="chat-page">
        <aside className="contacts-sidebar">
          <div className="sidebar-header">
            <h1 className="sidebar-title">Mensajes</h1>
            <button className="icon-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </button>
          </div>
          <div className="search-wrap">
            <input type="search" placeholder="Buscar conversación..." />
          </div>
          <div className="contacts-list">
            {contacts.map(c => (
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
                    <span className={`ch-role ${selectedChat.role.toLowerCase()}`} style={{ background: 'var(--blue-light)', color: 'var(--blue)', fontWeight: '700', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '30px', textTransform: 'capitalize', marginLeft: '8px' }}>
                      {selectedChat.role}
                    </span>
                  </div>
                  <div className={`ch-status ${selectedChat.status === 'online' ? 'online' : ''}`}>
                    {selectedChat.status === 'online' ? (
                      <><span className="ch-status-dot"></span> En línea</>
                    ) : 'Desconectado'}
                  </div>
                </div>
                <div className="ch-actions">
                  <button className="ch-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17z"/>
                    </svg>
                  </button>
                  <button className="ch-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <polygon points="23 7 16 12 23 17 23 7"/>
                      <rect x="1" y="5" width="15" height="14" rx="2"/>
                    </svg>
                  </button>
                </div>
              </header>

              <div className="messages-area" ref={messagesAreaRef}>
                <div className="date-sep">Hoy</div>
                {activeMessages.map(m => (
                  <div key={m.id} className={`msg-row ${m.sender}`}>
                    <div className="msg-bubble-wrap">
                      <div 
                        className="msg-bubble" 
                        style={{ 
                          background: m.sender === 'sent' 
                            ? 'linear-gradient(135deg,#4f6ef7,#7c3aed)' 
                            : theme === 'dark' ? '#1e293b' : '#e2e8f0', 
                          color: m.sender === 'sent' 
                            ? '#ffffff' 
                            : theme === 'dark' ? '#f1f5f9' : 'var(--text)',
                          boxShadow: m.sender === 'sent' ? 'none' : theme === 'dark' ? '0 1px 4px rgba(0,0,0,.25)' : '0 1px 3px rgba(0,0,0,.06)'
                        }}
                      >
                        {m.text}
                      </div>
                      <div className="msg-meta">
                        {m.time}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <footer className="msg-footer">
                <form className="msg-bar" onSubmit={handleSendMessage}>
                  {/* Emoji button */}
                  <button
                    type="button"
                    className="bar-btn"
                    title="Emojis"
                    style={{ flexShrink: 0 }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
                      <line x1="9" y1="9" x2="9.01" y2="9"/>
                      <line x1="15" y1="9" x2="15.01" y2="9"/>
                    </svg>
                  </button>

                  {/* Message input */}
                  <textarea
                    id="msg-input"
                    placeholder="Escribe un mensaje..."
                    rows={1}
                    value={msgInput}
                    onChange={(e) => {
                      setMsgInput(e.target.value);
                      // Auto-resize
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                        // Reset height
                        (e.target as HTMLTextAreaElement).style.height = 'auto';
                      }
                    }}
                  />

                  {/* Attach button — only when no text */}
                  {!msgInput && (
                    <button
                      type="button"
                      className="bar-btn"
                      title="Adjuntar archivo"
                      style={{ flexShrink: 0 }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                      </svg>
                    </button>
                  )}

                  {/* Send button — gradient + animated */}
                  <button
                    className="send-btn"
                    type="submit"
                    title="Enviar mensaje"
                    disabled={!msgInput.trim()}
                    style={{
                      flexShrink: 0,
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      border: 'none',
                      background: msgInput.trim()
                        ? 'linear-gradient(135deg, #4f6ef7, #7c3aed)'
                        : 'var(--border)',
                      color: msgInput.trim() ? 'white' : 'var(--text-muted)',
                      cursor: msgInput.trim() ? 'pointer' : 'default',
                      display: 'grid',
                      placeItems: 'center',
                      transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      transform: msgInput.trim() ? 'scale(1)' : 'scale(0.92)',
                      boxShadow: msgInput.trim() ? '0 4px 14px rgba(79,110,247,0.4)' : 'none',
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                </form>
              </footer>
            </div>
          ) : (
            <div className="chat-empty">
              <div className="empty-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
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
