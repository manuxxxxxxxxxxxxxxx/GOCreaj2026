import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Eye, RefreshCw, XCircle, ShoppingBag } from 'lucide-react';
import { api } from '../api';
import './Dashboard.css';

type EstadoDB = 'preparacion' | 'en_camino' | 'entregado' | 'cancelado' | 'rechazado_repartidor';
type EstadoFiltro = EstadoDB | 'todos';

interface PedidoItem {
  id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  nombre?: string;
  imagen?: string | null;
}

interface Pedido {
  id: number;
  comprador_nombre: string;
  vendedor_nombre: string;
  repartidor_nombre?: string | null;
  total: number;
  estado: EstadoDB;
  metodo_pago: string;
  direccion_entrega: string;
  created_at: string;
  items?: PedidoItem[];
}

const ESTADOS: { id: EstadoDB; label: string; bg: string; color: string }[] = [
  { id: 'preparacion',  label: 'Preparando',  bg: '#fef3c7', color: '#92400e' },
  { id: 'en_camino',    label: 'En camino',   bg: '#dbeafe', color: '#1e40af' },
  { id: 'entregado',    label: 'Entregado',   bg: '#d1fae5', color: '#065f46' },
  { id: 'cancelado',    label: 'Cancelado',   bg: '#fee2e2', color: '#991b1b' },
  { id: 'rechazado_repartidor', label: 'Rechazado', bg: '#fee2e2', color: '#991b1b' },
];

function estadoConfig(estado: string) {
  return ESTADOS.find(e => e.id === estado) ?? { id: estado, label: estado, bg: '#f3f4f6', color: '#374151' };
}

