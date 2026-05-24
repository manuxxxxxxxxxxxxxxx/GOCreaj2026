import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Eye, EyeOff, X } from 'lucide-react';
import { api } from '../api';
import './Dashboard.css';

interface AdminProduct {
  id: string;
  emoji: string;
  name: string;
  seller: string;
  category: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive' | 'flagged';
}

const CATEGORIES = ['panadería', 'bebidas', 'frutas', 'carnes', 'verduras', 'lácteos', 'otros'];

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: 'Activo',     color: '#10b981', bg: '#d1fae5' },
  inactive: { label: 'Inactivo',   color: '#6b7280', bg: '#f3f4f6' },
  flagged:  { label: 'Reportado',  color: '#ef4444', bg: '#fee2e2' },
};

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null);

  // Form state
  const [form, setForm] = useState({ emoji: '🛍️', name: '', seller: '', category: 'panadería', price: '', stock: '' });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/admin_dashboard.php?action=productos');
      if (res.data.ok) {
        setProducts(res.data.productos.map((p: any) => ({
          id: p.id.toString(),
          emoji: '🛍️',
          name: p.nombre,
          seller: p.tienda_nombre || 'Tienda',
          category: p.categoria || 'otros',
          price: parseFloat(p.precio_unitario) || 0,
          stock: p.stock || 0,
          status: p.activo == '1' ? 'active' : 'inactive'
        })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = products.filter(p => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase()) || p.seller.toLowerCase().includes(search.toLowerCase());
    const mc = filterCat === 'all' || p.category === filterCat;
    const mst = filterStatus === 'all' || p.status === filterStatus;
    return ms && mc && mst;
  });

  const openAdd = () => {
    setEditProduct(null);
    setForm({ emoji: '🛍️', name: '', seller: '', category: 'panadería', price: '', stock: '' });
    setShowModal(true);
  };

  const openEdit = (p: AdminProduct) => {
    setEditProduct(p);
    setForm({ emoji: p.emoji, name: p.name, seller: p.seller, category: p.category, price: String(p.price), stock: String(p.stock) });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.price) return;
    const updated: AdminProduct = {
      id: editProduct?.id ?? `P${Date.now()}`,
      emoji: form.emoji || '🛍️',
      name: form.name,
      seller: form.seller,
      category: form.category,
      price: parseFloat(form.price) || 0,
      stock: parseInt(form.stock) || 0,
      status: editProduct?.status ?? 'active',
    };
    if (editProduct) {
      setProducts(prev => prev.map(p => p.id === editProduct.id ? updated : p));
    } else {
      setProducts(prev => [...prev, updated]);
    }
    setShowModal(false);
  };

  const deleteProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));

  const toggleStatus = (id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p));
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Gestión de Productos</h1>
        <p>Revisa, edita y modera el catálogo completo de la plataforma.</p>
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total Productos', value: products.length, color: '#4A6D8C', bg: '#e8f0f7' },
          { label: 'Activos', value: products.filter(p => p.status === 'active').length, color: '#10b981', bg: '#d1fae5' },
          { label: 'Inactivos', value: products.filter(p => p.status === 'inactive').length, color: '#6b7280', bg: '#f3f4f6' },
          { label: 'Reportados', value: products.filter(p => p.status === 'flagged').length, color: '#ef4444', bg: '#fee2e2' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: 18, gap: 12 }}>
            <div className="stat-icon" style={{ background: s.bg, color: s.color, width: 40, height: 40, borderRadius: 12, fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {s.value}
            </div>
            <div className="stat-info">
              <h3 style={{ fontSize: '1.5rem', color: s.color }}>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '320px' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Buscar producto o tienda..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: '0.88rem', outline: 'none', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }} />
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: '0.88rem', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', cursor: 'pointer' }}>
            <option value="all">Todas las categorías</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: '0.88rem', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', cursor: 'pointer' }}>
            <option value="all">Todos los estados</option>
            {Object.keys(STATUS_LABELS).map(s => <option key={s} value={s}>{STATUS_LABELS[s].label}</option>)}
          </select>
          <button onClick={openAdd}
            style={{ marginLeft: 'auto', padding: '9px 18px', borderRadius: 10, border: 'none', background: '#355068', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
            <Plus size={16} /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {['', 'Nombre', 'Tienda', 'Categoría', 'Precio', 'Stock', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const sc = STATUS_LABELS[p.status];
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '14px 16px', fontSize: '1.6rem' }}>{p.emoji}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{p.name}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.seller}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{p.category}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)' }}>${p.price.toFixed(2)}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '0.88rem', color: p.stock === 0 ? '#ef4444' : 'var(--text)' }}>{p.stock} u.</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 20, background: sc.bg, color: sc.color, fontSize: '0.75rem', fontWeight: 700 }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(p)} title="Editar"
                          style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', color: '#4A6D8C', fontFamily: 'inherit' }}>
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => toggleStatus(p.id)} title="Activar/Desactivar"
                          style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'inherit' }}>
                          {p.status === 'active' ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button onClick={() => deleteProduct(p.id)} title="Eliminar"
                          style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', color: '#ef4444', fontFamily: 'inherit' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>No se encontraron productos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--white)', borderRadius: 24, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
            <div style={{ background: 'linear-gradient(135deg, #355068, #4A6D8C)', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem' }}>{editProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><X size={16} /></button>
            </div>
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Emoji', key: 'emoji', type: 'text', placeholder: '🥖' },
                { label: 'Nombre del Producto', key: 'name', type: 'text', placeholder: 'Pan Integral...' },
                { label: 'Tienda / Vendedor', key: 'seller', type: 'text', placeholder: 'Panadería...' },
                { label: 'Precio ($)', key: 'price', type: 'number', placeholder: '0.00' },
                { label: 'Stock', key: 'stock', type: 'number', placeholder: '0' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={(form as Record<string, string>)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: '0.9rem', outline: 'none', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Categoría</label>
                <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: '0.9rem', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancelar
                </button>
                <button onClick={handleSave}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#355068', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {editProduct ? 'Guardar Cambios' : 'Agregar Producto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
