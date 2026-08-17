import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';
import { Bike, Gauge, Car, Truck, Camera, type LucideIcon } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { api } from '../api';
import '../../css/dark.css';

type RolType = 'vendedor' | 'repartidor';
type Vehiculo = 'bicicleta' | 'moto' | 'carro' | 'pickup';

const VEHICULOS: { id: Vehiculo; label: string; icon: LucideIcon }[] = [
  { id: 'bicicleta', label: 'Bicicleta', icon: Bike },
  { id: 'moto',      label: 'Moto',      icon: Gauge },
  { id: 'carro',     label: 'Carro',     icon: Car },
  { id: 'pickup',    label: 'Pickup',    icon: Truck },
];

const MUNICIPIOS_SV = [
  'San Salvador', 'Santa Ana', 'Mejicanos', 'Delgado', 'Soyapango',
  'San Miguel', 'Apopa', 'Nueva San Salvador', 'Zacatecoluca', 'Usulután',
  'Ahuachapán', 'Cojutepeque', 'San Vicente', 'La Unión', 'Chalatenango',
  'Sensuntepeque', 'San Francisco Gotera', 'Santiago de María', 'Metapán', 'Antiguo Cuscatlán'
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => res(e.target?.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

export default function BecomeSeller() {
  const navigate = useNavigate();
  const { user } = useGlobal();
  const [searchParams] = useSearchParams();
  const rolInicial = searchParams.get('rol') === 'repartidor' ? 'repartidor' : 'vendedor';
  const [rol, setRol] = useState<RolType>(rolInicial);
  const [nombre, setNombre] = useState('');
  const [dui, setDui] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [vehiculo, setVehiculo] = useState<Vehiculo>('moto');
  const [licFrente, setLicFrente] = useState('');
  const [licReverso, setLicReverso] = useState('');
  const [licFrentePreview, setLicFrentePreview] = useState('');
  const [licReversoPreview, setLicReversoPreview] = useState('');
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [duiFrente, setDuiFrente] = useState('');
  const [duiReverso, setDuiReverso] = useState('');
  const [duiFrentePreview, setDuiFrentePreview] = useState('');
  const [duiReversoPreview, setDuiReversoPreview] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const frenteRef = useRef<HTMLInputElement>(null);
  const reversoRef = useRef<HTMLInputElement>(null);
  const licFrenteRef = useRef<HTMLInputElement>(null);
  const licReversoRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, side: 'frente' | 'reverso' | 'lic_frente' | 'lic_reverso') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    if (side === 'frente') { setDuiFrente(b64); setDuiFrentePreview(b64); }
    else if (side === 'reverso') { setDuiReverso(b64); setDuiReversoPreview(b64); }
    else if (side === 'lic_frente') { setLicFrente(b64); setLicFrentePreview(b64); }
    else { setLicReverso(b64); setLicReversoPreview(b64); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nombre.trim()) { setError('Ingresa tu nombre completo'); return; }
    if (!dui.trim() || dui.replace(/\D/g, '').length < 8) { setError('Ingresa un número de DUI válido'); return; }
    if (!duiFrente) { setError('Sube la foto frontal de tu DUI'); return; }
    if (!duiReverso) { setError('Sube la foto del reverso de tu DUI'); return; }
    if (!aceptaTerminos) { setError('Debes aceptar los términos y condiciones'); return; }
    if (!user) { navigate('/login'); return; }

    setSending(true);
    try {
      const res = await api.post('/perfil_solicitudes.php?action=crear', {
        rol_solicitado: rol,
        nombre_completo: nombre,
        municipio,
        dui_numero: dui,
        dui_frente: duiFrente,
        dui_reverso: duiReverso,
        ...(rol === 'vendedor'
          ? { nombre_negocio: nombreNegocio }
          : { tipo_vehiculo: vehiculo, licencia_frente: licFrente || undefined, licencia_reverso: licReverso || undefined }),
      });
      if (res.data.ok) {
        setSent(true);
      } else {
        setError(res.data.error === 'Ya tienes una solicitud pendiente'
          ? 'Ya tienes una solicitud en revisión. Espera la respuesta del equipo SVGO.'
          : res.data.error || 'Error al enviar solicitud'
        );
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <>
        <Header />
        <div style={{ maxWidth: '520px', margin: '60px auto', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" width="32" height="32"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 style={{ fontWeight: '800', fontSize: '1.5rem', marginBottom: '8px' }}>¡Solicitud enviada!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>
            El equipo SVGO revisará tu documentación y te notificará en 24–48 horas.
          </p>
          <button
            onClick={() => navigate('/perfil')}
            style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 28px', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem' }}
          >
            Volver a mi perfil
          </button>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 20px 60px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue)', fontWeight: '600', fontSize: '0.9rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Volver
        </button>

        <h1 style={{ fontWeight: '800', fontSize: '1.6rem', marginBottom: '6px' }}>Solicitar cambio de rol</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '28px', fontSize: '0.9rem' }}>
          Completa el formulario para solicitar ser Vendedor o Repartidor en SVGO. Tu solicitud será revisada por el equipo en 24–48 horas.
        </p>

        {/* Role selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
          {(['vendedor', 'repartidor'] as RolType[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRol(r)}
              style={{
                padding: '18px 12px', borderRadius: '14px', border: '2px solid',
                borderColor: rol === r ? 'var(--blue)' : 'var(--border)',
                background: rol === r ? 'rgba(37, 99, 235,0.12)' : 'transparent',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'
              }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: 'rgba(37, 99, 235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)' }}>
                {r === 'vendedor'
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                }
              </div>
              <span style={{ fontWeight: '700', fontSize: '0.95rem', color: rol === r ? 'var(--blue)' : 'inherit', textTransform: 'capitalize' }}>{r}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                {r === 'vendedor' ? 'Publica y vende tus productos' : 'Entrega pedidos y genera ingresos'}
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Nombre completo */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px' }}>Nombre completo *</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Como aparece en tu DUI"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.9rem', boxSizing: 'border-box', background: 'var(--white)', color: 'var(--text)' }}
            />
          </div>

          {/* DUI */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px' }}>Número de DUI *</label>
            <input
              type="text"
              value={dui}
              onChange={e => setDui(e.target.value.replace(/[^0-9\-]/g, '').slice(0, 10))}
              placeholder="00000000-0"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.9rem', boxSizing: 'border-box', background: 'var(--white)', color: 'var(--text)' }}
            />
          </div>

          {/* Municipio */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px' }}>Municipio de operación</label>
            <select
              value={municipio}
              onChange={e => setMunicipio(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.9rem', background: 'var(--white)', color: 'var(--text)', colorScheme: 'light dark', boxSizing: 'border-box' }}
            >
              <option value="">Selecciona un municipio</option>
              {MUNICIPIOS_SV.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {rol === 'vendedor' ? (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px' }}>Nombre de tu tienda / negocio</label>
              <input
                type="text"
                value={nombreNegocio}
                onChange={e => setNombreNegocio(e.target.value)}
                placeholder="Ej: Panadería El Sol"
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.9rem', boxSizing: 'border-box', background: 'var(--white)', color: 'var(--text)' }}
              />
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '8px' }}>Tipo de vehículo</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {VEHICULOS.map(v => (
                    <button
                      key={v.id} type="button" onClick={() => setVehiculo(v.id)}
                      style={{
                        padding: '10px 16px', borderRadius: '10px', border: '2px solid',
                        borderColor: vehiculo === v.id ? 'var(--blue)' : 'var(--border)',
                        background: vehiculo === v.id ? 'rgba(37, 99, 235,0.12)' : 'transparent',
                        color: vehiculo === v.id ? 'var(--blue)' : 'inherit',
                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '7px',
                      }}
                    >
                      <v.icon size={16} strokeWidth={2} />{v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '12px' }}>Licencia de conducir (opcional)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <input ref={licFrenteRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e, 'lic_frente')} />
                    <button type="button" onClick={() => licFrenteRef.current?.click()} style={{ width: '100%', aspectRatio: '16/9', border: '2px dashed', borderColor: licFrente ? '#22c55e' : 'var(--border)', borderRadius: '12px', background: 'transparent', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {licFrentePreview
                        ? <img src={licFrentePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}><div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'center' }}><Camera size={26} strokeWidth={1.6} /></div><div style={{ fontSize: '0.75rem', fontWeight: '600' }}>Lic. Frente</div></div>}
                    </button>
                  </div>
                  <div>
                    <input ref={licReversoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e, 'lic_reverso')} />
                    <button type="button" onClick={() => licReversoRef.current?.click()} style={{ width: '100%', aspectRatio: '16/9', border: '2px dashed', borderColor: licReverso ? '#22c55e' : 'var(--border)', borderRadius: '12px', background: 'transparent', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {licReversoPreview
                        ? <img src={licReversoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}><div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'center' }}><Camera size={26} strokeWidth={1.6} /></div><div style={{ fontSize: '0.75rem', fontWeight: '600' }}>Lic. Reverso</div></div>}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* DUI photos */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '12px' }}>Fotos del DUI *</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Frente */}
              <div>
                <input ref={frenteRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e, 'frente')} />
                <button
                  type="button"
                  onClick={() => frenteRef.current?.click()}
                  style={{
                    width: '100%', aspectRatio: '16/9', border: '2px dashed',
                    borderColor: duiFrente ? '#22c55e' : 'var(--border)',
                    borderRadius: '12px', background: 'transparent', cursor: 'pointer',
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                  }}
                >
                  {duiFrentePreview
                    ? <img src={duiFrentePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'center' }}><Camera size={26} strokeWidth={1.6} /></div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '600' }}>Frente DUI</div>
                      </div>
                  }
                </button>
              </div>
              {/* Reverso */}
              <div>
                <input ref={reversoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e, 'reverso')} />
                <button
                  type="button"
                  onClick={() => reversoRef.current?.click()}
                  style={{
                    width: '100%', aspectRatio: '16/9', border: '2px dashed',
                    borderColor: duiReverso ? '#22c55e' : 'var(--border)',
                    borderRadius: '12px', background: 'transparent', cursor: 'pointer',
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {duiReversoPreview
                    ? <img src={duiReversoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'center' }}><Camera size={26} strokeWidth={1.6} /></div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '600' }}>Reverso DUI</div>
                      </div>
                  }
                </button>
              </div>
            </div>
          </div>

          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px',
            border: `1.5px solid ${aceptaTerminos ? 'var(--blue)' : 'var(--border)'}`, borderRadius: '10px',
            marginBottom: '16px', cursor: 'pointer',
            background: aceptaTerminos ? 'rgba(37, 99, 235,0.12)' : 'transparent',
            color: 'var(--text)',
          }}>
            <input
              type="checkbox"
              checked={aceptaTerminos}
              onChange={e => setAceptaTerminos(e.target.checked)}
              style={{ marginTop: '3px', width: '16px', height: '16px', flexShrink: 0, accentColor: 'var(--blue)' }}
            />
            <span style={{ fontSize: '0.85rem' }}>
              He leído y acepto los <strong>términos y condiciones</strong> de [SV]Go para socios.
            </span>
          </label>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            style={{
              width: '100%', padding: '14px', background: 'var(--blue)', color: '#fff', border: 'none',
              borderRadius: '12px', fontWeight: '700', fontSize: '1rem', cursor: sending ? 'not-allowed' : 'pointer',
              opacity: sending ? 0.7 : 1
            }}
          >
            {sending ? 'Enviando solicitud...' : 'Enviar solicitud'}
          </button>
        </form>
      </div>
      <Footer />
    </>
  );
}
