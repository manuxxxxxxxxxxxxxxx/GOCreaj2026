import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';
import Header from '../components/Header';
import TiendaSidePanel from '../components/TiendaSidePanel';
import { api } from '../api';

declare global { interface Window { L: any } }

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const SV_CENTER: [number, number] = [13.7200, -89.2100];
const SV_ZOOM = 12;

// Los value deben coincidir con el whitelist CATS_VALIDAS del backend (vendedor_dashboard.php),
// el mismo contrato que ya usa la app móvil en SellerScreen.tsx
const CATS = [
  { value: 'Todo',      label: 'Todo' },
  { value: 'comida',    label: 'Comida' },
  { value: 'bebidas',   label: 'Bebidas' },
  { value: 'panaderia', label: 'Panadería' },
  { value: 'postres',   label: 'Postres' },
  { value: 'frutas',    label: 'Frutas' },
  { value: 'verduras',  label: 'Verduras' },
  { value: 'general',   label: 'Otros' },
];

interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  precio_oferta?: number | null;
  imagen?: string | null;
  categoria?: string;
  tienda_nombre: string;
  tienda_id?: number;
  municipio?: string;
  tienda_lat?: number | null;
  tienda_lng?: number | null;
}

// Color de marcador por categoría (sección 9.2) — taxonomía real del backend.
const CATEGORY_COLORS: Record<string, string> = {
  comida: '#F97316',
  bebidas: '#3B82F6',
  panaderia: '#92400E',
  postres: '#EC4899',
  frutas: '#22C55E',
  verduras: '#14B8A6',
  general: '#6B7280',
};
function colorPorCategoria(cat?: string): string {
  return CATEGORY_COLORS[cat ?? 'general'] ?? CATEGORY_COLORS.general;
}

// ── Load Leaflet once from CDN (con preconnect para que cargue más rápido) ──
function useLeaflet() {
  const [ready, setReady] = useState(!!window.L);
  useEffect(() => {
    // Adelanta el handshake DNS/TLS con los CDNs antes de necesitarlos
    ['https://unpkg.com', 'https://a.basemaps.cartocdn.com'].forEach(href => {
      if (document.querySelector(`link[href="${href}"][rel="preconnect"]`)) return;
      const l = document.createElement('link');
      l.rel = 'preconnect'; l.href = href; l.crossOrigin = '';
      document.head.appendChild(l);
    });

    if (window.L) { setReady(true); return; }
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = LEAFLET_CSS;
      document.head.appendChild(l);
    }
    if (document.querySelector(`script[src="${LEAFLET_JS}"]`)) {
      const t = setInterval(() => { if (window.L) { setReady(true); clearInterval(t); } }, 50);
      return () => clearInterval(t);
    }
    const s = document.createElement('script');
    s.src = LEAFLET_JS; s.async = true;
    s.onload = () => setReady(true);
    document.body.appendChild(s);
  }, []);
  return ready;
}

const imgUri = (img?: string | null) => {
  if (!img) return '';
  if (img.startsWith('data:') || img.startsWith('http')) return img;
  return `http://${window.location.hostname}/GOCreaj2026/apps/mobile/backend/uploads/${img}`;
};