export default function AdminOrders() {
  const [pedidos, setPedidos]           = useState<Pedido[]>([]);
  const [search, setSearch]             = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>('todos');
  const [verPedido, setVerPedido]       = useState<Pedido | null>(null);
  const [loading, setLoading]           = useState(true);
  const [lastRefresh, setLastRefresh]   = useState<Date>(new Date());
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPedidos = useCallback(async () => {
    try {
      const url = filtroEstado !== 'todos'
        ? `/admin_dashboard.php?action=pedidos&estado=${filtroEstado}`
        : '/admin_dashboard.php?action=pedidos';
      const res = await api.get(url);
      if (res.data.ok) {
        setPedidos(res.data.pedidos ?? []);
        setLastRefresh(new Date());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filtroEstado]);

  useEffect(() => {
    setLoading(true);
    void fetchPedidos();
  }, [fetchPedidos]);

  // Polling cada 10s
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => { void fetchPedidos(); }, 10000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchPedidos]);

  const actualizarEstado = async (pedidoId: number, nuevoEstado: EstadoDB) => {
    try {
      const res = await api.post('/admin_dashboard.php?action=actualizar_pedido', {
        pedido_id: pedidoId,
        estado: nuevoEstado,
      });
      if (res.data.ok) {
        setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, estado: nuevoEstado } : p));
        if (verPedido?.id === pedidoId) setVerPedido(prev => prev ? { ...prev, estado: nuevoEstado } : null);
      }
    } catch (e) {
      alert('Error actualizando estado');
    }
  };

  const filteredPedidos = pedidos.filter(p => {
    const q = search.toLowerCase();
    return (
      String(p.id).includes(q) ||
      (p.comprador_nombre || '').toLowerCase().includes(q) ||
      (p.vendedor_nombre || '').toLowerCase().includes(q)
    );
  });

  const contarEstado = (e: EstadoDB) => pedidos.filter(p => p.estado === e).length;

  return (
    <div className="dashboard">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>Gestión de Pedidos</h1>
          <p>Supervisa y actualiza el estado de todos los pedidos. Actualización automática cada 10s.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          {lastRefresh.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {ESTADOS.filter(e => e.id !== 'rechazado_repartidor').map(e => (
          <div
            key={e.id}
            style={{
              background: 'var(--white, #fff)', borderRadius: '14px', padding: '18px',
              border: `1.5px solid ${filtroEstado === e.id ? e.color : 'var(--border, #e2e8f0)'}`,
              cursor: 'pointer', transition: 'all 0.15s',
              boxShadow: filtroEstado === e.id ? `0 0 0 3px ${e.bg}` : 'none',
            }}
            onClick={() => setFiltroEstado(prev => prev === e.id ? 'todos' : e.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '12px', background: e.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: e.color }}>
                {e.id === 'preparacion' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12"/><polyline points="12 6 12 12 16 14"/></svg>}
                {e.id === 'en_camino' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>}
                {e.id === 'entregado' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg>}
                {e.id === 'cancelado' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: e.color, lineHeight: 1 }}>{contarEstado(e.id)}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginTop: '2px' }}>{e.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '360px' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por ID, cliente o vendedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '10px', border: '1.5px solid var(--border)', fontSize: '0.88rem', outline: 'none', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value as EstadoFiltro)}
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1.5px solid var(--border)', fontSize: '0.88rem', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <option value="todos">Todos los estados</option>
            {ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
          <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {filteredPedidos.length} pedido{filteredPedidos.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {['ID', 'Cliente', 'Vendedor', 'Total', 'Estado', 'Fecha', 'Acción'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando pedidos...</td></tr>
              ) : filteredPedidos.map(p => {
                const ec = estadoConfig(p.estado);
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '800', color: '#1D5FD1', fontSize: '0.85rem' }}>#SV-{p.id}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text)' }}>{p.comprador_nombre}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.vendedor_nombre}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '800', fontSize: '0.9rem', color: 'var(--text)' }}>${Number(p.total).toFixed(2)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', background: ec.bg, color: ec.color, fontSize: '0.75rem', fontWeight: '700' }}>
                        {ec.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(p.created_at).toLocaleDateString('es-SV')}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => setVerPedido(p)}
                        style={{ padding: '6px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text)', fontFamily: 'inherit' }}
                      >
                        <Eye size={13} /> Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredPedidos.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>No se encontraron pedidos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: Detalle pedido ── */}
      {verPedido && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => e.target === e.currentTarget && setVerPedido(null)}>
          <div style={{ background: 'var(--white, #fff)', borderRadius: '20px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #123F94, #1D5FD1)', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ color: '#fff', fontWeight: '800', fontSize: '1.2rem', margin: 0 }}>Pedido #SV-{verPedido.id}</h2>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', margin: '4px 0 0' }}>
                  {new Date(verPedido.created_at).toLocaleString('es-SV')}
                </p>
              </div>
              <button onClick={() => setVerPedido(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <XCircle size={18} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', padding: '24px 28px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Info */}
              {[
                ['Cliente', verPedido.comprador_nombre],
                ['Vendedor', verPedido.vendedor_nombre],
                ['Repartidor', verPedido.repartidor_nombre ?? 'Sin asignar'],
                ['Total', `$${Number(verPedido.total).toFixed(2)}`],
                ['Pago', verPedido.metodo_pago],
                ['Dirección', verPedido.direccion_entrega],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text)', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
                </div>
              ))}

              {/* Items */}
              {verPedido.items && verPedido.items.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '10px' }}>Productos</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {verPedido.items.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--bg)', borderRadius: '10px' }}>
                        {item.imagen ? (
                          <img src={item.imagen} alt={item.nombre} style={{ width: 40, height: 40, borderRadius: '8px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: '8px', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><ShoppingBag size={18} strokeWidth={1.8} /></div>
                        )}
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: '700', fontSize: '0.88rem', margin: 0, color: 'var(--text)' }}>{item.nombre ?? `Producto #${item.producto_id}`}</p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '2px 0 0' }}>x{item.cantidad} · ${Number(item.precio_unitario).toFixed(2)} c/u</p>
                        </div>
                        <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text)' }}>${(item.cantidad * Number(item.precio_unitario)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Estado actual */}
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '10px' }}>Estado actual</p>
                <div style={{ marginBottom: '12px' }}>
                  {(() => {
                    const ec = estadoConfig(verPedido.estado);
                    return (
                      <span style={{ padding: '6px 14px', borderRadius: '20px', background: ec.bg, color: ec.color, fontWeight: '800', fontSize: '0.85rem' }}>{ec.label}</span>
                    );
                  })()}
                </div>
                <p style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '10px' }}>Cambiar a</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {ESTADOS.filter(e => e.id !== verPedido.estado && e.id !== 'rechazado_repartidor').map(e => (
                    <button
                      key={e.id}
                      onClick={() => actualizarEstado(verPedido.id, e.id)}
                      style={{ padding: '7px 14px', borderRadius: '20px', border: `2px solid ${e.color}`, background: e.bg, color: e.color, fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' }}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border, #e2e8f0)' }}>
              <button onClick={() => setVerPedido(null)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: '#123F94', color: '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
