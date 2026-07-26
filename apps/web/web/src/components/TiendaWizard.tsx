import { useState, useEffect } from 'react';
import { api } from '../api';

interface MunicipioCat { id: number; nombre: string; departamento: string; lat: number; lng: number; }

const CATEGORIAS = [
  { value: 'comida',     label: 'Comida' },
  { value: 'bebidas',    label: 'Bebidas' },
  { value: 'panaderia',  label: 'Panadería' },
  { value: 'postres',    label: 'Postres' },
  { value: 'frutas',     label: 'Frutas' },
  { value: 'verduras',   label: 'Verduras' },
  { value: 'general',    label: 'General' },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function TiendaWizard({ onCreated, isDark }: { onCreated: () => void; isDark: boolean }) {
  const [step, setStep] = useState(1);
  const [municipios, setMunicipios] = useState<MunicipioCat[]>([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0].value);
  const [telefono, setTelefono] = useState('');
  const [municipioId, setMunicipioId] = useState('');
  const [direccion, setDireccion] = useState('');
  const [horaApertura, setHoraApertura] = useState('08:00');
  const [horaCierre, setHoraCierre] = useState('18:00');
  const [logo, setLogo] = useState<string | null>(null);
  const [portada, setPortada] = useState<string | null>(null);
  const [metodosPago, setMetodosPago] = useState<string[]>(['efectivo']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/productos.php?action=municipios_catalogo').then(res => {
      if (res.data.ok) setMunicipios(res.data.municipios || []);
    }).catch(() => {});
  }, []);

  const bg      = isDark ? '#080D18' : '#F8FAFC';
  const card    = isDark ? '#111827' : '#FFFFFF';
  const border  = isDark ? '#1E293B' : '#E2E8F0';
  const text    = isDark ? '#F1F5F9' : '#0F172A';
  const muted   = isDark ? '#64748B' : '#94A3B8';
  const accent  = isDark ? '#3B82F6' : '#2563EB';
  const inputBg = isDark ? '#1E293B' : '#F8FAFC';

  const inpStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: inputBg, border: `1.5px solid ${border}`,
    borderRadius: 10, padding: '11px 14px',
    fontSize: 14, color: text, outline: 'none', fontFamily: 'inherit',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: muted, marginBottom: 6, display: 'block',
  };

  const toggleMetodo = (m: string) => {
    setMetodosPago(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const puedeAvanzarPaso1 = nombre.trim().length > 0 && municipioId !== '';
  const puedeCrear = puedeAvanzarPaso1 && direccion.trim().length > 0;

  const crearTienda = async () => {
    const muni = municipios.find(m => m.id === parseInt(municipioId));
    if (!muni) { setError('Selecciona un municipio válido'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/vendedor_dashboard.php?action=crear_tienda', {
        nombre: nombre.trim(),
        descripcion,
        categoria,
        telefono,
        municipio: muni.nombre,
        direccion,
        lat: muni.lat,
        lng: muni.lng,
        hora_apertura: horaApertura,
        hora_cierre: horaCierre,
        logo,
        portada,
        metodos_pago: metodosPago.join(','),
      });
      if (res.data.ok) {
        onCreated();
      } else {
        setError(res.data.error || 'No se pudo crear la tienda');
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 20, padding: '36px 32px', maxWidth: 640, margin: '0 auto', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: s <= step ? accent : border, transition: 'background 0.2s' }} />
        ))}
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 6px', color: text }}>Configura tu tienda</h2>
      <p style={{ color: muted, fontSize: 13, margin: '0 0 24px' }}>
        {step === 1 && 'Cuéntanos sobre tu negocio'}
        {step === 2 && 'Dirección y horario de atención'}
        {step === 3 && 'Toques finales — logo, portada y pagos'}
      </p>

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Nombre de la tienda *</label>
            <input style={inpStyle} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Panadería El Sol" />
          </div>
          <div>
            <label style={labelStyle}>Descripción</label>
            <textarea style={{ ...inpStyle, minHeight: 72, resize: 'vertical' }} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Describe tu negocio..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Categoría</label>
              <select style={inpStyle} value={categoria} onChange={e => setCategoria(e.target.value)}>
                {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Municipio *</label>
              <select style={inpStyle} value={municipioId} onChange={e => setMunicipioId(e.target.value)}>
                <option value="">Selecciona...</option>
                {municipios.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button disabled={!puedeAvanzarPaso1} onClick={() => setStep(2)} style={{ background: accent, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 24px', fontWeight: 700, cursor: puedeAvanzarPaso1 ? 'pointer' : 'not-allowed', opacity: puedeAvanzarPaso1 ? 1 : 0.5, fontFamily: 'inherit' }}>
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Dirección exacta *</label>
            <input style={inpStyle} value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Calle, colonia, punto de referencia" />
          </div>
          <div>
            <label style={labelStyle}>Teléfono</label>
            <input style={inpStyle} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="7000-0000" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Hora de apertura</label>
              <input style={inpStyle} type="time" value={horaApertura} onChange={e => setHoraApertura(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Hora de cierre</label>
              <input style={inpStyle} type="time" value={horaCierre} onChange={e => setHoraCierre(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <button onClick={() => setStep(1)} style={{ background: 'none', border: `1.5px solid ${border}`, color: text, borderRadius: 10, padding: '11px 24px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>← Atrás</button>
            <button disabled={!puedeCrear} onClick={() => setStep(3)} style={{ background: accent, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 24px', fontWeight: 700, cursor: puedeCrear ? 'pointer' : 'not-allowed', opacity: puedeCrear ? 1 : 0.5, fontFamily: 'inherit' }}>
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Logo</label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 90, borderRadius: 12, border: `2px dashed ${border}`, cursor: 'pointer', overflow: 'hidden', background: inputBg }}>
                {logo ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12, color: muted, fontWeight: 600 }}>Subir logo</span>}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) setLogo(await fileToBase64(f)); }} />
              </label>
            </div>
            <div>
              <label style={labelStyle}>Portada</label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 90, borderRadius: 12, border: `2px dashed ${border}`, cursor: 'pointer', overflow: 'hidden', background: inputBg }}>
                {portada ? <img src={portada} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12, color: muted, fontWeight: 600 }}>Subir portada</span>}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) setPortada(await fileToBase64(f)); }} />
              </label>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Métodos de pago que aceptas</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['efectivo', 'tarjeta'].map(m => (
                <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 10, border: `1.5px solid ${metodosPago.includes(m) ? accent : border}`, background: metodosPago.includes(m) ? `${accent}18` : 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: text, textTransform: 'capitalize' }}>
                  <input type="checkbox" checked={metodosPago.includes(m)} onChange={() => toggleMetodo(m)} style={{ display: 'none' }} />
                  {m}
                </label>
              ))}
            </div>
          </div>
          {error && <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <button onClick={() => setStep(2)} style={{ background: 'none', border: `1.5px solid ${border}`, color: text, borderRadius: 10, padding: '11px 24px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>← Atrás</button>
            <button disabled={saving} onClick={crearTienda} style={{ background: accent, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 24px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
              {saving ? 'Creando...' : 'Crear mi tienda'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
