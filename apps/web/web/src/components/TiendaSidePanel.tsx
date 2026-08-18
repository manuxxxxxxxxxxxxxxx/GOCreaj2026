import { useEffect, useState } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { useNavigate } from 'react-router-dom';
import { X, Star } from 'lucide-react';
import { api, API_URL } from '../api';

const ACCENT = '#1D5FD1';

interface TiendaDetalle {
  id: number;
  nombre: string;
  descripcion?: string | null;
  municipio: string;
  categoria?: string | null;
  logo?: string | null;
  portada?: string | null;
  calificacion_promedio?: number;
  total_resenas?: number;
  vendedor_id: number;
  seguidores_count: number;
  yo_sigo: number;
}

function imgUri(p?: string | null): string | undefined {
  if (!p) return undefined;
  if (p.startsWith('data:') || p.startsWith('http')) return p;
  const m = p.match(/\/uploads\/(.+)$/);
  return `${API_URL}/uploads/${m ? m[1] : p}`;
}

interface Props {
  tiendaId: number | null;
  onClose: () => void;
  onSelectProduct: (rawProduct: any) => void;
}

/** Panel lateral: al hacer clic en la tienda de un producto, muestra su ficha y el resto de su catálogo. */
export default function TiendaSidePanel({ tiendaId, onClose, onSelectProduct }: Props) {
  const { user } = useGlobal();
  const navigate = useNavigate();
  const [tienda, setTienda] = useState<TiendaDetalle | null>(null);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [siguiendo, setSiguiendo] = useState(false);
  const [seguidores, setSeguidores] = useState(0);

  useEffect(() => {
    if (!tiendaId) return;
    setLoading(true);
    Promise.all([
      api.get(`/productos.php?action=tienda_detalle&tienda_id=${tiendaId}`),
      api.get(`/productos.php?action=listar&tienda_id=${tiendaId}&limit=40`),
    ]).then(([resT, resP]) => {
      if (resT.data.ok) {
        setTienda(resT.data.tienda);
        setSiguiendo(!!Number(resT.data.tienda.yo_sigo));
        setSeguidores(Number(resT.data.tienda.seguidores_count) || 0);
      }
      if (resP.data.ok) setProductos(resP.data.productos || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [tiendaId]);

  const toggleSeguir = async () => {
    if (!user) { navigate('/login'); return; }
    if (!tiendaId) return;
    try {
      const res = await api.post('/interacciones.php?action=seguir_tienda', { tienda_id: tiendaId });
      if (res.data.ok) {
        setSiguiendo(res.data.accion === 'follow');
        setSeguidores(Number(res.data.total_seguidores) || 0);
      }
    } catch {}
  };

  if (!tiendaId) return null;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2500, display: 'flex', justifyContent: 'flex-end' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420, height: '100%', background: 'var(--bg, #fff)',
          overflowY: 'auto', boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
        }}
      >
        {loading || !tienda ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6B7280)' }}>Cargando tienda...</div>
        ) : (
          <>
            {/* Banner */}
            <div style={{ position: 'relative', height: 140, background: tienda.portada ? undefined : ACCENT }}>
              {tienda.portada && (
                <img src={imgUri(tienda.portada)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <button
                onClick={onClose}
                style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={17} strokeWidth={2.2} />
              </button>
            </div>

            <div style={{ padding: '0 20px 20px' }}>
              {/* Logo overlapping banner */}
              <div style={{
                width: 76, height: 76, borderRadius: '50%', border: '3px solid var(--bg, #fff)',
                marginTop: -38, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}>
                {tienda.logo
                  ? <img src={imgUri(tienda.logo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: '#fff', fontWeight: 900, fontSize: 28 }}>{tienda.nombre.charAt(0).toUpperCase()}</span>
                }
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 12, gap: 10 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>{tienda.nombre}</h2>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #6B7280)', marginTop: 2 }}>
                    {tienda.municipio}{tienda.categoria ? ` · ${tienda.categoria}` : ''}
                  </div>
                </div>
                <button
                  onClick={toggleSeguir}
                  style={{
                    padding: '8px 16px', borderRadius: 99, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0,
                    border: `1.5px solid ${ACCENT}`, background: siguiendo ? ACCENT : 'transparent', color: siguiendo ? '#fff' : ACCENT,
                  }}
                >
                  {siguiendo ? 'Siguiendo' : 'Seguir'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: '0.82rem', color: 'var(--text-muted, #6B7280)' }}>
                {tienda.calificacion_promedio ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Star size={13} strokeWidth={2} fill="#F59E0B" color="#F59E0B" />{Number(tienda.calificacion_promedio).toFixed(1)} ({tienda.total_resenas ?? 0})</span>
                ) : null}
                <span>{seguidores} seguidores</span>
              </div>

              {tienda.descripcion && (
                <p style={{ marginTop: 12, fontSize: '0.88rem', lineHeight: 1.5, color: 'var(--text)' }}>{tienda.descripcion}</p>
              )}

              <div style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-muted, #6B7280)', marginTop: 22, marginBottom: 12 }}>
                Productos de esta tienda ({productos.length})
              </div>

              {productos.length === 0 ? (
                <div style={{ color: 'var(--text-muted, #6B7280)', fontSize: '0.85rem' }}>Esta tienda no tiene productos publicados.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {productos.map((p: any) => (
                    <div
                      key={p.id}
                      onClick={() => { onSelectProduct(p); onClose(); }}
                      style={{ borderRadius: 12, border: '1.5px solid var(--border, #E2E8F0)', overflow: 'hidden', cursor: 'pointer', background: 'var(--card, #fff)' }}
                    >
                      <div style={{ height: 96, background: '#F1F5F9' }}>
                        <img src={imgUri(p.imagen) || 'https://via.placeholder.com/200'} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ padding: 8 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 900, color: ACCENT, marginTop: 2 }}>${Number(p.precio).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
