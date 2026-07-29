import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useGlobal } from '../context/GlobalContext';
import { api, API_URL } from '../api';
import '../../css/dark.css';

// ─── Tipos ─────────────────────────────────────────────────────────────────
interface Reel {
  id: number;
  video?: string;
  imagen?: string;
  nombre: string;
  precio: number;
  descripcion: string;
  tienda_nombre: string;
  tienda_id?: number;
  vendedor_id?: number;
  municipio?: string;
  likes_count: number;
  comentarios_count: number;
  compartidos_count: number;
  seguidores_count?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  isFollowing?: boolean;
}

interface Comentario {
  id: number;
  usuario_id: number;
  comentario: string;
  created_at: string;
  nombre: string;
  foto_perfil?: string | null;
  parent_id?: number | null;
  likes_count?: number;
  yo_like?: number;
  respuestas?: Comentario[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function imgUri(p?: string | null): string | undefined {
  if (!p) return undefined;
  if (p.startsWith('data:') || p.startsWith('http')) return p;
  const m = p.match(/\/uploads\/(.+)$/);
  if (m) return `${API_URL}/uploads/${m[1]}`;
  return `${API_URL}/uploads/${p}`;
}

function buildTree(flat: Comentario[]): Comentario[] {
  const byId = new Map<number, Comentario>();
  const roots: Comentario[] = [];
  flat.forEach(c => byId.set(c.id, { ...c, respuestas: [] }));
  byId.forEach(c => {
    if (c.parent_id && byId.has(c.parent_id)) {
      const parent = byId.get(c.parent_id)!;
      parent.respuestas = parent.respuestas ?? [];
      parent.respuestas.push(c);
    } else {
      roots.push(c);
    }
  });
  return roots;
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ─── Componente principal ─────────────────────────────────────────────────
export default function Reels() {
  const navigate = useNavigate();
  const { user } = useGlobal();
  const [reels, setReels]       = useState<Reel[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [pausedMap, setPausedMap] = useState<Record<number, boolean>>({});
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const viewportRef = useRef<HTMLDivElement>(null);

  // Modales
  const [comOpen, setComOpen] = useState(false);
  const [comList, setComList] = useState<Comentario[]>([]);
  const [comTree, setComTree] = useState<Comentario[]>([]);
  const [comText, setComText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: number; nombre: string } | null>(null);
  const [activeReel, setActiveReel] = useState<Reel | null>(null);
  const [comLoading, setComLoading] = useState(false);

  const [toast, setToast] = useState('');

  // ─── Carga inicial ───
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    api.get('/productos.php?action=reels')
      .then(res => {
        if (res.data.ok && Array.isArray(res.data.reels)) {
          setReels(res.data.reels.map((r: any): Reel => ({
            id: r.id,
            video: r.video_url || r.video || undefined,
            imagen: r.imagen,
            nombre: r.nombre,
            precio: Number(r.precio) || 0,
            descripcion: r.descripcion || '',
            tienda_nombre: r.tienda_nombre || 'tienda',
            tienda_id: r.tienda_id,
            vendedor_id: r.vendedor_id,
            municipio: r.municipio,
            likes_count: Number(r.likes_count) || 0,
            comentarios_count: Number(r.comentarios_count) || 0,
            compartidos_count: Number(r.compartidos_count) || 0,
            seguidores_count: Number(r.seguidores_count) || 0,
            isFollowing: !!Number(r.yo_sigo),
          })));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ─── Scroll snap → cambia el activo ───
  useEffect(() => {
    const v = viewportRef.current;
    if (!v) return;
    const onScroll = () => {
      const idx = Math.round(v.scrollTop / v.clientHeight);
      if (idx !== activeIdx) setActiveIdx(idx);
    };
    v.addEventListener('scroll', onScroll, { passive: true });
    return () => v.removeEventListener('scroll', onScroll);
  }, [activeIdx]);

  // ─── Reproduce solo el activo, pausa los demás ───
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([id, el]) => {
      if (!el) return;
      const reel = reels[activeIdx];
      const isActive = reel && Number(id) === reel.id;
      const isPaused = pausedMap[Number(id)] ?? false;
      if (isActive && !isPaused) {
        el.play().catch(() => {/* autoplay bloqueado por navegador */});
      } else {
        el.pause();
      }
    });
  }, [activeIdx, reels, pausedMap]);

  // ─── Acciones ───
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2400); };

  const togglePause = (id: number) => {
    setPausedMap(p => ({ ...p, [id]: !(p[id] ?? false) }));
  };

  const toggleLike = async (r: Reel) => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await api.post('/interacciones.php?action=toggle_like', { producto_id: r.id });
      if (res.data.ok && res.data.contadores) {
        setReels(prev => prev.map(x => x.id === r.id
          ? { ...x, likes_count: res.data.contadores.likes, isLiked: res.data.accion === 'like' }
          : x));
      }
    } catch {}
  };

