import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';
import Header from '../components/Header';
import { api, API_URL } from '../api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Tienda {
  id: number; nombre: string; descripcion?: string; municipio: string;
  direccion?: string; portada?: string | null; logo?: string | null;
  hora_apertura?: string | null; hora_cierre?: string | null;
  categoria?: string | null; calificacion_promedio?: number;
  total_resenas?: number; ventas_completadas?: number; activo?: number;
}
interface Producto {
  id: number; tienda_id: number; nombre: string; descripcion?: string;
  precio: number; stock: number; imagen?: string | null; video?: string | null;
  imagen_url?: string | null; categoria?: string; es_reel: number; activo: number;
  precio_oferta?: number | null; oferta_hasta?: string | null;
}
interface Venta {
  id: number; comprador_id: number; comprador_nombre: string;
  total: number; estado: string; metodo_pago: string;
  direccion_entrega: string; created_at: string;
}
type DashTab = 'productos' | 'ventas';

// Debe coincidir exactamente con el whitelist CATS_VALIDAS de vendedor_dashboard.php
const CATEGORIAS = [
  { value: 'alimentos',  label: 'Alimentos' },
  { value: 'panaderia',  label: 'Panadería' },
  { value: 'bebidas',    label: 'Bebidas' },
  { value: 'artesanias', label: 'Artesanías' },
  { value: 'ropa',       label: 'Ropa' },
  { value: 'hogar',      label: 'Hogar' },
  { value: 'servicios',  label: 'Servicios' },
  { value: 'general',    label: 'General' },
];
const MUNICIPIOS = ['San Salvador','Mejicanos','Soyapango','Apopa','Ilopango','Delgado','Santa Tecla','Antiguo Cuscatlán','San Miguel','Santa Ana','Ahuachapán','Sonsonate','Usulután'];

