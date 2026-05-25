import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';
import Header from '../components/Header';
import { api, API_URL } from '../api';
import '../../css/Reels.css';
import '../../css/dark.css';

interface Reel {
  id: number; usuario_id: number; titulo?: string | null; descripcion?: string | null;
  archivo: string; tipo: 'video' | 'imagen'; producto_id?: number | null;
  producto_nombre?: string | null; producto_precio?: number | null;
  created_at: string; usuario_nombre: string; usuario_username?: string | null;
  usuario_foto?: string | null; usuario_rol?: string;
  likes_count: number; comentarios_count: number; guardados_count: number;
  me_gusta: boolean; guardado: boolean;
}
interface Comentario {
  id: number; usuario_id: number; reel_id: number; parent_id?: number | null;
  comentario: string; created_at: string; usuario_nombre: string;
  usuario_foto?: string | null; likes_count: number; me_gusta: boolean;
  respuestas_count?: number; respuestas?: Comentario[];
}
interface Producto { id: number; nombre: string; precio: number; }

function fixUrl(url?: string | null) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_URL}/uploads/${url}`;
}
function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}
function ago(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return `${s}s`;
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function ComItem({ c, onLike, onReply, expanded, onToggle, depth = 0 }: {
  c: Comentario; onLike: (c: Comentario) => void; onReply: (c: Comentario) => void;
  expanded: boolean; onToggle: (id: number) => void; depth?: number;
}) {
  const foto = fixUrl(c.usuario_foto);
  return (
    <div className={`rc-item${depth > 0 ? ' rc-reply' : ''}`}>
      <div className="rc-row">
        <div className="rc-avatar">
          {foto ? <img src={foto} alt="" /> : (c.usuario_nombre[0] ?? '?').toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div className="rc-meta">
            <span className="rc-name">{c.usuario_nombre}</span>
            <span className="rc-time">{ago(c.created_at)}</span>
          </div>
          <div className="rc-text">{c.comentario}</div>
          <div className="rc-actions">
            <button className="rc-act" onClick={() => onLike(c)}>
              {c.me_gusta ? '❤️' : '🤍'} {c.likes_count > 0 && fmt(c.likes_count)}
            </button>
            {depth === 0 && <button className="rc-act" onClick={() => onReply(c)}>Responder</button>}
            {depth === 0 && (c.respuestas_count ?? 0) > 0 && (
              <button className="rc-act rc-act-blue" onClick={() => onToggle(c.id)}>
                {expanded ? 'Ocultar' : `${c.respuestas_count} respuesta${c.respuestas_count !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>
      {expanded && (c.respuestas ?? []).map(r => (
        <ComItem key={r.id} c={r} onLike={onLike} onReply={onReply} expanded={false} onToggle={() => {}} depth={1} />
      ))}
    </div>
  );
}