  const toggleSave = async (r: Reel) => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await api.post('/interacciones.php?action=toggle_guardar', { producto_id: r.id });
      if (res.data.ok) {
        setReels(prev => prev.map(x => x.id === r.id ? { ...x, isSaved: res.data.accion === 'guardar' } : x));
        showToast(res.data.accion === 'guardar' ? '✓ Guardado' : 'Eliminado de guardados');
      }
    } catch {}
  };

  const toggleFollow = async (r: Reel) => {
    if (!user) { navigate('/login'); return; }
    if (!r.tienda_id) return;
    try {
      const res = await api.post('/interacciones.php?action=seguir_tienda', { tienda_id: r.tienda_id });
      if (res.data.ok) {
        setReels(prev => prev.map(x => x.tienda_id === r.tienda_id
          ? { ...x, isFollowing: res.data.accion === 'follow', seguidores_count: res.data.total_seguidores ?? x.seguidores_count }
          : x));
      }
    } catch {}
  };

  // Reenviar el producto únicamente al chat de la tienda (para preguntar sobre él) — nunca a otros usuarios.
  const preguntarATienda = async (r: Reel) => {
    if (!user) { navigate('/login'); return; }
    try {
      await api.post('/chat_multi.php?action=desde_producto', {
        producto_id: r.id,
        mensaje: `Hola, tengo una pregunta sobre: ${r.nombre}`,
      });
    } catch { /* si falla el snapshot, igual abrimos el chat */ }
    navigate('/chat');
  };

  // ─── Comentarios ───
  const openComments = async (r: Reel) => {
    if (!user) { navigate('/login'); return; }
    setActiveReel(r);
    setComOpen(true);
    setComLoading(true);
    try {
      const res = await api.get(`/interacciones.php?action=listar_comentarios&producto_id=${r.id}`);
      const lista = res.data.ok ? res.data.comentarios ?? [] : [];
      setComList(lista);
      setComTree(buildTree(lista));
    } catch { setComList([]); setComTree([]); }
    setComLoading(false);
  };

  const sendComment = async () => {
    if (!activeReel || !comText.trim()) return;
    const body: any = { producto_id: activeReel.id, comentario: comText.trim() };
    if (replyTo) body.parent_id = replyTo.id;
    try {
      await api.post('/interacciones.php?action=comentar', body);
      setComText(''); setReplyTo(null);
      const res = await api.get(`/interacciones.php?action=listar_comentarios&producto_id=${activeReel.id}`);
      const lista = res.data.ok ? res.data.comentarios ?? [] : [];
      setComList(lista); setComTree(buildTree(lista));
      setReels(prev => prev.map(x => x.id === activeReel.id ? { ...x, comentarios_count: x.comentarios_count + 1 } : x));
    } catch {}
  };

  const toggleLikeComment = async (cid: number) => {
    try {
      const res = await api.post('/interacciones.php?action=like_comentario', { comentario_id: cid });
      if (res.data.ok) {
        const delta = res.data.accion === 'like' ? 1 : -1;
        const updated = comList.map(c => c.id === cid
          ? { ...c, likes_count: Math.max(0, (c.likes_count ?? 0) + delta), yo_like: res.data.accion === 'like' ? 1 : 0 }
          : c);
        setComList(updated); setComTree(buildTree(updated));
      }
    } catch {}
  };

  // ─── Render ───
  if (loading) return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#FFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (reels.length === 0) return (
    <>
      <Header />
      <div style={{ background: '#0A0A0A', minHeight: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#FFF', padding: 40, textAlign: 'center' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="72" height="72" style={{ opacity: 0.5 }}>
          <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
        <h2 style={{ marginTop: 18, fontWeight: 900 }}>No hay reels aún</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 6 }}>
          Cuando los vendedores publiquen reels aparecerán aquí.
        </p>
      </div>
    </>
  );

  return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <div
        ref={viewportRef}
        style={{
          flex: 1,
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          scrollBehavior: 'smooth',
          position: 'relative',
        }}
      >
        {reels.map((r, idx) => {
          const isActive = idx === activeIdx;
          const isPaused = pausedMap[r.id] ?? false;
          return (
            <div
              key={r.id}
              style={{
                width: '100%',
                height: 'calc(100vh - 110px)',
                scrollSnapAlign: 'start',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#000',
              }}
            >
              {/* Media + click-to-pause */}
              <div
                onClick={() => togglePause(r.id)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: '#000',
                }}
              >
                {r.video ? (
                  <video
                    ref={el => { videoRefs.current[r.id] = el; }}
                    src={imgUri(r.video)}
                    poster={imgUri(r.imagen)}
                    loop
                    muted={false}
                    playsInline
                    preload="metadata"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      background: '#000',
                    }}
                  />
                ) : r.imagen ? (
                  <img
                    src={imgUri(r.imagen)}
                    alt={r.nombre}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 48 }}>📦</div>
                )}

                {/* Ícono de play cuando está pausado */}
                {isActive && isPaused && r.video && (
                  <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg viewBox="0 0 24 24" fill="#FFF" width="42" height="42"><path d="M8 5v14l11-7L8 5z"/></svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Overlay info (esquina inferior izquierda) */}
              <div style={{
                position: 'absolute',
                left: 0, right: 100, bottom: 0,
                padding: '20px 24px 32px',
                background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 100%)',
                pointerEvents: 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2" width="18" height="18"><path d="M3 9l1-6h16l1 6"/><path d="M3 9h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/></svg>
                  </div>
                  <div style={{ color: '#FFF', fontWeight: 900, fontSize: 15, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    @{r.tienda_nombre}
                  </div>
                  {r.vendedor_id && r.vendedor_id !== Number(user?.id) && (
                    <button
                      onClick={() => toggleFollow(r)}
                      style={{
                        pointerEvents: 'auto', marginLeft: 4,
                        background: r.isFollowing ? 'rgba(255,255,255,0.25)' : 'transparent',
                        border: '1.5px solid #FFF', color: '#FFF',
                        padding: '4px 14px', borderRadius: 99, cursor: 'pointer', fontWeight: 800, fontSize: 12,
                      }}
                    >
                      {r.isFollowing ? 'Siguiendo' : 'Seguir'}
                    </button>
                  )}
                </div>
                <div style={{ color: '#FFF', fontWeight: 800, fontSize: 18, marginBottom: 4, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                  {r.nombre}
                </div>
                {r.descripcion && (
                  <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, marginBottom: 10, maxWidth: 480, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                    {r.descripcion}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', pointerEvents: 'auto' }}>
                  <div style={{ background: 'rgba(74,109,140,0.9)', color: '#FFF', padding: '5px 14px', borderRadius: 99, fontWeight: 900 }}>
                    ${r.precio.toFixed(2)}
                  </div>
                  <button
                    onClick={() => navigate('/market')}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', color: '#FFF', padding: '5px 14px', borderRadius: 99, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                  >
                    Ver producto →
                  </button>
                </div>
              </div>

              {/* Acciones laterales (derecha) */}
              <div style={{
                position: 'absolute',
                right: 16, bottom: 90,
                display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center',
                background: 'rgba(0,0,0,0.35)', padding: '12px 8px', borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.12)',
              }}>
                <ActionBtn icon="❤️" label={fmtCount(r.likes_count)} active={!!r.isLiked} onClick={() => toggleLike(r)} />
                <ActionBtn icon="💬" label={fmtCount(r.comentarios_count)} onClick={() => openComments(r)} />
                <ActionBtn icon="🔖" label={r.isSaved ? 'Guardado' : 'Guardar'} active={!!r.isSaved} onClick={() => toggleSave(r)} />
                {r.vendedor_id && <ActionBtn icon="✉️" label="Preguntar" onClick={() => preguntarATienda(r)} />}
              </div>

              {/* Contador arriba derecha */}
              <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.45)', color: '#FFF', padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 800 }}>
                {idx + 1} / {reels.length}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal Comentarios ── */}
      {comOpen && (
        <div onClick={() => setComOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg, #fff)', width: '100%', maxWidth: 560, height: '78vh',
            borderTopLeftRadius: 24, borderTopRightRadius: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1.5px solid var(--border, #e2e8f0)' }}>
              <strong>Comentarios · {comList.length}</strong>
              <button onClick={() => setComOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {comLoading ? (
                <div style={{ textAlign: 'center', padding: 30 }}>Cargando...</div>
              ) : comTree.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted, #6b7280)', padding: 30 }}>Sé el primero en comentar</div>
              ) : (
                comTree.map(c => <CommentNode key={c.id} c={c} onReply={p => setReplyTo({ id: p.id, nombre: p.nombre })} onLike={toggleLikeComment} />)
              )}
            </div>

            {replyTo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--bg-secondary, #F9FAFB)', borderTop: '1px solid var(--border, #e2e8f0)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>↳ Respondiendo a <strong>{replyTo.nombre}</strong></span>
                <button onClick={() => setReplyTo(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, padding: 14, borderTop: '1.5px solid var(--border, #e2e8f0)' }}>
              <input
                type="text"
                value={comText}
                onChange={e => setComText(e.target.value)}
                placeholder={replyTo ? `Responder a ${replyTo.nombre}...` : 'Escribe un comentario...'}
                onKeyDown={e => { if (e.key === 'Enter') sendComment(); }}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 99, border: '1.5px solid var(--border, #e2e8f0)', outline: 'none', fontFamily: 'inherit', fontSize: 14 }}
              />
              <button
                onClick={sendComment}
                disabled={!comText.trim()}
                style={{ width: 42, height: 42, borderRadius: 21, border: 'none', background: comText.trim() ? '#2563EB' : '#cbd5e1', color: '#FFF', cursor: 'pointer', fontSize: 16 }}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', background: '#0F172A', color: '#FFF', padding: '12px 24px', borderRadius: 99, fontWeight: 700, fontSize: 14, zIndex: 9999, boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Action button ───
function ActionBtn({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        color: '#FFF', padding: 0,
      }}
    >
      <div style={{ fontSize: 24, lineHeight: 1, opacity: active ? 1 : 0.95, transform: active ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.15s' }}>
        {icon}
      </div>
      <span style={{ fontSize: 10, fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{label}</span>
    </button>
  );
}

// ─── Recursive comment node ───
function CommentNode({ c, depth = 0, onReply, onLike }: {
  c: Comentario; depth?: number;
  onReply: (c: Comentario) => void;
  onLike: (id: number) => void;
}) {
  return (
    <div style={{ marginLeft: depth * 22, marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 16, background: '#2563EB', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 12, overflow: 'hidden', flexShrink: 0 }}>
          {c.foto_perfil ? <img src={imgUri(c.foto_perfil)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.nombre.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ background: 'var(--bg-secondary, #F9FAFB)', borderRadius: 14, padding: 10, border: '1px solid var(--border, #e2e8f0)' }}>
            <div style={{ fontWeight: 800, fontSize: 12 }}>{c.nombre}</div>
            <div style={{ marginTop: 2, fontSize: 13, lineHeight: 1.45 }}>{c.comentario}</div>
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 6, marginLeft: 4, alignItems: 'center' }}>
            <button onClick={() => onLike(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, color: c.yo_like ? '#EF4444' : 'var(--text-muted, #6b7280)', fontWeight: 700, fontSize: 11 }}>
              <span>{c.yo_like ? '❤️' : '🤍'}</span>
              <span>{c.likes_count ?? 0}</span>
            </button>
            <button onClick={() => onReply(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #6b7280)', fontWeight: 700, fontSize: 11 }}>
              Responder
            </button>
          </div>
        </div>
      </div>
      {c.respuestas?.map(r => <CommentNode key={r.id} c={r} depth={depth + 1} onReply={onReply} onLike={onLike} />)}
    </div>
  );
}
