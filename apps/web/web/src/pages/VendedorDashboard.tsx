import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';
import { api } from '../api';
import Header from '../components/Header';
import '../../css/index.css';
import '../../css/dashboards.css';
import '../../css/dark.css';

interface Tienda {
  id: number;
  nombre: string;
  descripcion?: string;
  municipio: string;
  direccion?: string;
  portada?: string | null;
  logo?: string | null;
  hora_apertura?: string | null;
  hora_cierre?: string | null;
  categoria?: string | null;
  calificacion_promedio?: number;
  total_resenas?: number;
  ventas_completadas?: number;
  activo?: number;
}

interface Producto {
  id: number;
  tienda_id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  imagen?: string | null;
  video?: string | null;
  categoria?: string;
  es_reel: number;
  activo: number;
}

interface Venta {
  id: number;
  comprador_id: number;
  comprador_nombre: string;
  total: number;
  estado: string;
  metodo_pago: string;
  direccion_entrega: string;
  created_at: string;
}

type DashTab = 'productos' | 'ventas' | 'perfil';

const CATEGORIAS = ['panaderia', 'alimentos', 'bebidas', 'artesanias', 'ropa', 'electronica', 'hogar', 'mascotas', 'deportes', 'belleza', 'otro'];

const ESTADO_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  preparacion: { bg: '#fef3c7', text: '#92400e', label: 'Preparando' },
  en_camino:   { bg: '#dbeafe', text: '#1e40af', label: 'En camino' },
  entregado:   { bg: '#d1fae5', text: '#065f46', label: 'Entregado' },
  cancelado:   { bg: '#fee2e2', text: '#991b1b', label: 'Cancelado' },
  rechazado_repartidor: { bg: '#fee2e2', text: '#991b1b', label: 'Rechazado' },
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function VendedorDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useGlobal();

  const [tienda, setTienda]       = useState<Tienda | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas]       = useState<Venta[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<DashTab>('productos');
  const [toast, setToast]         = useState('');
  const toastTimerRef             = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create product modal
  const [showCreate, setShowCreate]     = useState(false);
  const [cpNombre, setCpNombre]         = useState('');
  const [cpPrecio, setCpPrecio]         = useState('');
  const [cpDesc, setCpDesc]             = useState('');
  const [cpCat, setCpCat]               = useState('otro');
  const [cpStock, setCpStock]           = useState('10');
  const [cpImagen, setCpImagen]         = useState<string | null>(null);
  const [cpEsReel, setCpEsReel]         = useState(false);
  const [saving, setSaving]             = useState(false);

  // Create reel modal
  const [showReel, setShowReel]       = useState(false);
  const [rlTitulo, setRlTitulo]       = useState('');
  const [rlDesc, setRlDesc]           = useState('');
  const [rlVideo, setRlVideo]         = useState('');
  const [rlCat, setRlCat]             = useState('otro');

  // Edit tienda modal
  const [showEdit, setShowEdit]       = useState(false);
  const [etNombre, setEtNombre]       = useState('');
  const [etDesc, setEtDesc]           = useState('');
  const [etMunicipio, setEtMunicipio] = useState('');
  const [etDireccion, setEtDireccion] = useState('');
  const [etCat, setEtCat]             = useState('');
  const [etApertura, setEtApertura]   = useState('');
  const [etCierre, setEtCierre]       = useState('');
  const [etLogo, setEtLogo]           = useState<string | null>(null);
  const [etPortada, setEtPortada]     = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [resT, resP, resV] = await Promise.all([
        api.get('/vendedor_dashboard.php?action=mis_tiendas'),
        api.get('/vendedor_dashboard.php?action=mis_productos'),
        api.get('/vendedor_dashboard.php?action=mis_ventas'),
      ]);
      const t = resT.data.ok && resT.data.tiendas?.length ? resT.data.tiendas[0] : null;
      setTienda(t);
      if (resP.data.ok) setProductos(resP.data.productos ?? []);
      if (resV.data.ok) setVentas(resV.data.pedidos ?? []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  // Open edit modal pre-filled with current tienda data
  const openEdit = () => {
    if (!tienda) return;
    setEtNombre(tienda.nombre ?? '');
    setEtDesc(tienda.descripcion ?? '');
    setEtMunicipio(tienda.municipio ?? '');
    setEtDireccion(tienda.direccion ?? '');
    setEtCat(tienda.categoria ?? '');
    setEtApertura(tienda.hora_apertura ?? '');
    setEtCierre(tienda.hora_cierre ?? '');
    setEtLogo(null);
    setEtPortada(null);
    setShowEdit(true);
  };

  const handleGuardarTienda = async () => {
    if (!tienda) return;
    const body: Record<string, unknown> = { tienda_id: tienda.id };
    if (etNombre)   body.nombre       = etNombre;
    if (etDesc)     body.descripcion  = etDesc;
    if (etMunicipio) body.municipio   = etMunicipio;
    if (etDireccion) body.direccion   = etDireccion;
    if (etCat)       body.categoria   = etCat;
    if (etApertura)  body.hora_apertura = etApertura;
    if (etCierre)    body.hora_cierre   = etCierre;
    if (etLogo)      body.logo          = etLogo;
    if (etPortada)   body.portada       = etPortada;
    try {
      const res = await api.post('/vendedor_dashboard.php?action=actualizar_tienda', body);
      if (res.data.ok) {
        showToast('✅ Tienda actualizada');
        setShowEdit(false);
        void fetchAll();
      } else {
        showToast('⚠️ ' + (res.data.error ?? 'Error al guardar'));
      }
    } catch (e) {
      showToast('⚠️ Error de conexión');
    }
  };

  const handleCrearProducto = async () => {
    if (!tienda) return showToast('⚠️ No tienes tienda registrada');
    if (!cpNombre.trim()) return showToast('⚠️ El nombre es requerido');
    const precio = parseFloat(cpPrecio);
    if (!cpPrecio || isNaN(precio) || precio <= 0) return showToast('⚠️ El precio debe ser positivo');
    setSaving(true);
    try {
      const res = await api.post('/vendedor_dashboard.php?action=crear_producto', {
        tienda_id: tienda.id,
        nombre: cpNombre.trim(),
        descripcion: cpDesc,
        precio,
        stock: parseInt(cpStock) || 0,
        categoria: cpCat,
        imagen: cpImagen,
        es_reel: cpEsReel,
      });
      if (res.data.ok) {
        showToast('✅ Producto agregado');
        setShowCreate(false);
        setCpNombre(''); setCpPrecio(''); setCpDesc(''); setCpStock('10'); setCpImagen(null); setCpEsReel(false);
        void fetchAll();
      } else {
        showToast('⚠️ ' + (res.data.error ?? 'Error'));
      }
    } catch (e) {
      showToast('⚠️ Error de conexión');
    }
    setSaving(false);
  };

  const handleCrearReel = async () => {
    if (!tienda) return showToast('⚠️ No tienes tienda registrada');
    if (!rlTitulo.trim()) return showToast('⚠️ El título es requerido');
    try {
      const res = await api.post('/vendedor_dashboard.php?action=crear_producto', {
        tienda_id: tienda.id,
        nombre: rlTitulo.trim(),
        descripcion: rlDesc,
        video: rlVideo,
        categoria: rlCat,
        es_reel: true,
        precio: 0,
      });
      if (res.data.ok) {
        showToast('🎬 Reel publicado');
        setShowReel(false);
        setRlTitulo(''); setRlDesc(''); setRlVideo(''); setRlCat('otro');
      } else {
        showToast('⚠️ ' + (res.data.error ?? 'Error'));
      }
    } catch (e) {
      showToast('⚠️ Error de conexión');
    }
  };

  const toggleActivo = async (p: Producto) => {
    try {
      await api.post('/vendedor_dashboard.php?action=actualizar_producto', { producto_id: p.id, activo: p.activo ? 0 : 1 });
      setProductos(prev => prev.map(x => x.id === p.id ? { ...x, activo: x.activo ? 0 : 1 } : x));
      showToast(`🔄 ${p.nombre}: ${p.activo ? 'desactivado' : 'activado'}`);
    } catch (e) { showToast('⚠️ Error'); }
  };

  const eliminarProducto = async (p: Producto) => {
    if (!confirm(`¿Desactivar "${p.nombre}"?`)) return;
    await toggleActivo({ ...p, activo: 1 });
  };

  const marcarListoPedido = async (v: Venta) => {
    try {
      const res = await api.post('/vendedor_dashboard.php?action=preparar_pedido', { pedido_id: v.id, estado: 'en_camino' });
      if (res.data.ok) { showToast('✅ Pedido marcado listo para envío'); void fetchAll(); }
    } catch (e) { showToast('⚠️ Error'); }
  };

  const productosActivos  = productos.filter(p => p.activo).length;
  const pedidosPendientes = ventas.filter(v => v.estado === 'preparacion').length;
  const totalVentas       = ventas.filter(v => v.estado === 'entregado').reduce((s, v) => s + Number(v.total), 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="historial-main-wrapper" style={{ minHeight: '100vh' }}>
      <Header activeTab="none" />

      <div className="dash-page" style={{ paddingTop: '16px' }}>

        {/* ── Tienda profile header ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando...</div>
        ) : tienda ? (
          <div style={{
            background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)',
            overflow: 'hidden', marginBottom: '24px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
          }}>
            {/* Banner */}
            <div style={{
              height: '140px', background: tienda.portada
                ? `url(${tienda.portada}) center/cover`
                : 'linear-gradient(135deg, #355068 0%, #4A6D8C 100%)',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', bottom: '-32px', left: '24px',
                width: '64px', height: '64px', borderRadius: '50%',
                border: '3px solid white',
                background: tienda.logo ? `url(${tienda.logo}) center/cover` : '#4A6D8C',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}>
                {!tienda.logo && '🏪'}
              </div>
            </div>

            {/* Info row */}
            <div style={{ padding: '40px 24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontWeight: '800', fontSize: '1.35rem', margin: 0, color: 'var(--text)' }}>{tienda.nombre}</h2>
                <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.88rem' }}>
                  📍 {tienda.municipio}
                  {tienda.categoria ? ` · ${tienda.categoria}` : ''}
                  {tienda.hora_apertura && tienda.hora_cierre ? ` · ${tienda.hora_apertura}–${tienda.hora_cierre}` : ''}
                </p>
                {tienda.calificacion_promedio && Number(tienda.calificacion_promedio) > 0 ? (
                  <p style={{ color: '#f59e0b', margin: '4px 0 0', fontSize: '0.85rem', fontWeight: '700' }}>
                    ⭐ {Number(tienda.calificacion_promedio).toFixed(1)} ({tienda.total_resenas} reseñas)
                  </p>
                ) : null}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowReel(true)}
                  style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  ▶ Crear Reel
                </button>
                <button
                  onClick={() => { setShowCreate(true); }}
                  style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#4A6D8C', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  + Producto
                </button>
                <button
                  onClick={openEdit}
                  style={{ padding: '8px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  ✏️ Editar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', padding: '40px', textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🏪</div>
            <h3 style={{ color: 'var(--text)', fontWeight: '800' }}>No tienes una tienda registrada</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Contacta al administrador para activar tu tienda o solicitar tu rol de vendedor.</p>
            <button onClick={() => navigate('/perfil')} style={{ marginTop: '16px', padding: '10px 24px', borderRadius: '10px', border: 'none', background: '#4A6D8C', color: 'white', fontWeight: '700', cursor: 'pointer' }}>
              Ir a mi perfil
            </button>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="stats-row" style={{ marginBottom: '24px' }}>
          <StatCard icon="📦" label="Productos activos" value={productosActivos} badge={`de ${productos.length} totales`} />
          <StatCard icon="🚨" label="Pedidos pendientes" value={pedidosPendientes} badge="por preparar" badgeColor={pedidosPendientes > 0 ? '#dc2626' : undefined} />
          <StatCard icon="✅" label="Ventas completadas" value={tienda?.ventas_completadas ?? ventas.filter(v => v.estado === 'entregado').length} badge="total" badgeColor="#15803d" />
          <StatCard icon="⭐" label="Calificación" value={tienda?.calificacion_promedio ? Number(tienda.calificacion_promedio).toFixed(1) : 'N/A'} badge={tienda?.total_resenas ? `${tienda.total_resenas} reseñas` : 'sin reseñas'} />
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {([['productos', `📦 Productos (${productos.length})`], ['ventas', `🛒 Ventas (${ventas.length})`], ['perfil', '👤 Mi Perfil']] as [DashTab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '9px 20px', borderRadius: '10px', border: '1.5px solid var(--border)',
                background: tab === t ? '#4A6D8C' : 'var(--white)',
                color: tab === t ? 'white' : 'var(--text)',
                fontWeight: '700', cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'inherit',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Productos tab ── */}
        {tab === 'productos' && (
          <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text)' }}>Catálogo de productos</span>
              <button
                onClick={() => setShowCreate(true)}
                style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: '#4A6D8C', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                + Agregar
              </button>
            </div>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando productos...</div>
            ) : productos.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                <p style={{ fontWeight: '600' }}>Aún no has agregado productos</p>
                <button onClick={() => setShowCreate(true)} style={{ marginTop: '12px', padding: '9px 20px', borderRadius: '10px', border: 'none', background: '#4A6D8C', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Agregar primer producto</button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)' }}>
                      {['Imagen', 'Nombre', 'Precio', 'Categoría', 'Stock', 'Estado', 'Acción'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          {p.imagen ? (
                            <img src={p.imagen} alt={p.nombre} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', background: 'var(--border)' }} />
                          ) : (
                            <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🛍️</div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text)' }}>{p.nombre}</td>
                        <td style={{ padding: '12px 16px', fontWeight: '800', color: 'var(--text)' }}>${Number(p.precio).toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', textTransform: 'capitalize', fontSize: '0.85rem' }}>{p.categoria || '—'}</td>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text)' }}>{p.stock}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => toggleActivo(p)}
                            style={{
                              padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                              background: p.activo ? '#d1fae5' : '#fee2e2',
                              color: p.activo ? '#065f46' : '#991b1b',
                              fontWeight: '800', fontSize: '0.75rem',
                            }}
                          >
                            {p.activo ? '● Activo' : '○ Inactivo'}
                          </button>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button onClick={() => eliminarProducto(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }} title="Desactivar">🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Ventas tab ── */}
        {tab === 'ventas' && (
          <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text)' }}>Mis pedidos recibidos</span>
            </div>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
            ) : ventas.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                <p style={{ fontWeight: '600' }}>Aún no tienes ventas</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)' }}>
                      {['ID', 'Cliente', 'Total', 'Estado', 'Fecha', 'Acción'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map(v => {
                      const ec = ESTADO_COLOR[v.estado] ?? { bg: '#f3f4f6', text: '#374151', label: v.estado };
                      return (
                        <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '800', color: '#4A6D8C', fontSize: '0.85rem' }}>#SV-{v.id}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text)' }}>{v.comprador_nombre}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '800', color: 'var(--text)' }}>${Number(v.total).toFixed(2)}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '4px 10px', borderRadius: '20px', background: ec.bg, color: ec.text, fontSize: '0.75rem', fontWeight: '700' }}>{ec.label}</span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{new Date(v.created_at).toLocaleDateString('es-SV')}</td>
                          <td style={{ padding: '12px 16px' }}>
                            {v.estado === 'preparacion' && (
                              <button
                                onClick={() => marcarListoPedido(v)}
                                style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#4A6D8C', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit' }}
                              >
                                Listo para envío
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {/* ── Perfil tab ── */}
        {tab === 'perfil' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '520px' }}>
            {/* Tarjeta de usuario */}
            <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', padding: '28px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#4A6D8C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: '900', color: 'white', flexShrink: 0, overflow: 'hidden' }}>
                {(user as any)?.foto
                  ? <img src={(user as any).foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : (user?.name?.[0] ?? '?').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name ?? 'Vendedor'}</div>
                {(user as any)?.username && <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>@{(user as any).username}</div>}
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>{user?.email}</div>
                <span style={{ marginTop: '6px', display: 'inline-block', background: '#d1fae5', color: '#065f46', fontWeight: '700', fontSize: '0.75rem', padding: '2px 10px', borderRadius: '20px' }}>VENDEDOR</span>
              </div>
            </div>

            {/* Acciones */}
            <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
              <button
                onClick={() => navigate('/perfil')}
                style={{ width: '100%', padding: '16px 20px', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <span style={{ fontSize: '1.2rem' }}>✏️</span>
                <span style={{ fontWeight: '700', color: 'var(--text)', fontSize: '0.95rem' }}>Editar perfil completo</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>›</span>
              </button>
              <button
                onClick={() => navigate('/')}
                style={{ width: '100%', padding: '16px 20px', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <span style={{ fontSize: '1.2rem' }}>🏠</span>
                <span style={{ fontWeight: '700', color: 'var(--text)', fontSize: '0.95rem' }}>Ir al inicio</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>›</span>
              </button>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                style={{ width: '100%', padding: '16px 20px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <span style={{ fontSize: '1.2rem' }}>🚪</span>
                <span style={{ fontWeight: '700', color: '#dc2626', fontSize: '0.95rem' }}>Cerrar sesión</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── MODAL: Crear Producto ── */}
      {showCreate && (
        <div className="modal-overlay show" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal-box" style={{ maxWidth: '480px' }}>
            <div className="modal-head">
              <h2>Nuevo Producto</h2>
              <button className="modal-close-btn" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <div className="modal-body">
              <ModalField label="Nombre *">
                <input className="modal-input" value={cpNombre} onChange={e => setCpNombre(e.target.value)} placeholder="Ej: Pan de Coco" />
              </ModalField>
              <ModalField label="Precio ($) *">
                <input className="modal-input" type="number" step="0.01" min="0" value={cpPrecio} onChange={e => setCpPrecio(e.target.value)} placeholder="0.00" />
              </ModalField>
              <ModalField label="Descripción">
                <textarea className="modal-input" value={cpDesc} onChange={e => setCpDesc(e.target.value)} placeholder="Describe el producto..." rows={2} style={{ resize: 'vertical' }} />
              </ModalField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <ModalField label="Categoría">
                  <select className="modal-input" value={cpCat} onChange={e => setCpCat(e.target.value)}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </ModalField>
                <ModalField label="Stock">
                  <input className="modal-input" type="number" min="0" value={cpStock} onChange={e => setCpStock(e.target.value)} />
                </ModalField>
              </div>
              <ModalField label="Imagen del producto">
                {cpImagen ? (
                  <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: '10px', overflow: 'hidden' }}>
                    <img src={cpImagen} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => setCpImagen(null)} style={{ position: 'absolute', top: 6, right: 6, background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.75rem' }}>Quitar</button>
                  </div>
                ) : (
                  <label style={{ display: 'block', border: '2px dashed var(--border)', borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    📷 Seleccionar imagen
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                      const f = e.target.files?.[0];
                      if (f) setCpImagen(await fileToBase64(f));
                    }} />
                  </label>
                )}
              </ModalField>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text)' }}>
                <input type="checkbox" checked={cpEsReel} onChange={e => setCpEsReel(e.target.checked)} />
                Publicar también como Reel
              </label>
            </div>
            <div className="modal-foot">
              <button className="btn-cancel" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button className="btn-save" onClick={handleCrearProducto} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Crear Reel ── */}
      {showReel && (
        <div className="modal-overlay show" onClick={e => e.target === e.currentTarget && setShowReel(false)}>
          <div className="modal-box" style={{ maxWidth: '460px' }}>
            <div className="modal-head" style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: 'white', borderBottom: 'none' }}>
              <h2 style={{ color: 'white' }}>🎬 Nuevo Reel</h2>
              <button className="modal-close-btn" onClick={() => setShowReel(false)} style={{ color: 'white' }}>✕</button>
            </div>
            <div className="modal-body">
              <ModalField label="Título del reel *">
                <input className="modal-input" value={rlTitulo} onChange={e => setRlTitulo(e.target.value)} placeholder="Ej: Pan recién horneado 🥖" />
              </ModalField>
              <ModalField label="Descripción">
                <textarea className="modal-input" value={rlDesc} onChange={e => setRlDesc(e.target.value)} placeholder="Describe el producto..." rows={2} style={{ resize: 'vertical' }} />
              </ModalField>
              <ModalField label="URL del video (YouTube, TikTok...)">
                <input className="modal-input" type="url" value={rlVideo} onChange={e => setRlVideo(e.target.value)} placeholder="https://..." />
              </ModalField>
              <ModalField label="Categoría">
                <select className="modal-input" value={rlCat} onChange={e => setRlCat(e.target.value)}>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </ModalField>
            </div>
            <div className="modal-foot">
              <button className="btn-cancel" onClick={() => setShowReel(false)}>Cancelar</button>
              <button onClick={handleCrearReel} style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: 'white', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' }}>
                Publicar Reel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Editar Tienda ── */}
      {showEdit && tienda && (
        <div className="modal-overlay show" onClick={e => e.target === e.currentTarget && setShowEdit(false)}>
          <div className="modal-box" style={{ maxWidth: '520px' }}>
            <div className="modal-head">
              <h2>Editar Tienda</h2>
              <button className="modal-close-btn" onClick={() => setShowEdit(false)}>✕</button>
            </div>
            <div className="modal-body">
              <ModalField label="Nombre de la tienda">
                <input className="modal-input" value={etNombre} onChange={e => setEtNombre(e.target.value)} placeholder={tienda.nombre} />
              </ModalField>
              <ModalField label="Descripción">
                <textarea className="modal-input" value={etDesc} onChange={e => setEtDesc(e.target.value)} placeholder={tienda.descripcion || 'Describe tu tienda...'} rows={2} style={{ resize: 'vertical' }} />
              </ModalField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <ModalField label="Municipio">
                  <input className="modal-input" value={etMunicipio} onChange={e => setEtMunicipio(e.target.value)} placeholder={tienda.municipio} />
                </ModalField>
                <ModalField label="Categoría">
                  <select className="modal-input" value={etCat} onChange={e => setEtCat(e.target.value)}>
                    <option value="">— Sin categoría —</option>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </ModalField>
              </div>
              <ModalField label="Dirección">
                <input className="modal-input" value={etDireccion} onChange={e => setEtDireccion(e.target.value)} placeholder={tienda.direccion || 'Dirección exacta'} />
              </ModalField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <ModalField label="Hora apertura">
                  <input className="modal-input" type="time" value={etApertura} onChange={e => setEtApertura(e.target.value)} />
                </ModalField>
                <ModalField label="Hora cierre">
                  <input className="modal-input" type="time" value={etCierre} onChange={e => setEtCierre(e.target.value)} />
                </ModalField>
              </div>
              <ModalField label="Logo (imagen circular)">
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  {etLogo ? (
                    <img src={etLogo} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                  ) : tienda.logo ? (
                    <img src={tienda.logo} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                  ) : (
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--bg)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🏪</div>
                  )}
                  <span style={{ color: '#4A6D8C', fontWeight: '700', fontSize: '0.85rem' }}>Cambiar logo</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                    const f = e.target.files?.[0];
                    if (f) setEtLogo(await fileToBase64(f));
                  }} />
                </label>
              </ModalField>
              <ModalField label="Portada (imagen de banner)">
                {etPortada ? (
                  <div style={{ position: 'relative', width: '100%', height: '90px', borderRadius: '10px', overflow: 'hidden' }}>
                    <img src={etPortada} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => setEtPortada(null)} style={{ position: 'absolute', top: 6, right: 6, background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.75rem' }}>Quitar</button>
                  </div>
                ) : (
                  <label style={{ display: 'block', border: '2px dashed var(--border)', borderRadius: '10px', padding: '16px', textAlign: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    🖼️ Subir imagen de portada
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                      const f = e.target.files?.[0];
                      if (f) setEtPortada(await fileToBase64(f));
                    }} />
                  </label>
                )}
              </ModalField>
            </div>
            <div className="modal-foot">
              <button className="btn-cancel" onClick={() => setShowEdit(false)}>Cancelar</button>
              <button className="btn-save" onClick={handleGuardarTienda}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: '#111', color: '#fff', padding: '12px 20px', borderRadius: '14px',
          fontWeight: '600', fontSize: '0.9rem', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 9999,
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Helper sub-components ───────────────────────────────────────────────────
function StatCard({ icon, label, value, badge, badgeColor }: {
  icon: string; label: string; value: string | number; badge: string; badgeColor?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon-wrap" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-num" style={{ color: badgeColor ?? 'var(--blue)' }}>{value}</div>
      <span className="stat-badge" style={badgeColor ? { background: badgeColor + '22', color: badgeColor } : undefined}>{badge}</span>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="modal-field">
      <label style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  );
}
