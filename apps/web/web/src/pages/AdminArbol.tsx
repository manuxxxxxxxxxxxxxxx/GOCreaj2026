import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Ban, CheckCircle2, Trash2, Users, Bike, ShoppingBag, Package, Film, RefreshCw, Search } from 'lucide-react';

interface UserNode { id: number; nombre: string; username?: string; email?: string; foto_perfil?: string | null; activo: 0 | 1; en_linea?: 0 | 1; }
interface ProductoNode { id: number; nombre: string; imagen?: string | null; precio: number; stock: number; activo: 0 | 1; es_reel: 0 | 1; tienda_nombre: string; tienda_id: number; vendedor_nombre: string; }
interface ReelNode { id: number; nombre: string; imagen?: string | null; activo: 0 | 1; es_reel: 0 | 1; tienda_nombre: string; vendedor_nombre: string; reportes: number; }
interface ArbolResp {
  ok: boolean;
  arbol?: { vendedores: UserNode[]; repartidores: UserNode[]; compradores: UserNode[]; productos: ProductoNode[]; reels: ReelNode[]; };
  error?: string;
}

type Grupo = 'vendedores' | 'repartidores' | 'compradores' | 'productos' | 'reels';

export default function AdminArbol() {
  const [data, setData] = useState<ArbolResp['arbol'] | null>(null);
  const [grupo, setGrupo] = useState<Grupo>('vendedores');
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin_dashboard.php?action=arbol_control');
      if (res.data?.ok) setData(res.data.arbol);
      else alert(res.data?.error ?? 'Error al cargar árbol');
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Error de red');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const banear = async (uid: number) => {
    if (!confirm('¿Confirmas el cambio de estado de esta cuenta?')) return;
    const r = await api.post('/admin_dashboard.php?action=banear_usuario', { usuario_id: uid });
    if (r.data?.ok) {
      setData(prev => {
        if (!prev) return prev;
        const upd = { ...prev };
        (['vendedores', 'repartidores', 'compradores'] as const).forEach(k => {
          upd[k] = upd[k].map(u => u.id === uid ? { ...u, activo: r.data.activo } : u);
        });
        return upd;
      });
    } else alert(r.data?.error ?? 'Error');
  };

  const eliminarProducto = async (pid: number) => {
    if (!confirm('¿Eliminar (suspender) este producto?')) return;
    const r = await api.post('/admin_dashboard.php?action=eliminar_producto', { producto_id: pid });
    if (r.data?.ok && data) setData({ ...data, productos: data.productos.map(p => p.id === pid ? { ...p, activo: 0 } : p) });
    else alert(r.data?.error ?? 'Error');
  };

  const eliminarReel = async (pid: number) => {
    if (!confirm('¿Eliminar este reel del feed público?')) return;
    const r = await api.post('/admin_dashboard.php?action=eliminar_reel', { producto_id: pid });
    if (r.data?.ok && data) setData({ ...data, reels: data.reels.filter(rl => rl.id !== pid) });
    else alert(r.data?.error ?? 'Error');
  };

  const tabs: Array<{ key: Grupo; label: string; icon: JSX.Element; count: number; color: string }> = [
    { key: 'vendedores',   label: 'Vendedores',   icon: <ShoppingBag size={18} />, count: data?.vendedores.length ?? 0,   color: '#2563EB' },
    { key: 'repartidores', label: 'Repartidores', icon: <Bike size={18} />,        count: data?.repartidores.length ?? 0, color: '#D97706' },
    { key: 'compradores',  label: 'Compradores',  icon: <Users size={18} />,       count: data?.compradores.length ?? 0,  color: '#6366F1' },
    { key: 'productos',    label: 'Productos',    icon: <Package size={18} />,     count: data?.productos.length ?? 0,    color: '#16A34A' },
    { key: 'reels',        label: 'Reels',        icon: <Film size={18} />,        count: data?.reels.length ?? 0,        color: '#EC4899' },
  ];

  const filtroFn = (s: string) => s.toLowerCase().includes(q.trim().toLowerCase());
  const userList = data ? (data[grupo === 'vendedores' || grupo === 'repartidores' || grupo === 'compradores' ? grupo : 'vendedores'] as UserNode[]) : [];

  return (
    <div style={{ padding: '8px 4px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 900, color: '#000', letterSpacing: -0.5 }}>Árbol de Control</h1>
          <p style={{ margin: '4px 0 0', color: '#475569', fontWeight: 600 }}>Mutaciones reales sobre la base de datos</p>
        </div>
        <button
          onClick={cargar}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFF', border: '1.5px solid #E2E8F0', padding: '10px 16px', borderRadius: 14, cursor: 'pointer', fontWeight: 700, color: '#0F172A', boxShadow: '0 2px 6px rgba(15,23,42,0.05)' }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Recargar
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        {tabs.map(tab => {
          const active = grupo === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setGrupo(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: active ? tab.color : '#FFF',
                color: active ? '#FFF' : '#000',
                border: `1.5px solid ${active ? tab.color : '#E2E8F0'}`,
                padding: '10px 16px',
                borderRadius: 22,
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '.92rem',
                boxShadow: active ? `0 6px 18px ${tab.color}44` : '0 2px 4px rgba(15,23,42,0.03)',
                transition: 'all .18s',
              }}
            >
              {tab.icon}
              {tab.label}
              <span style={{ background: active ? 'rgba(255,255,255,.25)' : tab.color, color: '#FFF', padding: '2px 9px', borderRadius: 14, fontSize: '.76rem' }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ position: 'relative', marginBottom: 18 }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Filtrar por nombre, email, tienda..."
          style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: 14, border: '1.5px solid #E2E8F0', fontSize: '.95rem', outline: 'none', background: '#FFF', color: '#000', fontWeight: 600 }}
        />
      </div>

      {loading && !data && <p style={{ color: '#64748B', textAlign: 'center', padding: 40 }}>Cargando árbol...</p>}

      {/* USERS */}
      {(grupo === 'vendedores' || grupo === 'repartidores' || grupo === 'compradores') && data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {userList.filter(u => filtroFn(u.nombre) || filtroFn(u.email ?? '') || filtroFn(u.username ?? '')).map(u => (
            <div key={u.id} style={{ background: '#FFF', borderRadius: 18, padding: 16, border: '1px solid #E2E8F0', boxShadow: '0 4px 14px rgba(15,23,42,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.05rem', flexShrink: 0 }}>
                {u.nombre[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: '#000', fontSize: '.97rem' }}>{u.nombre}</div>
                <div style={{ fontSize: '.78rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email ?? u.username ?? '—'}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                  <span style={{ background: u.activo ? '#DCFCE7' : '#FEE2E2', color: u.activo ? '#15803D' : '#B91C1C', padding: '3px 9px', borderRadius: 12, fontSize: '.7rem', fontWeight: 800 }}>
                    {u.activo ? 'ACTIVO' : 'SUSPENDIDO'}
                  </span>
                  {u.en_linea === 1 && <span style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '3px 9px', borderRadius: 12, fontSize: '.7rem', fontWeight: 800 }}>EN LÍNEA</span>}
                </div>
              </div>
              <button
                onClick={() => banear(u.id)}
                style={{ background: u.activo ? '#DC2626' : '#16A34A', color: '#FFF', border: 'none', borderRadius: 14, padding: '9px 14px', fontWeight: 800, fontSize: '.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: u.activo ? '0 4px 10px rgba(220,38,38,0.25)' : '0 4px 10px rgba(22,163,74,0.25)' }}
              >
                {u.activo ? <><Ban size={14} /> Banear</> : <><CheckCircle2 size={14} /> Activar</>}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* PRODUCTOS */}
      {grupo === 'productos' && data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14 }}>
          {data.productos.filter(p => filtroFn(p.nombre) || filtroFn(p.tienda_nombre) || filtroFn(p.vendedor_nombre)).map(p => (
            <div key={p.id} style={{ background: '#FFF', borderRadius: 18, padding: 14, border: '1px solid #E2E8F0', boxShadow: '0 4px 14px rgba(15,23,42,0.05)', display: 'flex', gap: 12 }}>
              <div style={{ width: 70, height: 70, borderRadius: 14, background: '#EFF6FF', flexShrink: 0, overflow: 'hidden' }}>
                {p.imagen && <img src={p.imagen} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: '#000', fontSize: '.94rem' }}>{p.nombre}</div>
                <div style={{ fontSize: '.78rem', color: '#475569' }}>{p.tienda_nombre} · {p.vendedor_nombre}</div>
                <div style={{ color: '#2563EB', fontWeight: 900, marginTop: 3, fontSize: '.92rem' }}>US$ {Number(p.precio).toFixed(2)} <span style={{ color: '#475569', fontWeight: 600 }}>· stock {p.stock}</span></div>
                {p.activo === 0 && <span style={{ background: '#FEE2E2', color: '#B91C1C', padding: '3px 9px', borderRadius: 12, fontSize: '.7rem', fontWeight: 800, display: 'inline-block', marginTop: 4 }}>SUSPENDIDO</span>}
              </div>
              {p.activo === 1 && (
                <button onClick={() => eliminarProducto(p.id)} style={{ alignSelf: 'center', background: '#DC2626', color: '#FFF', border: 'none', borderRadius: 12, padding: '9px 12px', fontWeight: 800, fontSize: '.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Trash2 size={14} /> Eliminar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* REELS */}
      {grupo === 'reels' && data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {data.reels.filter(r => filtroFn(r.nombre) || filtroFn(r.tienda_nombre)).map(r => (
            <div key={r.id} style={{ background: '#FFF', borderRadius: 18, padding: 14, border: '1px solid #E2E8F0', boxShadow: '0 4px 14px rgba(15,23,42,0.05)', display: 'flex', gap: 12 }}>
              <div style={{ width: 70, height: 70, borderRadius: 14, background: '#FCE7F3', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {r.imagen ? <img src={r.imagen} alt={r.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }} /> : <Film size={26} color="#EC4899" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: '#000' }}>{r.nombre}</div>
                <div style={{ fontSize: '.78rem', color: '#475569' }}>{r.tienda_nombre} · {r.vendedor_nombre}</div>
                {r.reportes > 0 && <span style={{ background: '#FEF3C7', color: '#92400E', padding: '3px 9px', borderRadius: 12, fontSize: '.7rem', fontWeight: 800, display: 'inline-block', marginTop: 4 }}>{r.reportes} reporte(s)</span>}
              </div>
              <button onClick={() => eliminarReel(r.id)} style={{ alignSelf: 'center', background: '#DC2626', color: '#FFF', border: 'none', borderRadius: 12, padding: '9px 12px', fontWeight: 800, fontSize: '.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Trash2 size={14} /> Quitar
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
