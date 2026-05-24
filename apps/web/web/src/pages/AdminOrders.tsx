import { useState } from 'react';
import { Search, Eye, CheckCircle, Clock, XCircle, Truck } from 'lucide-react';
import './Dashboard.css';

type OrderStatus = 'pending' | 'preparing' | 'shipping' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  customer: string;
  seller: string;
  driver: string | null;
  items: string;
  total: number;
  status: OrderStatus;
  date: string;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pendiente',   color: '#f59e0b', bg: '#fef3c7', icon: <Clock size={13} /> },
  preparing: { label: 'Preparando',  color: '#3b82f6', bg: '#dbeafe', icon: <CheckCircle size={13} /> },
  shipping:  { label: 'En Camino',   color: '#8b5cf6', bg: '#ede9fe', icon: <Truck size={13} /> },
  delivered: { label: 'Entregado',   color: '#10b981', bg: '#d1fae5', icon: <CheckCircle size={13} /> },
  cancelled: { label: 'Cancelado',   color: '#ef4444', bg: '#fee2e2', icon: <XCircle size={13} /> },
};

const INITIAL_ORDERS: Order[] = [
  { id: 'LM-0012', customer: 'Ana García',      seller: 'Panadería Don José',    driver: 'Luis Torres',  items: '2x Pan Integral, 1x Café 250g', total: 16.85, status: 'delivered', date: '24 May, 14:30' },
  { id: 'LM-0013', customer: 'María Fernanda',  seller: 'FrutaFresh Market',     driver: null,           items: '3x Plátanos, 2x Manzanas',      total: 8.40,  status: 'pending',   date: '24 May, 15:00' },
  { id: 'LM-0014', customer: 'Carlos Mendoza',  seller: 'Café & Co.',            driver: 'Repartidor 2', items: '1x Café Latte, 1x Croissant',   total: 6.75,  status: 'preparing', date: '24 May, 15:20' },
  { id: 'LM-0015', customer: 'Laura Pérez',     seller: 'Carnes Premium',        driver: 'Luis Torres',  items: '500g Carne Molida',              total: 14.00, status: 'shipping',  date: '24 May, 13:50' },
  { id: 'LM-0016', customer: 'Roberto Salinas', seller: 'Panadería Don José',    driver: null,           items: '1x Baguette',                   total: 3.50,  status: 'cancelled', date: '24 May, 12:10' },
  { id: 'LM-0017', customer: 'Sofía Ramírez',   seller: 'Verduras Orgánicas',    driver: 'Repartidor 3', items: '1x Mix Verduras, 2x Aguacate',   total: 18.60, status: 'delivered', date: '24 May, 11:45' },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filtered = orders.filter(o => {
    const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
                        o.customer.toLowerCase().includes(search.toLowerCase()) ||
                        o.seller.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const updateStatus = (id: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, status } : prev);
  };

  const totalByStatus = (s: OrderStatus) => orders.filter(o => o.status === s).length;

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Gestión de Pedidos</h1>
        <p>Supervisa y actualiza el estado de todos los pedidos de la plataforma.</p>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
        {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map(s => (
          <div
            key={s}
            className="stat-card"
            style={{ padding: '18px', gap: '12px', cursor: 'pointer', border: filterStatus === s ? `2px solid ${STATUS_CONFIG[s].color}` : undefined }}
            onClick={() => setFilterStatus(prev => prev === s ? 'all' : s)}
          >
            <div className="stat-icon" style={{ background: STATUS_CONFIG[s].bg, color: STATUS_CONFIG[s].color, width: 40, height: 40, borderRadius: 12 }}>
              {STATUS_CONFIG[s].icon}
            </div>
            <div className="stat-info">
              <h3 style={{ fontSize: '1.5rem' }}>{totalByStatus(s)}</h3>
              <p>{STATUS_CONFIG[s].label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '360px' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por ID, cliente o tienda..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: '0.88rem', outline: 'none', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }}
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as OrderStatus | 'all')}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: '0.88rem', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <option value="all">Todos los estados</option>
            {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
          <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{filtered.length} pedidos</span>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {['ID', 'Cliente', 'Tienda', 'Artículos', 'Total', 'Estado', 'Fecha', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const sc = STATUS_CONFIG[order.status];
                return (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--blue)', fontSize: '0.85rem' }}>{order.id}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{order.customer}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{order.seller}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.items}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)' }}>${order.total.toFixed(2)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: sc.bg, color: sc.color, fontSize: '0.75rem', fontWeight: 700 }}>
                        {sc.icon} {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{order.date}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'inherit' }}
                        >
                          <Eye size={13} /> Ver
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    No se encontraron pedidos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--white)', borderRadius: 24, width: '100%', maxWidth: '520px', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, #355068, #4A6D8C)', padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.25rem', marginBottom: 4 }}>Pedido {selectedOrder.id}</h2>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem' }}>{selectedOrder.date}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <XCircle size={18} />
              </button>
            </div>
            {/* Modal Body */}
            <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                ['Cliente', selectedOrder.customer],
                ['Tienda', selectedOrder.seller],
                ['Repartidor', selectedOrder.driver ?? 'Sin asignar'],
                ['Artículos', selectedOrder.items],
                ['Total', `$${selectedOrder.total.toFixed(2)}`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
                </div>
              ))}

              {/* Status Update */}
              <div>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actualizar Estado</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map(s => {
                    const sc = STATUS_CONFIG[s];
                    const isActive = selectedOrder.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => updateStatus(selectedOrder.id, s)}
                        style={{
                          padding: '7px 14px', borderRadius: 20, border: `2px solid ${isActive ? sc.color : 'var(--border)'}`,
                          background: isActive ? sc.bg : 'transparent', color: isActive ? sc.color : 'var(--text-muted)',
                          fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'inherit', transition: 'all 0.2s'
                        }}
                      >
                        {sc.icon} {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                style={{ marginTop: '8px', padding: '12px', borderRadius: 12, border: 'none', background: '#355068', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