// ── Main Component ─────────────────────────────────────────────────────────
export default function Explorar() {
  const { theme, municipio } = useGlobal();
  const isDark = theme === 'dark';
  const leafletReady = useLeaflet();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const verDetalle = (id: number) => {
    sessionStorage.setItem('localmarket_open_product', String(id));
    navigate('/');
  };

  const mapEl   = useRef<HTMLDivElement>(null);
  const mapObj  = useRef<any>(null);
  const tileRef = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [q, setQ]           = useState(() => searchParams.get('q') ?? '');
  const [cat, setCat]       = useState('Todo');
  const [zona, setZona]     = useState(municipio);
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [view, setView]     = useState<'map' | 'list'>('map');
  const [products, setProducts] = useState<Producto[]>([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedTiendaId, setSelectedTiendaId] = useState<number | null>(null);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(true);
  const [inputFocus, setInputFocus] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Colors ──────────────────────────────────────────────────────────────
  const accent = isDark ? '#3B82F6' : '#2563EB';
  const bg     = isDark ? '#080D18' : '#F8FAFC';
  const card   = isDark ? '#111827' : '#FFFFFF';
  const text   = isDark ? '#F1F5F9' : '#0F172A';
  const muted  = isDark ? '#64748B' : '#94A3B8';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const elevated = isDark ? '#1A2236' : '#F1F5F9';

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetch_ = useCallback(async (reset: boolean, pageNum: number) => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        action: q.trim() ? 'buscar' : 'listar',
        page: pageNum, limit: 24,
      };
      if (q.trim()) params.q = q.trim();
      if (cat !== 'Todo') params.categoria = cat;
      if (zona) params.municipio = zona;
      if (view === 'map') params.con_coordenadas = 0; // get ALL for map, not just with coords

      const res = await api.get('/productos.php', { params });
      const raw: any[] = res.data.productos || [];
      const list: Producto[] = raw.map(p => ({
        ...p,
        precio: Number(p.precio),
        precio_oferta: p.precio_oferta != null ? Number(p.precio_oferta) : null,
      }));
      if (reset) setProducts(list); else setProducts(p => [...p, ...list]);
      setPage(pageNum + 1);
      setHasMore(list.length >= 24);
    } catch { /* silent */ }
    setLoading(false);
  }, [q, cat, view, zona]);

  useEffect(() => {
    setPage(1);
    setSelected(null);
    fetch_(true, 1);
  }, [q, cat, zona]);

  // Sincroniza con "Enviar a" del header, pero permite explorar otra zona sin cambiarlo.
  useEffect(() => { setZona(municipio); }, [municipio]);

  // Si el usuario busca de nuevo desde el Header estando ya en /explorar, el componente
  // no se remonta (misma ruta) — hay que releer el ?q= cada vez que cambie.
  useEffect(() => {
    const urlQ = searchParams.get('q') ?? '';
    if (urlQ !== q) setQ(urlQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    api.get('/productos.php?action=municipios').then(res => {
      if (res.data.ok) setMunicipios(res.data.municipios || []);
    }).catch(() => {});
  }, []);

  // ── Init / teardown map ──────────────────────────────────────────────────
  useEffect(() => {
    if (!leafletReady || !mapEl.current || view !== 'map') return;
    if (mapObj.current) return;

    const L = window.L;
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const map = L.map(mapEl.current, {
      center: SV_CENTER, zoom: SV_ZOOM,
      zoomControl: false,
      preferCanvas: true,
      fadeAnimation: true,
      zoomAnimation: true,
    });
    tileRef.current = L.tileLayer(tileUrl, {
      attribution: '© OpenStreetMap © CartoDB',
      subdomains: 'abcd', maxZoom: 19,
      keepBuffer: 6, updateWhenZooming: false, updateWhenIdle: false,
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapObj.current = map;

    return () => {
      if (mapObj.current) { mapObj.current.remove(); mapObj.current = null; }
    };
  }, [leafletReady, view]);

  // ── Swap tile layer on theme change ──────────────────────────────────────
  useEffect(() => {
    if (!mapObj.current || !window.L) return;
    const L = window.L;
    if (tileRef.current) mapObj.current.removeLayer(tileRef.current);
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    tileRef.current = L.tileLayer(tileUrl, {
      attribution: '© OpenStreetMap © CartoDB',
      subdomains: 'abcd', maxZoom: 19,
      keepBuffer: 6, updateWhenZooming: false, updateWhenIdle: false,
    }).addTo(mapObj.current);
  }, [isDark]);

  // ── Place price markers ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapObj.current || !window.L || view !== 'map') return;
    const L = window.L;
    markers.current.forEach(m => mapObj.current.removeLayer(m));
    markers.current = [];

    const withCoords = products.filter(p => p.tienda_lat && p.tienda_lng);

    withCoords.forEach(prod => {
      const price = (prod.precio_oferta ?? prod.precio).toFixed(2);
      const sel   = selected === prod.id;
      const pinColor = colorPorCategoria(prod.categoria);
      const html  = `
        <div class="svgo-price-pin ${sel ? 'sel' : ''}" style="
          --ac:${pinColor};
          background:${sel ? pinColor : (isDark ? '#111827' : '#fff')};
          color:${sel ? '#fff' : pinColor};
          border:2px solid ${pinColor};
        ">
          $${price}
          <span class="svgo-pin-arrow" style="border-top-color:${pinColor}"></span>
        </div>`;

      const icon = L.divIcon({ className: '', html, iconSize: [70, 32], iconAnchor: [35, 38] });
      const marker = L.marker([prod.tienda_lat, prod.tienda_lng], { icon });

      marker.on('click', () => {
        setSelected(prod.id);
        const el = cardRefs.current.get(prod.id);
        if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });

      marker.bindTooltip(
        `<strong>${prod.nombre}</strong><br/><span style="color:#94A3B8;font-size:12px">${prod.tienda_nombre}</span>`,
        { direction: 'top', offset: [0, -12], className: 'svgo-tooltip' }
      );
      marker.addTo(mapObj.current);
      markers.current.push(marker);
    });
  }, [products, selected, isDark, view]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSearch = (val: string) => {
    setQ(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {}, 0); // q state change triggers fetch via useEffect
  };

  const flyTo = (prod: Producto) => {
    setSelected(prod.id);
    if (prod.tienda_lat && prod.tienda_lng && mapObj.current) {
      mapObj.current.flyTo([prod.tienda_lat, prod.tienda_lng], 16, { duration: 0.7 });
    }
  };

  const withCoords = products.filter(p => p.tienda_lat && p.tienda_lng);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: bg, color: text, display: 'flex', flexDirection: 'column' }}>
      {/* Leaflet pin CSS injected inline */}
      <style>{`
        .svgo-price-pin {
          border-radius: 18px;
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          box-shadow: 0 3px 14px rgba(0,0,0,0.28);
          cursor: pointer;
          position: relative;
          transition: transform 0.2s, box-shadow 0.2s;
          line-height: 1;
        }
        .svgo-price-pin.sel {
          transform: scale(1.14);
          box-shadow: 0 6px 20px rgba(0,0,0,0.4);
          z-index: 9999 !important;
        }
        .svgo-pin-arrow {
          position: absolute;
          bottom: -7px; left: 50%;
          transform: translateX(-50%);
          width: 0; height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 7px solid;
        }
        .svgo-tooltip {
          background: ${isDark ? '#111827' : '#fff'} !important;
          color: ${text} !important;
          border: 1px solid ${border} !important;
          border-radius: 10px !important;
          font-family: inherit !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2) !important;
          padding: 8px 12px !important;
        }
        .svgo-tooltip::before { display:none !important; }
        .leaflet-control-zoom a {
          background: ${card} !important;
          color: ${text} !important;
          border-color: ${border} !important;
        }
        .leaflet-bar { border: 1px solid ${border} !important; border-radius: 12px !important; overflow:hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.18) !important; }
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${border}; border-radius: 4px; }
      `}</style>

      <Header />

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        background: isDark ? 'rgba(8,13,24,0.98)' : 'rgba(248,250,252,0.98)',
        backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${border}`,
        padding: '12px 20px 10px',
      }}>
        {/* Search Row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          {/* Search Input */}
          <div style={{ flex: 1, position: 'relative' }}>
            <svg style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:muted }}
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              value={q}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => setInputFocus(true)}
              onBlur={() => setInputFocus(false)}
              placeholder="hamburgesa, ropa, artesanías..."
              style={{
                width: '100%', boxSizing: 'border-box',
                background: card,
                border: `1.5px solid ${inputFocus || q ? accent : border}`,
                borderRadius: 14, padding: '10px 14px 10px 40px',
                fontSize: 15, color: text, outline: 'none',
                transition: 'border-color 0.18s',
              }}
            />
            {q && (
              <button
                onClick={() => setQ('')}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: muted,
                  display: 'flex', alignItems: 'center', padding: 4,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>

          {/* Map / List Toggle */}
          <button
            onClick={() => {
              const next = view === 'map' ? 'list' : 'map';
              setView(next);
              if (next === 'map' && mapObj.current) {
                setTimeout(() => mapObj.current?.invalidateSize(), 100);
              }
            }}
            style={{
              flexShrink: 0,
              background: elevated, border: `1.5px solid ${border}`,
              borderRadius: 12, padding: '0 18px',
              color: text, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
            }}
          >
            {view === 'map' ? (
              <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>Lista</>
            ) : (
              <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83"/>
              </svg>Mapa</>
            )}
          </button>
        </div>

        {/* Category Chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {CATS.map(c => {
            const active = cat === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setCat(c.value)}
                style={{
                  flexShrink: 0,
                  background: active ? accent : elevated,
                  color: active ? '#fff' : text,
                  border: `1.5px solid ${active ? accent : border}`,
                  borderRadius: 20, padding: '5px 16px',
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 0.18s',
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Filtro de zona */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <select
            value={zona}
            onChange={e => setZona(e.target.value)}
            style={{
              background: elevated, color: text, border: `1.5px solid ${border}`,
              borderRadius: 10, padding: '5px 10px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <option value="">Todas las zonas</option>
            {municipios.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* ── MAP VIEW ────────────────────────────────────────────────────── */}
      {view === 'map' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* Map */}
          <div style={{ position: 'relative', height: '54vh', minHeight: 300 }}>
            <div ref={mapEl} style={{ width: '100%', height: '100%' }} />

            {/* Loading overlay */}
            {!leafletReady && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 10,
                background: isDark ? '#0D1321' : '#EFF6FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, border: `3px solid ${border}`,
                  borderTopColor: accent, borderRadius: '50%',
                  animation: 'spin 0.9s linear infinite',
                }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                <span style={{ color: muted, fontSize: 14 }}>Cargando mapa...</span>
              </div>
            )}

            {/* Stats pill */}
            <div style={{
              position: 'absolute', top: 12, left: 12, zIndex: 1000,
              background: isDark ? 'rgba(17,24,39,0.92)' : 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(8px)',
              borderRadius: 12, padding: '7px 14px',
              fontSize: 13, fontWeight: 600, color: text,
              border: `1px solid ${border}`,
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, display: 'inline-block' }} />
              <span>{withCoords.length} en mapa · {products.length} total</span>
            </div>
          </div>

          {/* ── Product Cards Horizontal Strip ─── */}
          <div style={{
            background: isDark ? '#0A0F1E' : '#F0F4FA',
            borderTop: `1px solid ${border}`,
            flex: 1, display: 'flex', flexDirection: 'column',
            minHeight: 0,
          }}>
            {/* Label */}
            <div style={{
              padding: '12px 20px 6px',
              fontSize: 13, fontWeight: 700, color: muted,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>
                {loading
                  ? 'Buscando...'
                  : q
                    ? `${products.length} resultados para "${q}"`
                    : `${products.length} productos`
                }
              </span>
              {q && (
                <button
                  onClick={() => setQ('')}
                  style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Horizontal Scroll */}
            <div style={{
              display: 'flex', gap: 14,
              padding: '4px 20px 20px',
              overflowX: 'auto', scrollbarWidth: 'none',
              flex: 1,
            }}>
              {products.length === 0 && !loading && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flex: 1, color: muted, fontSize: 14,
                }}>
                  No se encontraron productos{q ? ` para "${q}"` : ''}
                </div>
              )}
              {products.map(prod => {
                const sel = selected === prod.id;
                const price = prod.precio_oferta ?? prod.precio;
                const src = imgUri(prod.imagen);
                return (
                  <div
                    key={prod.id}
                    ref={el => { if (el) cardRefs.current.set(prod.id, el); else cardRefs.current.delete(prod.id); }}
                    onClick={() => flyTo(prod)}
                    style={{
                      flexShrink: 0, width: 175,
                      background: card,
                      border: `1.5px solid ${sel ? accent : border}`,
                      borderRadius: 18, overflow: 'hidden',
                      cursor: 'pointer',
                      boxShadow: sel
                        ? `0 0 0 2px ${accent}50, 0 6px 24px rgba(0,0,0,0.22)`
                        : '0 2px 10px rgba(0,0,0,0.07)',
                      transform: sel ? 'translateY(-3px) scale(1.02)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* Image */}
                    <div style={{
                      height: 108, overflow: 'hidden',
                      background: isDark ? '#1A2236' : '#EFF6FF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                    }}>
                      {src
                        ? <img src={src} alt={prod.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <svg viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="1.5" width="36" height="36"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                      }
                      {/* Price bubble */}
                      <div style={{
                        position: 'absolute', bottom: 8, left: 8,
                        background: accent, color: '#fff',
                        borderRadius: 10, padding: '3px 10px',
                        fontSize: 13, fontWeight: 800,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      }}>
                        ${price.toFixed(2)}
                      </div>
                      {prod.precio_oferta && (
                        <div style={{
                          position: 'absolute', top: 8, right: 8,
                          background: '#EF4444', color: '#fff',
                          borderRadius: 8, padding: '2px 7px',
                          fontSize: 10, fontWeight: 700,
                        }}>OFERTA</div>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); verDetalle(prod.id); }}
                        style={{
                          position: 'absolute', bottom: 8, right: 8,
                          background: 'rgba(255,255,255,0.95)', color: accent,
                          border: 'none', borderRadius: 8, padding: '3px 9px',
                          fontSize: 11, fontWeight: 800, cursor: 'pointer',
                        }}
                      >Ver →</button>
                    </div>
                    {/* Info */}
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700, color: text,
                        marginBottom: 3, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {prod.nombre}
                      </div>
                      <div style={{
                        fontSize: 11, color: muted,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {prod.tienda_nombre}
                        {prod.municipio ? ` · ${prod.municipio}` : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Load more trigger */}
              {hasMore && !loading && products.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                  <button
                    onClick={() => fetch_(false, page)}
                    style={{
                      flexShrink: 0,
                      background: elevated, border: `1.5px solid ${border}`,
                      borderRadius: 14, padding: '8px 18px',
                      color: text, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Más →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LIST VIEW ────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', maxWidth: 1400, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: muted, marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>
              {loading ? 'Buscando...' : `${products.length} productos${q ? ` para "${q}"` : ''}`}
            </span>
          </div>

          {/* Product Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 20,
          }}>
            {products.map(prod => {
              const price = prod.precio_oferta ?? prod.precio;
              const src   = imgUri(prod.imagen);
              return (
                <div
                  key={prod.id}
                  onClick={() => verDetalle(prod.id)}
                  style={{
                    background: card, border: `1px solid ${border}`,
                    borderRadius: 20, overflow: 'hidden', cursor: 'pointer',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
                    transition: 'transform 0.18s, box-shadow 0.18s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 32px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'none';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.07)';
                  }}
                >
                  {/* Image */}
                  <div style={{
                    height: 180, overflow: 'hidden',
                    background: isDark ? '#1A2236' : '#EFF6FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}>
                    {src
                      ? <img src={src} alt={prod.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <svg viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="1.5" width="52" height="52"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                    }
                    {prod.precio_oferta && (
                      <div style={{
                        position: 'absolute', top: 12, right: 12,
                        background: '#EF4444', color: '#fff',
                        borderRadius: 8, padding: '4px 10px',
                        fontSize: 11, fontWeight: 700,
                      }}>OFERTA</div>
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{
                      fontSize: 15, fontWeight: 700, color: text, marginBottom: 6,
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {prod.nombre}
                    </div>
                    <div
                      onClick={e => { e.stopPropagation(); if (prod.tienda_id) setSelectedTiendaId(prod.tienda_id); }}
                      style={{ fontSize: 12, color: muted, marginBottom: 14, cursor: prod.tienda_id ? 'pointer' : 'default', width: 'fit-content' }}
                      title="Ver tienda"
                    >
                      {prod.tienda_nombre}{prod.municipio ? ` · ${prod.municipio}` : ''}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: 20, fontWeight: 800, color: accent }}>
                          ${price.toFixed(2)}
                        </span>
                        {prod.precio_oferta && (
                          <span style={{ fontSize: 13, color: muted, textDecoration: 'line-through', marginLeft: 8 }}>
                            ${prod.precio.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); verDetalle(prod.id); }}
                        style={{
                          background: accent, color: '#fff', border: 'none',
                          borderRadius: 12, padding: '8px 18px',
                          fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          transition: 'opacity 0.18s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                      >
                        Ver
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {!loading && products.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '80px 20px',
              color: muted, fontSize: 16,
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <div style={{ fontWeight: 700, marginBottom: 8, color: text }}>Sin resultados</div>
              <div>No encontramos productos{q ? ` para "${q}"` : ''}. Prueba con otro término.</div>
            </div>
          )}

          {/* Load more */}
          {hasMore && !loading && products.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
              <button
                onClick={() => fetch_(false, page)}
                style={{
                  background: accent, color: '#fff', border: 'none',
                  borderRadius: 14, padding: '12px 40px',
                  fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  boxShadow: `0 4px 16px ${accent}50`,
                }}
              >
                Cargar más
              </button>
            </div>
          )}

          {/* Spinner */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
              <div style={{
                width: 36, height: 36,
                border: `3px solid ${border}`, borderTopColor: accent,
                borderRadius: '50%', animation: 'spin 0.9s linear infinite',
              }} />
            </div>
          )}
        </div>
      )}

      <TiendaSidePanel
        tiendaId={selectedTiendaId}
        onClose={() => setSelectedTiendaId(null)}
        onSelectProduct={raw => verDetalle(raw.id)}
      />
    </div>
  );
}
