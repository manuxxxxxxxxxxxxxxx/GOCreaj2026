import { useState, useEffect } from 'react';
import { Plus, Trash2, Power, X } from 'lucide-react';
import { api } from '../api';

interface Cupon {
  id: number;
  codigo: string;
  tipo: 'porcentaje' | 'monto';
  valor: number;
  min_compra: number;
  usos_max: number | null;
  usos_actuales: number;
  activo: 0 | 1;
  expira_at: string | null;
  created_at: string;
}

export default function AdminCupones() {
  const [cupones, setCupones] = useState<Cupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [codigo, setCodigo] = useState('');
  const [tipo, setTipo] = useState<'porcentaje' | 'monto'>('porcentaje');
  const [valor, setValor] = useState('');
  const [minCompra, setMinCompra] = useState('0');
  const [usosMax, setUsosMax] = useState('');
  const [expiraAt, setExpiraAt] = useState('');

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchCupones = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cupones.php?action=listar');
      if (res.data.ok) setCupones(res.data.cupones ?? []);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { void fetchCupones(); }, []);

  const openCrear = () => {
    setCodigo(''); setTipo('porcentaje'); setValor(''); setMinCompra('0'); setUsosMax(''); setExpiraAt('');
    setShowModal(true);
  };

  const crear = async () => {
    if (!codigo.trim() || !valor) return showToast('Código y valor son requeridos', false);
    setSaving(true);
    try {
      const res = await api.post('/cupones.php?action=crear', {
        codigo: codigo.trim(),
        tipo, valor: parseFloat(valor),
        min_compra: parseFloat(minCompra) || 0,
        usos_max: usosMax ? parseInt(usosMax) : null,
        expira_at: expiraAt ? expiraAt.replace('T', ' ') + ':00' : null,
      });
      if (res.data.ok) {
        showToast('Cupón creado');
        setShowModal(false);
        void fetchCupones();
      } else showToast(res.data.error ?? 'Error al crear', false);
    } catch (e: any) { showToast(e.response?.data?.error ?? 'Error de conexión', false); }
    setSaving(false);
  };

  const toggleActivo = async (c: Cupon) => {
    try {
      const res = await api.post('/cupones.php?action=toggle_activo', { id: c.id });
      if (res.data.ok) setCupones(prev => prev.map(x => x.id === c.id ? { ...x, activo: x.activo ? 0 : 1 } : x));
    } catch { showToast('Error', false); }
  };

  const eliminar = async (c: Cupon) => {
    if (!confirm(`¿Eliminar el cupón "${c.codigo}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await api.post('/cupones.php?action=eliminar', { id: c.id });
      if (res.data.ok) { setCupones(prev => prev.filter(x => x.id !== c.id)); showToast('Cupón eliminado'); }
    } catch { showToast('Error', false); }
  };

  const inpStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border, #e2e8f0)',
    fontSize: '0.9rem', outline: 'none', background: 'var(--bg, #f8fafc)', color: 'var(--text, #0f172a)',
    fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase',
    letterSpacing: '0.5px', display: 'block', marginBottom: 6,
  };

  return (
    <div style={{ padding: '8px 4px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 900, color: '#000', letterSpacing: -0.5 }}>Cupones de descuento</h1>
          <p style={{ margin: '4px 0 0', color: '#475569', fontWeight: 600 }}>Crea y administra códigos promocionales de la plataforma</p>
        </div>
        <button onClick={openCrear} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#2563EB', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 14, cursor: 'pointer', fontWeight: 800, boxShadow: '0 6px 18px rgba(37,99,235,0.3)' }}>
          <Plus size={16} /> Nuevo cupón
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#64748B', textAlign: 'center', padding: 40 }}>Cargando cupones...</p>
      ) : cupones.length === 0 ? (
        <div style={{ background: '#FFF', borderRadius: 18, padding: 48, textAlign: 'center', border: '1px solid #E2E8F0' }}>
          <p style={{ color: '#475569', fontWeight: 700 }}>Aún no hay cupones creados</p>
        </div>
      ) : (
        <div style={{ background: '#FFF', borderRadius: 18, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Código', 'Descuento', 'Mín. compra', 'Usos', 'Expira', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cupones.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#2563EB', fontFamily: 'monospace' }}>{c.codigo}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{c.tipo === 'porcentaje' ? `${c.valor}%` : `$${Number(c.valor).toFixed(2)}`}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>${Number(c.min_compra).toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{c.usos_actuales}{c.usos_max !== null ? ` / ${c.usos_max}` : ''}</td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.82rem' }}>{c.expira_at ? new Date(c.expira_at).toLocaleDateString('es-SV') : 'Sin límite'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, background: c.activo ? '#DCFCE7' : '#FEE2E2', color: c.activo ? '#15803D' : '#B91C1C', fontSize: '0.72rem', fontWeight: 800 }}>
                        {c.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => toggleActivo(c)} title={c.activo ? 'Desactivar' : 'Activar'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.activo ? '#D97706' : '#16A34A' }}>
                          <Power size={16} />
                        </button>
                        <button onClick={() => eliminar(c)} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 24px 80px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #1E3A5F, #355068)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>Nuevo cupón</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
            </div>
            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Código</label>
                <input style={{ ...inpStyle, fontFamily: 'monospace', textTransform: 'uppercase' }} value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} placeholder="BIENVENIDA10" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <select style={inpStyle} value={tipo} onChange={e => setTipo(e.target.value as any)}>
                    <option value="porcentaje">Porcentaje (%)</option>
                    <option value="monto">Monto fijo ($)</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Valor</label>
                  <input style={inpStyle} type="number" step="0.01" min="0" value={valor} onChange={e => setValor(e.target.value)} placeholder={tipo === 'porcentaje' ? '10' : '5.00'} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Compra mínima ($)</label>
                  <input style={inpStyle} type="number" step="0.01" min="0" value={minCompra} onChange={e => setMinCompra(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Usos máximos</label>
                  <input style={inpStyle} type="number" min="1" value={usosMax} onChange={e => setUsosMax(e.target.value)} placeholder="Ilimitado" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Expira (opcional)</label>
                <input style={inpStyle} type="datetime-local" value={expiraAt} onChange={e => setExpiraAt(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1.5px solid #E2E8F0', background: 'transparent', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                <button onClick={crear} disabled={saving} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Guardando...' : 'Crear cupón'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? '#0F172A' : '#EF4444', color: '#fff',
          padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: '0.9rem',
          zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