const ESTADO_MAP: Record<string, { label: string; bg: string; text: string }> = {
  preparacion: { label: 'Preparando', bg: '#FEF3C7', text: '#92400E' },
  en_camino:   { label: 'En camino',  bg: '#DBEAFE', text: '#1E40AF' },
  entregado:   { label: 'Entregado',  bg: '#D1FAE5', text: '#065F46' },
  cancelado:   { label: 'Cancelado',  bg: '#FEE2E2', text: '#991B1B' },
  rechazado_repartidor: { label: 'Rechazado', bg: '#FEE2E2', text: '#991B1B' },
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ── Upload video via FormData ─────────────────────────────────────────────────
async function uploadVideo(file: File, token: string | null): Promise<string> {
  const fd = new FormData();
  fd.append('video', file);
  const res = await fetch(`${API_URL}/upload.php?type=video`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? 'Error al subir video');
  return json.url as string;
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const IC = {
  store:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l1-6h16l1 6"/><path d="M3 9h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/></svg>,
  plus:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  play:    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  trash:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  pkg:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73L12 2 4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73L12 22l8-4.27A2 2 0 0 0 21 16z"/></svg>,
  cart:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  star:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  upload:  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  video:   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  img:     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  x:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
  alert:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  truck:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function VendedorDashboard() {
  const navigate = useNavigate();
  const { theme } = useGlobal();
  const isDark = theme === 'dark';

  // Colors
  const bg      = isDark ? '#080D18' : '#F8FAFC';
  const card    = isDark ? '#111827' : '#FFFFFF';
  const border  = isDark ? '#1E293B' : '#E2E8F0';
  const text    = isDark ? '#F1F5F9' : '#0F172A';
  const muted   = isDark ? '#64748B' : '#94A3B8';
  const elevated= isDark ? '#1A2236' : '#F1F5F9';
  const accent  = isDark ? '#3B82F6' : '#2563EB';
  const inputBg = isDark ? '#1E293B' : '#F8FAFC';

  const [tienda, setTienda]       = useState<Tienda | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas]       = useState<Venta[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<DashTab>('productos');
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create product modal
  const [showCreate, setShowCreate] = useState(false);
  const [cpNombre, setCpNombre]     = useState('');
  const [cpPrecio, setCpPrecio]     = useState('');
  const [cpDesc, setCpDesc]         = useState('');
  const [cpCat, setCpCat]           = useState(CATEGORIAS[0].value);
  const [cpStock, setCpStock]       = useState('10');
  const [cpImagen, setCpImagen]     = useState<string | null>(null);
  const [cpEsReel, setCpEsReel]     = useState(false);
  const [saving, setSaving]         = useState(false);

  // Edit product modal
  const [showEditProd, setShowEditProd] = useState(false);
  const [epId, setEpId]             = useState<number | null>(null);
  const [epNombre, setEpNombre]     = useState('');
  const [epPrecio, setEpPrecio]     = useState('');
  const [epDesc, setEpDesc]         = useState('');
  const [epCat, setEpCat]           = useState(CATEGORIAS[0].value);
  const [epStock, setEpStock]       = useState('0');
  const [epImagen, setEpImagen]     = useState<string | null>(null);
  const [epVideo, setEpVideo]       = useState<string | null>(null);
  const [epImagenActual, setEpImagenActual] = useState<string | null>(null);
  const [epOferta, setEpOferta]     = useState('');
  const [epOfertaHasta, setEpOfertaHasta] = useState('');
  const [epQuitarOferta, setEpQuitarOferta] = useState(false);
  const [epSaving, setEpSaving]     = useState(false);

  // Reel modal
  const [showReel, setShowReel]         = useState(false);
  const [rlTitulo, setRlTitulo]         = useState('');
  const [rlDesc, setRlDesc]             = useState('');
  const [rlVideoFile, setRlVideoFile]   = useState<File | null>(null);
  const [rlVideoPreview, setRlVideoPreview] = useState<string | null>(null);
  const [rlImagen, setRlImagen]         = useState<string | null>(null);
  const [rlCat, setRlCat]               = useState(CATEGORIAS[0].value);
  const [rlPrecio, setRlPrecio]         = useState('');
  const [rlUploading, setRlUploading]   = useState(false);
  const [rlProgress, setRlProgress]     = useState(0);

  // Edit tienda modal
  const [showEdit, setShowEdit]     = useState(false);
  const [etNombre, setEtNombre]     = useState('');
  const [etDesc, setEtDesc]         = useState('');
  const [etMunicipio, setEtMunicipio] = useState('');
  const [etDireccion, setEtDireccion] = useState('');
  const [etCat, setEtCat]           = useState('');
  const [etApertura, setEtApertura] = useState('');
  const [etCierre, setEtCierre]     = useState('');
  const [etLogo, setEtLogo]         = useState<string | null>(null);
  const [etPortada, setEtPortada]   = useState<string | null>(null);
  const [etSaving, setEtSaving]     = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [resT, resP, resV] = await Promise.all([
        api.get('/vendedor_dashboard.php?action=mis_tiendas'),
        api.get('/vendedor_dashboard.php?action=mis_productos'),
        api.get('/vendedor_dashboard.php?action=mis_ventas'),
      ]);
      setTienda(resT.data.tiendas?.[0] ?? null);
      if (resP.data.ok) setProductos(resP.data.productos ?? []);
      if (resV.data.ok) setVentas(resV.data.pedidos ?? []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const openEdit = () => {
    if (!tienda) return;
    setEtNombre(tienda.nombre ?? '');
    setEtDesc(tienda.descripcion ?? '');
    setEtMunicipio(tienda.municipio ?? '');
    setEtDireccion(tienda.direccion ?? '');
    setEtCat(tienda.categoria ?? '');
    setEtApertura(tienda.hora_apertura ?? '');
    setEtCierre(tienda.hora_cierre ?? '');
    setEtLogo(null); setEtPortada(null);
    setShowEdit(true);
  };

  const handleGuardarTienda = async () => {
    if (!tienda) return;
    setEtSaving(true);
    try {
      const body: Record<string, unknown> = { tienda_id: tienda.id };
      if (etNombre)    body.nombre        = etNombre;
      if (etDesc)      body.descripcion   = etDesc;
      if (etMunicipio) body.municipio     = etMunicipio;
      if (etDireccion) body.direccion     = etDireccion;
      if (etCat)       body.categoria     = etCat;
      if (etApertura)  body.hora_apertura = etApertura;
      if (etCierre)    body.hora_cierre   = etCierre;
      if (etLogo)      body.logo          = etLogo;
      if (etPortada)   body.portada       = etPortada;
      const res = await api.post('/vendedor_dashboard.php?action=actualizar_tienda', body);
      if (res.data.ok) { showToast('Tienda actualizada'); setShowEdit(false); void fetchAll(); }
      else showToast(res.data.error ?? 'Error al guardar', false);
    } catch { showToast('Error de conexión', false); }
    setEtSaving(false);
  };

  const handleCrearProducto = async () => {
    if (!tienda) return showToast('No tienes tienda registrada', false);
    if (!cpNombre.trim()) return showToast('El nombre es requerido', false);
    const precio = parseFloat(cpPrecio);
    if (!cpPrecio || isNaN(precio) || precio < 0) return showToast('El precio debe ser válido', false);
    setSaving(true);
    try {
      const res = await api.post('/vendedor_dashboard.php?action=crear_producto', {
        tienda_id: tienda.id, nombre: cpNombre.trim(), descripcion: cpDesc,
        precio, stock: parseInt(cpStock) || 0, categoria: cpCat,
        imagen: cpImagen, es_reel: cpEsReel,
      });
      if (res.data.ok) {
        showToast('Producto agregado');
        setShowCreate(false);
        setCpNombre(''); setCpPrecio(''); setCpDesc(''); setCpStock('10'); setCpImagen(null); setCpEsReel(false);
        void fetchAll();
      } else showToast(res.data.error ?? 'Error', false);
    } catch { showToast('Error de conexión', false); }
    setSaving(false);
  };

  const handleCrearReel = async () => {
    if (!tienda) return showToast('No tienes tienda registrada', false);
    if (!rlTitulo.trim()) return showToast('El título es requerido', false);
    if (!rlVideoFile) return showToast('Selecciona un video', false);
    setRlUploading(true);
    setRlProgress(10);
    try {
      const token = localStorage.getItem('lm_token_v1');
      setRlProgress(30);
      const videoUrl = await uploadVideo(rlVideoFile, token);
      setRlProgress(70);
      const res = await api.post('/vendedor_dashboard.php?action=crear_producto', {
        tienda_id: tienda.id, nombre: rlTitulo.trim(), descripcion: rlDesc,
        video: videoUrl, imagen: rlImagen, categoria: rlCat,
        es_reel: true, precio: parseFloat(rlPrecio) || 0,
      });
      setRlProgress(100);
      if (res.data.ok) {
        showToast('Reel publicado');
        setShowReel(false);
        setRlTitulo(''); setRlDesc(''); setRlVideoFile(null); setRlVideoPreview(null); setRlImagen(null); setRlPrecio('');
        void fetchAll();
      } else showToast(res.data.error ?? 'Error', false);
    } catch (e: any) { showToast(e.message ?? 'Error al publicar', false); }
    setRlUploading(false); setRlProgress(0);
  };

  const openEditProd = (p: Producto) => {
    setEpId(p.id);
    setEpNombre(p.nombre ?? '');
    setEpPrecio(String(p.precio ?? ''));
    setEpDesc(p.descripcion ?? '');
    setEpCat(p.categoria || CATEGORIAS[0].value);
    setEpStock(String(p.stock ?? 0));
    setEpImagen(null);
    setEpVideo(null);
    setEpImagenActual(p.imagen_url || p.imagen || null);
    setEpOferta(p.precio_oferta ? String(p.precio_oferta) : '');
    setEpOfertaHasta(p.oferta_hasta ? p.oferta_hasta.slice(0, 16) : '');
    setEpQuitarOferta(false);
    setShowEditProd(true);
  };

  const handleGuardarProducto = async () => {
    if (epId === null) return;
    if (!epNombre.trim()) return showToast('El nombre es requerido', false);
    const precio = parseFloat(epPrecio);
    if (!epPrecio || isNaN(precio) || precio < 0) return showToast('El precio debe ser válido', false);
    setEpSaving(true);
    try {
      const body: Record<string, unknown> = {
        producto_id: epId,
        nombre: epNombre.trim(),
        descripcion: epDesc,
        precio,
        stock: parseInt(epStock) || 0,
        categoria: epCat,
      };
      if (epImagen) body.imagen = epImagen;
      if (epVideo) body.video = epVideo;
      if (epQuitarOferta) {
        body.quitar_oferta = true;
      } else if (epOferta) {
        body.precio_oferta = parseFloat(epOferta);
        if (epOfertaHasta) body.oferta_hasta = epOfertaHasta.replace('T', ' ') + ':00';
      }
      const res = await api.post('/vendedor_dashboard.php?action=actualizar_producto', body);
      if (res.data.ok) {
        showToast('Producto actualizado');
        setShowEditProd(false);
        void fetchAll();
      } else showToast(res.data.error ?? 'Error al guardar', false);
    } catch { showToast('Error de conexión', false); }
    setEpSaving(false);
  };

  const toggleActivo = async (p: Producto) => {
    try {
      await api.post('/vendedor_dashboard.php?action=actualizar_producto', { producto_id: p.id, activo: p.activo ? 0 : 1 });
      setProductos(prev => prev.map(x => x.id === p.id ? { ...x, activo: x.activo ? 0 : 1 } : x));
      showToast(`"${p.nombre}" ${p.activo ? 'desactivado' : 'activado'}`);
    } catch { showToast('Error', false); }
  };

  const marcarListo = async (v: Venta) => {
    try {
      const res = await api.post('/vendedor_dashboard.php?action=preparar_pedido', { pedido_id: v.id, estado: 'en_camino' });
      if (res.data.ok) { showToast('Pedido listo para envío'); void fetchAll(); }
    } catch { showToast('Error', false); }
  };

  const productosActivos  = productos.filter(p => p.activo).length;
  const pedidosPendientes = ventas.filter(v => v.estado === 'preparacion').length;
  const totalVentas = ventas.filter(v => v.estado === 'entregado').reduce((s, v) => s + Number(v.total), 0);

  // ── Shared input style ───────────────────────────────────────────────────────
  const inpStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: inputBg, border: `1.5px solid ${border}`,
    borderRadius: 10, padding: '10px 14px',
    fontSize: 14, color: text, outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.15s',
  };

  // ── Field wrapper ────────────────────────────────────────────────────────────
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: muted }}>{label}</label>
      {children}
    </div>
  );

  // ── Upload zone ──────────────────────────────────────────────────────────────
  const UploadZone = ({ src, onFile, accept, placeholder, height = 120 }: {
    src?: string | null; onFile: (f: File) => void;
    accept: string; placeholder: React.ReactNode; height?: number;
  }) => (
    <label style={{
      display: 'block', position: 'relative',
      height, borderRadius: 12, overflow: 'hidden',
      border: `2px dashed ${src ? accent : border}`,
      background: src ? 'transparent' : inputBg,
      cursor: 'pointer', transition: 'border-color 0.2s',
    }}>
      {src
        ? <>
            {accept.includes('video')
              ? <video src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
              : <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            }
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
            >
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                {IC.upload} Cambiar
              </span>
            </div>
          </>
        : <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ color: accent }}>{placeholder}</span>
            <span style={{ fontSize: 12, color: muted, fontWeight: 600 }}>Clic para seleccionar</span>
          </div>
      }
      <input type="file" accept={accept} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </label>
  );

  // ── Modal shell ───────────────────────────────────────────────────────────────
  const Modal = ({ show, onClose, title, children, footer }: {
    show: boolean; onClose: () => void; title: React.ReactNode;
    children: React.ReactNode; footer: React.ReactNode;
  }) => {
    if (!show) return null;
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(2,8,23,0.72)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{
          background: card, borderRadius: 20, width: '100%', maxWidth: 500,
          border: `1px solid ${border}`, overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        }}>
          {/* Head */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px', borderBottom: `1px solid ${border}`,
          }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: text }}>{title}</div>
            <button onClick={onClose} style={{
              background: elevated, border: 'none', borderRadius: 8,
              width: 32, height: 32, cursor: 'pointer', color: muted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{IC.x}</button>
          </div>
          {/* Body */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>
            {children}
          </div>
          {/* Footer */}
          <div style={{ padding: '16px 24px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            {footer}
          </div>
        </div>
      </div>
    );
  };

  // ── Btn ───────────────────────────────────────────────────────────────────────
  const Btn = ({ onClick, children, variant = 'primary', disabled = false, small = false }: {
    onClick: () => void; children: React.ReactNode;
    variant?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; small?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? '7px 14px' : '10px 22px',
        borderRadius: 10, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', fontSize: small ? 13 : 14, fontWeight: 700,
        display: 'flex', alignItems: 'center', gap: 6,
        opacity: disabled ? 0.6 : 1, transition: 'all 0.15s',
        background: variant === 'primary' ? accent : variant === 'danger' ? '#EF4444' : elevated,
        color: variant === 'ghost' ? text : '#fff',
        border: variant === 'ghost' ? `1.5px solid ${border}` : 'none',
      } as React.CSSProperties}
    >
      {children}
    </button>
  );

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: bg, color: text }}>
      <Header />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: muted }}>Cargando...</div>
        ) : !tienda ? (
          /* ── Sin tienda ──────────────────────────────────────────── */
          <div style={{
            background: card, border: `1px solid ${border}`, borderRadius: 20,
            padding: 48, textAlign: 'center',
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: 40, background: `${accent}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', color: accent,
            }}>
              {IC.store}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px', color: text }}>No tienes tienda registrada</h2>
            <p style={{ color: muted, fontSize: 14, margin: '0 0 24px' }}>Contacta al administrador para activar tu tienda.</p>
            <Btn onClick={() => navigate('/perfil')}>Ver mi perfil</Btn>
          </div>
        ) : (
          <>
            {/* ── Tienda Header ─────────────────────────────────────── */}
            <div style={{
              background: card, border: `1px solid ${border}`, borderRadius: 20,
              overflow: 'hidden', marginBottom: 24, boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            }}>
              {/* Banner */}
              <div style={{
                height: 160, position: 'relative',
                background: tienda.portada
                  ? `url(${tienda.portada}) center/cover no-repeat`
                  : `linear-gradient(135deg, ${isDark ? '#1A2236' : '#EEF2FF'} 0%, ${isDark ? '#111827' : '#E0E7FF'} 100%)`,
              }}>
                {!tienda.portada && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? '#2D3D55' : '#C7D2FE' }}>
                    {IC.store}
                  </div>
                )}
                {/* Logo */}
                <div style={{
                  position: 'absolute', bottom: -36, left: 24,
                  width: 72, height: 72, borderRadius: 18,
                  background: tienda.logo ? `url(${tienda.logo}) center/cover` : accent,
                  border: `3px solid ${card}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 900, color: '#fff',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                }}>
                  {!tienda.logo && tienda.nombre.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Info row */}
              <div style={{ padding: '48px 24px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: text }}>{tienda.nombre}</h2>
                  <p style={{ color: muted, margin: '0 0 4px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={muted}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                    {tienda.municipio}
                    {tienda.categoria ? ` · ${tienda.categoria}` : ''}
                    {tienda.hora_apertura && tienda.hora_cierre ? ` · ${tienda.hora_apertura}–${tienda.hora_cierre}` : ''}
                  </p>
                  {tienda.calificacion_promedio && Number(tienda.calificacion_promedio) > 0 ? (
                    <p style={{ color: '#F59E0B', margin: 0, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#F59E0B"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      {Number(tienda.calificacion_promedio).toFixed(1)} ({tienda.total_resenas} reseñas)
                    </p>
                  ) : null}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Btn onClick={() => setShowReel(true)} variant="ghost" small>
                    {IC.play} Nuevo Reel
                  </Btn>
                  <Btn onClick={() => setShowCreate(true)} small>
                    {IC.plus} Producto
                  </Btn>
                  <Btn onClick={openEdit} variant="ghost" small>
                    {IC.edit} Editar tienda
                  </Btn>
                </div>
              </div>
            </div>

            {/* ── Stats ────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
              {[
                { icon: IC.pkg,   label: 'Productos activos',    value: productosActivos,        sub: `de ${productos.length} total`,   color: accent },
                { icon: IC.alert, label: 'Pedidos pendientes',   value: pedidosPendientes,       sub: 'por preparar',                   color: pedidosPendientes > 0 ? '#EF4444' : accent },
                { icon: IC.truck, label: 'Ventas completadas',   value: tienda.ventas_completadas ?? ventas.filter(v => v.estado === 'entregado').length, sub: 'total histórico', color: '#10B981' },
                { icon: IC.star,  label: 'Calificación',         value: tienda.calificacion_promedio ? Number(tienda.calificacion_promedio).toFixed(1) : '—', sub: tienda.total_resenas ? `${tienda.total_resenas} reseñas` : 'sin reseñas', color: '#F59E0B' },
                { icon: IC.cart,  label: 'Ingresos entregados',  value: `$${totalVentas.toFixed(2)}`, sub: 'pedidos completados',     color: '#8B5CF6' },
              ].map(s => (
                <div key={s.label} style={{
                  background: card, border: `1px solid ${border}`, borderRadius: 16,
                  padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 10,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                    {s.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: muted }}>{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Tabs ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {(['productos', 'ventas'] as DashTab[]).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: '9px 22px', borderRadius: 10,
                  border: `1.5px solid ${tab === t ? accent : border}`,
                  background: tab === t ? accent : card,
                  color: tab === t ? '#fff' : text,
                  fontWeight: 700, cursor: 'pointer', fontSize: 14,
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7,
                  transition: 'all 0.15s',
                }}>
                  {t === 'productos' ? <>{IC.pkg} Productos ({productos.length})</> : <>{IC.cart} Ventas ({ventas.length})</>}
                </button>
              ))}
            </div>

            {/* ── Productos grid ───────────────────────────────────── */}
            {tab === 'productos' && (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${border}` }}>
                  <span style={{ fontWeight: 800, fontSize: 16, color: text }}>Catálogo de productos</span>
                  <Btn onClick={() => setShowCreate(true)} small>{IC.plus} Agregar</Btn>
                </div>
                {productos.length === 0 ? (
                  <div style={{ padding: '60px 24px', textAlign: 'center', color: muted }}>
                    <div style={{ color: isDark ? '#2D3D55' : '#CBD5E1', marginBottom: 12 }}>{IC.pkg}</div>
                    <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: text }}>Aún no has agregado productos</p>
                    <Btn onClick={() => setShowCreate(true)}>{IC.plus} Agregar primer producto</Btn>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: elevated }}>
                          {['Imagen', 'Nombre', 'Precio', 'Categoría', 'Stock', 'Reel', 'Estado', 'Acción'].map(h => (
                            <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${border}`, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {productos.map(p => {
                          const imgSrc = p.imagen_url || p.imagen;
                          return (
                            <tr key={p.id} style={{ borderBottom: `1px solid ${border}` }}>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: elevated, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted }}>
                                  {imgSrc
                                    ? <img src={imgSrc} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : IC.img
                                  }
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14, color: text }}>{p.nombre}</td>
                              <td style={{ padding: '12px 16px', fontWeight: 800, color: accent }}>${Number(p.precio).toFixed(2)}</td>
                              <td style={{ padding: '12px 16px', color: muted, textTransform: 'capitalize', fontSize: 13 }}>{p.categoria || '—'}</td>
                              <td style={{ padding: '12px 16px', fontWeight: 700, color: text }}>{p.stock}</td>
                              <td style={{ padding: '12px 16px' }}>
                                {p.es_reel ? (
                                  <span style={{ background: `${accent}18`, color: accent, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>Reel</span>
                                ) : <span style={{ color: muted, fontSize: 12 }}>—</span>}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <button onClick={() => toggleActivo(p)} style={{
                                  padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                                  background: p.activo ? '#D1FAE5' : '#FEE2E2',
                                  color: p.activo ? '#065F46' : '#991B1B',
                                  fontWeight: 800, fontSize: 12, fontFamily: 'inherit',
                                }}>
                                  {p.activo ? 'Activo' : 'Inactivo'}
                                </button>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', gap: 10 }}>
                                  <button onClick={() => openEditProd(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent }} title="Editar producto">
                                    {IC.edit}
                                  </button>
                                  <button onClick={() => toggleActivo({ ...p, activo: 1 })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }} title="Desactivar">
                                    {IC.trash}
                                  </button>
                                </div>
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

            {/* ── Ventas tab ───────────────────────────────────────── */}
            {tab === 'ventas' && (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '18px 24px', borderBottom: `1px solid ${border}` }}>
                  <span style={{ fontWeight: 800, fontSize: 16, color: text }}>Pedidos recibidos</span>
                </div>
                {ventas.length === 0 ? (
                  <div style={{ padding: '60px 24px', textAlign: 'center', color: muted }}>
                    <div style={{ color: isDark ? '#2D3D55' : '#CBD5E1', marginBottom: 12 }}>{IC.cart}</div>
                    <p style={{ fontWeight: 700, color: text }}>Aún no tienes ventas</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: elevated }}>
                          {['ID', 'Cliente', 'Total', 'Estado', 'Fecha', 'Acción'].map(h => (
                            <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${border}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ventas.map(v => {
                          const ec = ESTADO_MAP[v.estado] ?? { label: v.estado, bg: '#F3F4F6', text: '#374151' };
                          return (
                            <tr key={v.id} style={{ borderBottom: `1px solid ${border}` }}>
                              <td style={{ padding: '12px 16px', fontWeight: 800, color: accent, fontSize: 13 }}>#{v.id}</td>
                              <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14, color: text }}>{v.comprador_nombre}</td>
                              <td style={{ padding: '12px 16px', fontWeight: 800, color: text }}>${Number(v.total).toFixed(2)}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ padding: '4px 10px', borderRadius: 20, background: ec.bg, color: ec.text, fontSize: 12, fontWeight: 700 }}>{ec.label}</span>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: 12, color: muted }}>{new Date(v.created_at).toLocaleDateString('es-SV')}</td>
                              <td style={{ padding: '12px 16px' }}>
                                {v.estado === 'preparacion' && (
                                  <Btn onClick={() => marcarListo(v)} small>Listo para envío</Btn>
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
          </>
        )}
      </div>

      {/* ── MODAL: Crear Producto ─────────────────────────────────────────────── */}
      <Modal
        show={showCreate} onClose={() => setShowCreate(false)}
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 8, color: text }}>{IC.pkg} Nuevo Producto</span>}
        footer={<>
          <Btn onClick={() => setShowCreate(false)} variant="ghost">Cancelar</Btn>
          <Btn onClick={handleCrearProducto} disabled={saving}>{saving ? 'Guardando...' : 'Guardar producto'}</Btn>
        </>}
      >
        <Field label="Nombre *">
          <input style={inpStyle} value={cpNombre} onChange={e => setCpNombre(e.target.value)} placeholder="Ej: Pan de Coco artesanal"
            onFocus={e => (e.target.style.borderColor = accent)} onBlur={e => (e.target.style.borderColor = border)} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Precio ($) *">
            <input style={inpStyle} type="number" step="0.01" min="0" value={cpPrecio} onChange={e => setCpPrecio(e.target.value)} placeholder="0.00"
              onFocus={e => (e.target.style.borderColor = accent)} onBlur={e => (e.target.style.borderColor = border)} />
          </Field>
          <Field label="Stock">
            <input style={inpStyle} type="number" min="0" value={cpStock} onChange={e => setCpStock(e.target.value)}
              onFocus={e => (e.target.style.borderColor = accent)} onBlur={e => (e.target.style.borderColor = border)} />
          </Field>
        </div>
        <Field label="Descripción">
          <textarea style={{ ...inpStyle, minHeight: 72, resize: 'vertical' }} value={cpDesc} onChange={e => setCpDesc(e.target.value)} placeholder="Describe el producto..."
            onFocus={e => (e.target.style.borderColor = accent)} onBlur={e => (e.target.style.borderColor = border)} />
        </Field>
        <Field label="Categoría">
          <select style={inpStyle} value={cpCat} onChange={e => setCpCat(e.target.value)}>
            {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Imagen del producto">
          <UploadZone
            src={cpImagen} accept="image/*" height={130}
            placeholder={<span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>{IC.img}<span style={{ fontSize: 12, fontWeight: 600 }}>Seleccionar imagen</span></span>}
            onFile={async f => setCpImagen(await fileToBase64(f))}
          />
        </Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', background: cpEsReel ? `${accent}12` : elevated, borderRadius: 10, border: `1.5px solid ${cpEsReel ? accent : border}`, transition: 'all 0.15s' }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${cpEsReel ? accent : border}`, background: cpEsReel ? accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'all 0.15s', flexShrink: 0 }}>
            {cpEsReel && IC.check}
          </div>
          <input type="checkbox" checked={cpEsReel} onChange={e => setCpEsReel(e.target.checked)} style={{ display: 'none' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: text }}>Publicar como Reel</div>
            <div style={{ fontSize: 11, color: muted }}>Aparecerá destacado en la sección de videos</div>
          </div>
          <span style={{ marginLeft: 'auto', color: cpEsReel ? accent : muted }}>{IC.play}</span>
        </label>
      </Modal>

      {/* ── MODAL: Editar Producto ────────────────────────────────────────────── */}
      <Modal
        show={showEditProd} onClose={() => setShowEditProd(false)}
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 8, color: text }}>{IC.edit} Editar producto</span>}
        footer={<>
          <Btn onClick={() => setShowEditProd(false)} variant="ghost">Cancelar</Btn>
          <Btn onClick={handleGuardarProducto} disabled={epSaving}>{epSaving ? 'Guardando...' : 'Guardar cambios'}</Btn>
        </>}
      >
        <Field label="Nombre *">
          <input style={inpStyle} value={epNombre} onChange={e => setEpNombre(e.target.value)}
            onFocus={e => (e.target.style.borderColor = accent)} onBlur={e => (e.target.style.borderColor = border)} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Precio ($) *">
            <input style={inpStyle} type="number" step="0.01" min="0" value={epPrecio} onChange={e => setEpPrecio(e.target.value)}
              onFocus={e => (e.target.style.borderColor = accent)} onBlur={e => (e.target.style.borderColor = border)} />
          </Field>
          <Field label="Stock">
            <input style={inpStyle} type="number" min="0" value={epStock} onChange={e => setEpStock(e.target.value)}
              onFocus={e => (e.target.style.borderColor = accent)} onBlur={e => (e.target.style.borderColor = border)} />
          </Field>
        </div>
        <Field label="Descripción">
          <textarea style={{ ...inpStyle, minHeight: 72, resize: 'vertical' }} value={epDesc} onChange={e => setEpDesc(e.target.value)}
            onFocus={e => (e.target.style.borderColor = accent)} onBlur={e => (e.target.style.borderColor = border)} />
        </Field>
        <Field label="Categoría">
          <select style={inpStyle} value={epCat} onChange={e => setEpCat(e.target.value)}>
            {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Imagen del producto">
          <UploadZone
            src={epImagen ?? epImagenActual} accept="image/*" height={130}
            placeholder={<span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>{IC.img}<span style={{ fontSize: 12, fontWeight: 600 }}>Reemplazar imagen</span></span>}
            onFile={async f => setEpImagen(await fileToBase64(f))}
          />
        </Field>
        <Field label="Video (opcional — reemplaza el actual)">
          <UploadZone
            src={epVideo} accept="video/mp4,video/quicktime,video/webm,video/*" height={130}
            placeholder={<span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>{IC.video}<span style={{ fontSize: 12, fontWeight: 600 }}>Reemplazar video</span></span>}
            onFile={f => { const r = new FileReader(); r.onload = () => setEpVideo(r.result as string); r.readAsDataURL(f); }}
          />
        </Field>

        <div style={{ borderTop: `1px solid ${border}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: text }}>Promoción / precio de oferta</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Precio de oferta ($)">
              <input style={inpStyle} type="number" step="0.01" min="0" value={epOferta} disabled={epQuitarOferta}
                onChange={e => setEpOferta(e.target.value)} placeholder="Ej: 2.50"
                onFocus={e => (e.target.style.borderColor = accent)} onBlur={e => (e.target.style.borderColor = border)} />
            </Field>
            <Field label="Válida hasta">
              <input style={inpStyle} type="datetime-local" value={epOfertaHasta} disabled={epQuitarOferta}
                onChange={e => setEpOfertaHasta(e.target.value)} />
            </Field>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={epQuitarOferta} onChange={e => setEpQuitarOferta(e.target.checked)} />
            <span style={{ fontSize: 13, color: text }}>Quitar oferta activa de este producto</span>
          </label>
        </div>
      </Modal>

      {/* ── MODAL: Crear Reel ─────────────────────────────────────────────────── */}
      <Modal
        show={showReel} onClose={() => { if (!rlUploading) setShowReel(false); }}
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 8, color: accent }}>{IC.play} Nuevo Reel</span>}
        footer={<>
          <Btn onClick={() => setShowReel(false)} variant="ghost" disabled={rlUploading}>Cancelar</Btn>
          <Btn onClick={handleCrearReel} disabled={rlUploading || !rlVideoFile}>
            {rlUploading ? `Subiendo... ${rlProgress}%` : 'Publicar Reel'}
          </Btn>
        </>}
      >
        <Field label="Título del reel *">
          <input style={inpStyle} value={rlTitulo} onChange={e => setRlTitulo(e.target.value)} placeholder="Ej: Pupusas recién hechas"
            onFocus={e => (e.target.style.borderColor = accent)} onBlur={e => (e.target.style.borderColor = border)} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Precio ($)">
            <input style={inpStyle} type="number" step="0.01" min="0" value={rlPrecio} onChange={e => setRlPrecio(e.target.value)} placeholder="0.00"
              onFocus={e => (e.target.style.borderColor = accent)} onBlur={e => (e.target.style.borderColor = border)} />
          </Field>
          <Field label="Categoría">
            <select style={inpStyle} value={rlCat} onChange={e => setRlCat(e.target.value)}>
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Descripción">
          <textarea style={{ ...inpStyle, minHeight: 60, resize: 'vertical' }} value={rlDesc} onChange={e => setRlDesc(e.target.value)} placeholder="Describe el producto..."
            onFocus={e => (e.target.style.borderColor = accent)} onBlur={e => (e.target.style.borderColor = border)} />
        </Field>
        <Field label="Video vertical (MP4, MOV, WebM — máx. 100 MB) *">
          <UploadZone
            src={rlVideoPreview} accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/*" height={200}
            placeholder={<span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>{IC.video}<span style={{ fontSize: 12, fontWeight: 700, color: text }}>Subir video vertical</span><span style={{ fontSize: 11, color: muted }}>MP4, MOV, WebM · max 100 MB</span></span>}
            onFile={f => { setRlVideoFile(f); setRlVideoPreview(URL.createObjectURL(f)); }}
          />
          {rlVideoFile && (
            <div style={{ fontSize: 12, color: muted, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#10B981' }}>{IC.check}</span>
              {rlVideoFile.name} ({(rlVideoFile.size / 1024 / 1024).toFixed(1)} MB)
              <button onClick={() => { setRlVideoFile(null); setRlVideoPreview(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', marginLeft: 4 }}>{IC.x}</button>
            </div>
          )}
        </Field>
        <Field label="Imagen de portada (opcional)">
          <UploadZone
            src={rlImagen} accept="image/*" height={100}
            placeholder={<span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>{IC.img}<span style={{ fontSize: 12 }}>Portada del reel</span></span>}
            onFile={async f => setRlImagen(await fileToBase64(f))}
          />
        </Field>
        {rlUploading && (
          <div>
            <div style={{ height: 4, borderRadius: 4, background: border, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${rlProgress}%`, background: accent, transition: 'width 0.3s', borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 12, color: muted, marginTop: 6 }}>Subiendo video... {rlProgress}%</div>
          </div>
        )}
      </Modal>

      {/* ── MODAL: Editar Tienda ───────────────────────────────────────────────── */}
      <Modal
        show={showEdit} onClose={() => setShowEdit(false)}
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 8, color: text }}>{IC.edit} Editar tienda</span>}
        footer={<>
          <Btn onClick={() => setShowEdit(false)} variant="ghost">Cancelar</Btn>
          <Btn onClick={handleGuardarTienda} disabled={etSaving}>{etSaving ? 'Guardando...' : 'Guardar cambios'}</Btn>
        </>}
      >
        <Field label="Nombre de la tienda">
          <input style={inpStyle} value={etNombre} onChange={e => setEtNombre(e.target.value)} placeholder={tienda?.nombre}
            onFocus={e => (e.target.style.borderColor = accent)} onBlur={e => (e.target.style.borderColor = border)} />
        </Field>
        <Field label="Descripción">
          <textarea style={{ ...inpStyle, minHeight: 60, resize: 'vertical' }} value={etDesc} onChange={e => setEtDesc(e.target.value)} placeholder="Describe tu tienda..."
            onFocus={e => (e.target.style.borderColor = accent)} onBlur={e => (e.target.style.borderColor = border)} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Municipio">
            <select style={inpStyle} value={etMunicipio} onChange={e => setEtMunicipio(e.target.value)}>
              <option value="">— Seleccionar —</option>
              {MUNICIPIOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Categoría">
            <select style={inpStyle} value={etCat} onChange={e => setEtCat(e.target.value)}>
              <option value="">— Sin categoría —</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Dirección exacta">
          <input style={inpStyle} value={etDireccion} onChange={e => setEtDireccion(e.target.value)} placeholder={tienda?.direccion ?? 'Dirección exacta'}
            onFocus={e => (e.target.style.borderColor = accent)} onBlur={e => (e.target.style.borderColor = border)} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Hora apertura">
            <input style={inpStyle} type="time" value={etApertura} onChange={e => setEtApertura(e.target.value)} />
          </Field>
          <Field label="Hora cierre">
            <input style={inpStyle} type="time" value={etCierre} onChange={e => setEtCierre(e.target.value)} />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Logo (imagen cuadrada)">
            <UploadZone
              src={etLogo ?? (tienda?.logo ?? null)} accept="image/*" height={90}
              placeholder={<span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>{IC.img}<span style={{ fontSize: 11 }}>Logo</span></span>}
              onFile={async f => setEtLogo(await fileToBase64(f))}
            />
          </Field>
          <Field label="Portada (banner)">
            <UploadZone
              src={etPortada ?? (tienda?.portada ?? null)} accept="image/*" height={90}
              placeholder={<span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>{IC.img}<span style={{ fontSize: 11 }}>Portada</span></span>}
              onFile={async f => setEtPortada(await fileToBase64(f))}
            />
          </Field>
        </div>
      </Modal>

      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? (isDark ? '#111827' : '#0F172A') : '#EF4444',
          color: '#fff', padding: '12px 22px', borderRadius: 14,
          fontWeight: 700, fontSize: 14, boxShadow: '0 8px 28px rgba(0,0,0,0.3)',
          zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8,
          border: `1px solid ${toast.ok ? (isDark ? '#1E293B' : 'rgba(255,255,255,0.1)') : '#DC2626'}`,
        }}>
          <span style={{ color: toast.ok ? '#10B981' : '#fff' }}>
            {toast.ok ? IC.check : IC.alert}
          </span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