function ReelItem({ reel, active, onLike, onSave, onComment, onShare, onProduct, onDelete, isOwner, isVendedor, onUpload }: {
  reel: Reel; active: boolean; isOwner: boolean; isVendedor: boolean;
  onLike: (r: Reel) => void; onSave: (r: Reel) => void; onComment: (r: Reel) => void;
  onShare: (r: Reel) => void; onProduct: (r: Reel) => void; onDelete: (r: Reel) => void;
  onUpload: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const mediaUrl = fixUrl(reel.archivo);
  const fotoUrl  = fixUrl(reel.usuario_foto);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || reel.tipo !== 'video') return;
    if (active && !paused) { v.play().catch(() => {}); }
    else { v.pause(); }
  }, [active, paused]);

  const handleTap = () => {
    if (reel.tipo !== 'video') return;
    setPaused(p => !p);
  };

  return (
    <div className="reel-item" data-id={reel.id}>
      <div className="reel-inner">

        {/* Columna video (9:16) */}
        <div className="reel-video-col" onClick={handleTap}>
          {reel.tipo === 'video'
            ? <video ref={videoRef} src={mediaUrl} loop playsInline className="reel-media-el" />
            : <img src={mediaUrl} alt={reel.titulo ?? ''} className="reel-media-el" />}
          {reel.tipo === 'video' && paused && <div className="reel-pause-icon">▶</div>}

          {/* Info sobre el video */}
          <div className="reel-info">
            <div className="reel-author">
              <div className="reel-author-avatar">
                {fotoUrl ? <img src={fotoUrl} alt="" /> : (reel.usuario_nombre[0] ?? '?').toUpperCase()}
              </div>
              <span className="reel-author-name">@{reel.usuario_username ?? reel.usuario_nombre}</span>
            </div>
            {reel.titulo && <div className="reel-title">{reel.titulo}</div>}
            {reel.descripcion && <div className="reel-desc">{reel.descripcion}</div>}
            {reel.producto_id && reel.producto_nombre && (
              <button className="reel-product-chip" onClick={e => { e.stopPropagation(); onProduct(reel); }}>
                🛍 {reel.producto_nombre}{reel.producto_precio ? `  $${Number(reel.producto_precio).toFixed(2)}` : ''} →
              </button>
            )}
          </div>
        </div>

        {/* Columna acciones (derecha del video) */}
        <div className="reel-actions-col">
          {isVendedor && (
            <button className="reel-act-btn reel-act-upload" onClick={onUpload} title="Subir reel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="24" height="24">
                <line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 5 19 12"/>
              </svg>
              <span>Subir</span>
            </button>
          )}
          <button className={`reel-act-btn${reel.me_gusta ? ' liked' : ''}`} onClick={() => onLike(reel)}>
            <svg viewBox="0 0 24 24" fill={reel.me_gusta ? '#ef4444' : 'none'} stroke={reel.me_gusta ? '#ef4444' : '#fff'} strokeWidth="2" width="32" height="32">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>{fmt(reel.likes_count)}</span>
          </button>
          <button className="reel-act-btn" onClick={() => onComment(reel)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="30" height="30">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>{fmt(reel.comentarios_count)}</span>
          </button>
          <button className={`reel-act-btn${reel.guardado ? ' saved' : ''}`} onClick={() => onSave(reel)}>
            <svg viewBox="0 0 24 24" fill={reel.guardado ? '#fbbf24' : 'none'} stroke={reel.guardado ? '#fbbf24' : '#fff'} strokeWidth="2" width="28" height="28">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            <span>{fmt(reel.guardados_count)}</span>
          </button>
          <button className="reel-act-btn" onClick={() => onShare(reel)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="26" height="26">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <span>Compartir</span>
          </button>
          {isOwner && (
            <button className="reel-act-btn reel-act-delete" onClick={() => onDelete(reel)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" width="24" height="24">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
              <span style={{ color: '#ef4444' }}>Borrar</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

export default function Reels() {
  const navigate   = useNavigate();
  const { user }   = useGlobal();
  const u          = user as any;
  const isVendedor = u?.role === 'vendedor' || u?.rol === 'vendedor';
  const isLoggedIn = !!user;

  const [reels, setReels]         = useState<Reel[]>([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  const [comVisible, setComVisible]   = useState(false);
  const [activeReel, setActiveReel]   = useState<Reel | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [comLoading, setComLoading]   = useState(false);
  const [comTexto, setComTexto]       = useState('');
  const [replyTo, setReplyTo]         = useState<Comentario | null>(null);
  const [expanded, setExpanded]       = useState<Set<number>>(new Set());
  const [sending, setSending]         = useState(false);
  const comInputRef = useRef<HTMLInputElement>(null);

  const [upVisible, setUpVisible]       = useState(false);
  const [upFile, setUpFile]             = useState<File | null>(null);
  const [upPreview, setUpPreview]       = useState('');
  const [upTitulo, setUpTitulo]         = useState('');
  const [upDesc, setUpDesc]             = useState('');
  const [upProductoId, setUpProductoId] = useState<number | null>(null);
  const [upProductos, setUpProductos]   = useState<Producto[]>([]);
  const [uploading, setUploading]       = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.setProperty('overflow', 'hidden', 'important');
    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    return () => {
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow');
    };
  }, []);

  const cargar = useCallback(async (reset = false) => {
    const p = reset ? 1 : page;
    if (!reset && !hasMore) return;
    if (reset) setLoading(true);
    try {
      const res = await api.get(`/reels.php?action=feed&page=${p}`);
      if (res.data.ok && res.data.reels) {
        setReels(prev => reset ? res.data.reels : [...prev, ...res.data.reels]);
        setPage(p + 1);
        setHasMore(res.data.reels.length === 10);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, hasMore]);

  useEffect(() => { void cargar(true); }, []);

  useEffect(() => {
    if (!isVendedor) return;
    api.get('/vendedor_dashboard.php?action=mis_productos')
      .then(r => { if (r.data.ok) setUpProductos(r.data.productos ?? []); })
      .catch(() => {});
  }, [isVendedor]);

  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollTop / el.clientHeight);
      setActiveIdx(idx);
      if (idx >= reels.length - 2 && hasMore) void cargar();
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [reels.length, hasMore]);

  const toggleLike = async (reel: Reel) => {
    const snap = { me_gusta: reel.me_gusta, likes_count: reel.likes_count };
    setReels(rs => rs.map(r => r.id === reel.id ? { ...r, me_gusta: !r.me_gusta, likes_count: r.me_gusta ? r.likes_count - 1 : r.likes_count + 1 } : r));
    try {
      const res = await api.post('/reels.php?action=toggle_like', { reel_id: reel.id });
      if (res.data.ok && res.data.likes_count !== undefined)
        setReels(rs => rs.map(r => r.id === reel.id ? { ...r, likes_count: res.data.likes_count } : r));
    } catch { setReels(rs => rs.map(r => r.id === reel.id ? { ...r, ...snap } : r)); }
  };

  const toggleSave = async (reel: Reel) => {
    const snap = { guardado: reel.guardado, guardados_count: reel.guardados_count };
    setReels(rs => rs.map(r => r.id === reel.id ? { ...r, guardado: !r.guardado, guardados_count: r.guardado ? r.guardados_count - 1 : r.guardados_count + 1 } : r));
    try {
      await api.post('/reels.php?action=toggle_guardado', { reel_id: reel.id });
    } catch { setReels(rs => rs.map(r => r.id === reel.id ? { ...r, ...snap } : r)); }
  };

  const abrirComentarios = async (reel: Reel) => {
    setActiveReel(reel);
    setComVisible(true);
    setComLoading(true);
    setComentarios([]); setExpanded(new Set()); setReplyTo(null);
    try {
      const r = await api.get(`/reels.php?action=comentarios&reel_id=${reel.id}`);
      if (r.data.ok) setComentarios(r.data.comentarios ?? []);
    } catch {}
    finally { setComLoading(false); }
  };

  const enviarComentario = async () => {
    if (!comTexto.trim() || !activeReel) return;
    const texto = comTexto.trim(); setComTexto(''); setSending(true);
    try {
      const body: Record<string, unknown> = { reel_id: activeReel.id, comentario: texto };
      if (replyTo) body.parent_id = replyTo.id;
      const res = await api.post('/reels.php?action=comentar', body);
      if (res.data.ok && res.data.comentario) {
        if (replyTo) {
          setComentarios(cs => cs.map(c => c.id === replyTo.id ? { ...c, respuestas_count: (c.respuestas_count ?? 0) + 1, respuestas: [...(c.respuestas ?? []), res.data.comentario] } : c));
          setExpanded(e => new Set([...e, replyTo.id]));
        } else { setComentarios(cs => [res.data.comentario, ...cs]); }
        if (res.data.total !== undefined)
          setReels(rs => rs.map(r => r.id === activeReel.id ? { ...r, comentarios_count: res.data.total } : r));
      }
    } catch {}
    finally { setSending(false); setReplyTo(null); }
  };

  const likeComentario = async (com: Comentario) => {
    const toggle = (list: Comentario[]): Comentario[] =>
      list.map(c => {
        if (c.id === com.id) return { ...c, me_gusta: !c.me_gusta, likes_count: c.me_gusta ? c.likes_count - 1 : c.likes_count + 1 };
        if (c.respuestas?.length) return { ...c, respuestas: toggle(c.respuestas) };
        return c;
      });
    setComentarios(toggle);
    try { await api.post('/reels.php?action=toggle_like_comentario', { comentario_id: com.id }); } catch {}
  };

  const compartir = (reel: Reel) => {
    const text = `${reel.titulo ?? 'Mira este reel en SVGo'}${reel.descripcion ? '\n' + reel.descripcion : ''}`;
    if (navigator.share) {
      navigator.share({ title: reel.titulo ?? 'SVGo', text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => alert('¡Enlace copiado!'));
    }
  };

  const eliminar = async (reel: Reel) => {
    if (!confirm('¿Eliminar este reel?')) return;
    try {
      const res = await api.post('/reels.php?action=eliminar', { reel_id: reel.id });
      if (res.data.ok) setReels(rs => rs.filter(r => r.id !== reel.id));
    } catch {}
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUpFile(f);
    setUpPreview(URL.createObjectURL(f));
  };

  const publicar = async () => {
    if (!upFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('archivo', upFile);
      if (upTitulo) fd.append('titulo', upTitulo);
      if (upDesc)   fd.append('descripcion', upDesc);
      if (upProductoId) fd.append('producto_id', String(upProductoId));
      const token = localStorage.getItem('lm_token_v1');
      const headers: Record<string, string> = { 'ngrok-skip-browser-warning': 'true' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res  = await fetch(`${API_URL}/reels.php?action=subir`, { method: 'POST', headers, body: fd });
      const data = await res.json();
      if (data.ok) {
        setUpVisible(false);
        setUpFile(null); setUpPreview(''); setUpTitulo(''); setUpDesc(''); setUpProductoId(null);
        void cargar(true);
      } else { alert(data.error ?? 'Error al publicar'); }
    } catch (e) { alert('Error: ' + String(e)); }
    finally { setUploading(false); }
  };

  return (
    <div className="reels-main-wrapper">
      <Header activeTab="reels" />

      <div className="reels-layout">
        {/* Feed central */}
        <div className="reels-feed" ref={feedRef}>
          {loading && reels.length === 0 ? (
            <div className="reels-loading">
              <div className="reels-spinner" />
              <p>Cargando reels...</p>
            </div>
          ) : reels.length === 0 ? (
            <div className="reels-empty">
              <div style={{ fontSize: '4rem' }}>🎬</div>
              <h3>Sin reels aún</h3>
              <p>{isVendedor ? 'Sé el primero en publicar un reel' : 'Aún no hay reels disponibles'}</p>
              {isVendedor && (
                <button className="reels-upload-btn" onClick={() => setUpVisible(true)}>+ Subir primer reel</button>
              )}
            </div>
          ) : (
            reels.map((reel, idx) => (
              <ReelItem
                key={reel.id}
                reel={reel}
                active={idx === activeIdx}
                isOwner={!!u && u.id === reel.usuario_id}
                isVendedor={isVendedor}
                onLike={toggleLike}
                onSave={toggleSave}
                onComment={abrirComentarios}
                onShare={compartir}
                onProduct={r => r.producto_id && navigate(`/market?producto=${r.producto_id}`)}
                onDelete={eliminar}
                onUpload={() => setUpVisible(true)}
              />
            ))
          )}
          {isVendedor && reels.length > 0 && (
            <button className="reels-fab" onClick={() => setUpVisible(true)} title="Subir reel">+</button>
          )}
        </div>

        {/* Panel comentarios */}
        <div className={`reels-comments-panel${comVisible ? ' open' : ''}`}>
          <div className="rcp-header">
            <span className="rcp-title">Comentarios{comentarios.length > 0 ? ` · ${comentarios.length}` : ''}</span>
            <button className="rcp-close" onClick={() => setComVisible(false)}>✕</button>
          </div>
          <div className="rcp-list">
            {comLoading ? (
              <div className="rcp-loading"><div className="reels-spinner" /></div>
            ) : comentarios.length === 0 ? (
              <p className="rcp-empty">Sin comentarios aún. ¡Sé el primero!</p>
            ) : (
              comentarios.map(c => (
                <ComItem
                  key={c.id} c={c}
                  onLike={likeComentario}
                  onReply={c => {
                    setReplyTo(c);
                    setComTexto(`@${c.usuario_nombre} `);
                    setTimeout(() => comInputRef.current?.focus(), 100);
                  }}
                  expanded={expanded.has(c.id)}
                  onToggle={id => setExpanded(e => { const n = new Set(e); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                />
              ))
            )}
          </div>
          {replyTo && (
            <div className="rcp-reply-bar">
              <span>Respondiendo a <strong>{replyTo.usuario_nombre}</strong></span>
              <button onClick={() => { setReplyTo(null); setComTexto(''); }}>✕</button>
            </div>
          )}
          {isLoggedIn && (
            <div className="rcp-input-row">
              <input
                ref={comInputRef}
                className="rcp-input"
                placeholder="Escribe un comentario..."
                value={comTexto}
                onChange={e => setComTexto(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarComentario()}
                maxLength={500}
              />
              <button
                className="rcp-send"
                onClick={enviarComentario}
                disabled={!comTexto.trim() || sending}
              >
                {sending ? '...' : '➤'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal subir reel */}
      {upVisible && (
        <div className="reels-modal-bg" onClick={e => e.target === e.currentTarget && setUpVisible(false)}>
          <div className="reels-modal">
            <div className="reels-modal-head">
              <h3>Subir Reel</h3>
              <button onClick={() => setUpVisible(false)}>✕</button>
            </div>
            <div className="reels-modal-body">
              {upPreview ? (
                <div className="up-preview">
                  {upFile?.type.startsWith('video')
                    ? <video src={upPreview} controls className="up-preview-media" />
                    : <img src={upPreview} alt="" className="up-preview-media" />}
                  <button className="up-change" onClick={() => { setUpFile(null); setUpPreview(''); }}>Cambiar</button>
                </div>
              ) : (
                <label className="up-pick">
                  <input type="file" accept="video/*,image/*" onChange={onFileChange} style={{ display: 'none' }} />
                  <div className="up-pick-inner">
                    <span style={{ fontSize: '2.5rem' }}>📁</span>
                    <span>Seleccionar video o imagen</span>
                    <small>Video máx. 60s · Foto 9:16</small>
                  </div>
                </label>
              )}
              <input className="up-input" placeholder="Título (opcional)" value={upTitulo} onChange={e => setUpTitulo(e.target.value)} maxLength={80} />
              <textarea className="up-input up-textarea" placeholder="Descripción (opcional)" value={upDesc} onChange={e => setUpDesc(e.target.value)} maxLength={300} rows={3} />
              <select className="up-input" value={upProductoId ?? ''} onChange={e => setUpProductoId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Sin producto vinculado</option>
                {upProductos.map(p => <option key={p.id} value={p.id}>{p.nombre} — ${Number(p.precio).toFixed(2)}</option>)}
              </select>
              <button className="up-publish" onClick={publicar} disabled={!upFile || uploading}>
                {uploading ? 'Publicando...' : '🚀 Publicar Reel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
