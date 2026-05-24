import { useState, useEffect } from 'react';
import { Search, Shield, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../api';
import './Users.css';

const API_URL = 'http://localhost/GOCreaj2026/apps/mobile/backend';

interface UserRow {
  id: number;
  nombre: string;
  username?: string;
  email?: string;
  telefono?: string;
  rol: string;
  foto_perfil?: string | null;
  activo: number;
  created_at: string;
}

interface Solicitud {
  id: number;
  usuario_id: number;
  usuario_nombre: string;
  email?: string;
  telefono?: string;
  rol_solicitado: string;
  nombre_completo: string;
  dui_numero: string;
  dui_frente: string;
  dui_reverso: string;
  estado: string;
  credenciales?: string;
  notas_admin?: string;
  created_at: string;
  // nuevos campos
  nombre_negocio?: string | null;
  foto_negocio?: string | null;
  licencia_frente?: string | null;
  licencia_reverso?: string | null;
  tipo_vehiculo?: string | null;
}

const UPLOADS_BASE = `${API_URL}/uploads/`;

function imgUri(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('data:')) return path;
  // Extract relative path after /uploads/ regardless of which base URL was stored
  const m = path.match(/\/uploads\/(.+)$/);
  if (m) return `${UPLOADS_BASE}${m[1]}`;
  if (path.startsWith('http')) return path;
  return `${UPLOADS_BASE}${path}`;
}

function RolBadge({ rol }: { rol: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    admin:      { bg: '#ede9fe', text: '#6d28d9' },
    vendedor:   { bg: '#dbeafe', text: '#1d4ed8' },
    repartidor: { bg: '#fef3c7', text: '#92400e' },
    comprador:  { bg: '#f1f5f9', text: '#475569' },
  };
  const c = colors[rol] ?? colors.comprador;
  return (
    <span style={{ padding: '3px 10px', borderRadius: '20px', background: c.bg, color: c.text, fontWeight: '800', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
      {rol}
    </span>
  );
}

export default function Users() {
  const [users, setUsers]             = useState<UserRow[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState<'usuarios' | 'solicitudes'>('usuarios');
  const [verSol, setVerSol]           = useState<Solicitud | null>(null);
  const [notas, setNotas]             = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resU, resS] = await Promise.all([
        api.get('/admin_dashboard.php?action=usuarios'),
        api.get('/admin_dashboard.php?action=solicitudes&estado=pendiente'),
      ]);
      if (resU.data.ok) setUsers(resU.data.usuarios ?? []);
      if (resS.data.ok) setSolicitudes(resS.data.solicitudes ?? []);
    } catch (e) {
      console.error('Error fetching data', e);
    }
    setLoading(false);
  };

  useEffect(() => { void fetchData(); }, []);

  const filteredUsers = users.filter(u =>
    (u.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(search.toLowerCase())
  );

  const changeRole = async (id: number, newRole: string) => {
    try {
      await api.post('/admin_dashboard.php?action=actualizar_usuario', { usuario_id: id, rol: newRole });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, rol: newRole } : u));
    } catch (e) {
      alert('Error cambiando rol');
    }
  };

  const toggleStatus = async (id: number, currentState: number) => {
    const newState = currentState === 1 ? 0 : 1;
    try {
      await api.post('/admin_dashboard.php?action=actualizar_usuario', { usuario_id: id, activo: newState });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, activo: newState } : u));
    } catch (e) {
      alert('Error cambiando estado');
    }
  };

  const resolverSolicitud = async (id: number, decision: 'aprobado' | 'rechazado') => {
    try {
      await api.post('/admin_dashboard.php?action=resolver', { solicitud_id: id, decision, notas });
      setVerSol(null);
      setNotas('');
      void fetchData();
    } catch (e) {
      alert('Error resolviendo solicitud');
    }
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>Gestión de Usuarios y Roles</h1>
        <p>Administra accesos, aprueba solicitudes y asigna roles.</p>
      </div>

      <div className="card users-container">
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button
            className={`btn ${activeTab === 'usuarios' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('usuarios')}
          >
            Usuarios ({users.length})
          </button>
          <button
            className={`btn ${activeTab === 'solicitudes' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('solicitudes')}
            style={{ position: 'relative' }}
          >
            Solicitudes pendientes
            {solicitudes.length > 0 && (
              <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#dc2626', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: '800' }}>
                {solicitudes.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Usuarios tab ── */}
        {activeTab === 'usuarios' && (
          <>
            <div className="toolbar">
              <div className="search-box">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o @username..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={fetchData}>
                <Shield size={16} /> Refrescar
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol actual</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="empty-state">Cargando...</td></tr>
                  ) : filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="user-info-cell">
                          <div className="avatar-sm" style={{ background: '#4A6D8C', color: 'white', fontWeight: '800' }}>
                            {(u.nombre || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="user-name">{u.nombre || 'Sin Nombre'}</p>
                            <p className="user-email">{u.email ?? u.telefono ?? u.username ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          className="role-select"
                          value={u.rol}
                          onChange={e => changeRole(u.id, e.target.value)}
                        >
                          <option value="comprador">Comprador</option>
                          <option value="vendedor">Vendedor</option>
                          <option value="repartidor">Repartidor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        <RolBadge rol={u.activo ? 'Activo' : 'Suspendido'} />
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className={`btn ${u.activo ? 'btn-outline' : 'btn-primary'}`}
                            onClick={() => toggleStatus(u.id, u.activo)}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          >
                            {u.activo ? 'Suspender' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredUsers.length === 0 && (
                    <tr><td colSpan={4} className="empty-state">No se encontraron usuarios.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Solicitudes tab ── */}
        {activeTab === 'solicitudes' && (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Solicitante</th>
                  <th>Solicita rol</th>
                  <th>DUI</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="empty-state">Cargando...</td></tr>
                ) : solicitudes.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="user-info-cell">
                        <div className="avatar-sm" style={{ background: '#4A6D8C', color: 'white', fontWeight: '800' }}>
                          {(s.usuario_nombre || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="user-name">{s.nombre_completo || s.usuario_nombre || 'Sin nombre'}</p>
                          <p className="user-email">{s.email ?? s.telefono ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td><RolBadge rol={s.rol_solicitado} /></td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.dui_numero}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleDateString('es-SV')}</td>
                    <td>
                      <div className="action-buttons" style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-outline"
                          onClick={() => { setVerSol(s); setNotas(''); }}
                          style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem' }}
                        >
                          Ver detalles
                        </button>
                        <button
                          title="Aprobar"
                          onClick={() => resolverSolicitud(s.id, 'aprobado')}
                          style={{ padding: '0.4rem', background: '#15803d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          title="Rechazar"
                          onClick={() => resolverSolicitud(s.id, 'rechazado')}
                          style={{ padding: '0.4rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && solicitudes.length === 0 && (
                  <tr><td colSpan={5} className="empty-state">No hay solicitudes pendientes.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: Detalle solicitud ── */}
      {verSol && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => e.target === e.currentTarget && setVerSol(null)}>
          <div style={{ background: 'var(--white, #fff)', borderRadius: '20px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #355068, #4A6D8C)', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ color: '#fff', fontWeight: '800', fontSize: '1.2rem', margin: 0 }}>{verSol.nombre_completo}</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                  Solicita ser <strong style={{ color: '#fff' }}>{verSol.rol_solicitado}</strong>
                </p>
              </div>
              <button onClick={() => setVerSol(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '10px', width: '36px', height: '36px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>✕</button>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', padding: '24px 28px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Basic info */}
              <InfoGrid rows={[
                ['DUI', verSol.dui_numero],
                ['Email', verSol.email ?? '—'],
                ['Teléfono', verSol.telefono ?? '—'],
                verSol.credenciales ? ['Credenciales', verSol.credenciales] : null,
              ]} />

              {/* DUI photos */}
              <SectionLabel>Fotos del DUI</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <PhotoViewer src={imgUri(verSol.dui_frente)} label="Frente" />
                <PhotoViewer src={imgUri(verSol.dui_reverso)} label="Reverso" />
              </div>

              {/* Vendedor extra */}
              {verSol.rol_solicitado === 'vendedor' && (verSol.nombre_negocio || verSol.foto_negocio) && (
                <>
                  <SectionLabel>Información del negocio</SectionLabel>
                  {verSol.nombre_negocio && <KVRow label="Nombre del negocio" value={verSol.nombre_negocio} />}
                  {verSol.foto_negocio && (
                    <PhotoViewer src={imgUri(verSol.foto_negocio)} label="Foto del negocio" wide />
                  )}
                </>
              )}

              {/* Repartidor extra */}
              {verSol.rol_solicitado === 'repartidor' && (verSol.tipo_vehiculo || verSol.licencia_frente || verSol.licencia_reverso) && (
                <>
                  <SectionLabel>Información del repartidor</SectionLabel>
                  {verSol.tipo_vehiculo && <KVRow label="Tipo de vehículo" value={verSol.tipo_vehiculo} />}
                  {(verSol.licencia_frente || verSol.licencia_reverso) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <PhotoViewer src={imgUri(verSol.licencia_frente)} label="Licencia frente" />
                      <PhotoViewer src={imgUri(verSol.licencia_reverso)} label="Licencia reverso" />
                    </div>
                  )}
                </>
              )}

              {/* Notas input */}
              <div>
                <SectionLabel>Notas (opcional)</SectionLabel>
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Motivo del rechazo o comentario para el usuario..."
                  rows={2}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border, #e2e8f0)', fontFamily: 'inherit', fontSize: '0.88rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Footer buttons */}
            <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border, #e2e8f0)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setVerSol(null)} style={{ padding: '9px 18px', borderRadius: '10px', border: '1.5px solid var(--border, #e2e8f0)', background: 'transparent', cursor: 'pointer', fontWeight: '700', fontFamily: 'inherit', fontSize: '0.88rem' }}>
                Cancelar
              </button>
              <button
                onClick={() => resolverSolicitud(verSol.id, 'rechazado')}
                style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontWeight: '800', fontFamily: 'inherit', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <XCircle size={15} /> Rechazar
              </button>
              <button
                onClick={() => resolverSolicitud(verSol.id, 'aprobado')}
                style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: '#4A6D8C', color: 'white', cursor: 'pointer', fontWeight: '800', fontFamily: 'inherit', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <CheckCircle size={15} /> Aprobar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper sub-components ───────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted, #6b7280)', margin: 0 }}>
      {children}
    </p>
  );
}

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '12px', fontSize: '0.88rem' }}>
      <span style={{ color: 'var(--text-muted, #6b7280)', fontWeight: '600', minWidth: '130px' }}>{label}</span>
      <span style={{ fontWeight: '700' }}>{value}</span>
    </div>
  );
}

function InfoGrid({ rows }: { rows: ([string, string] | null)[] }) {
  const valid = rows.filter(Boolean) as [string, string][];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
      {valid.map(([label, value]) => (
        <KVRow key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function PhotoViewer({ src, label, wide }: { src?: string; label: string; wide?: boolean }) {
  if (!src) {
    return (
      <div style={{ gridColumn: wide ? '1 / -1' : undefined, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted, #6b7280)' }}>{label}</span>
        <div style={{ height: '110px', borderRadius: '10px', background: 'var(--bg, #f8fafc)', border: '1.5px solid var(--border, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #6b7280)', fontSize: '0.82rem' }}>
          Sin imagen
        </div>
      </div>
    );
  }
  return (
    <div style={{ gridColumn: wide ? '1 / -1' : undefined, display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted, #6b7280)' }}>{label}</span>
      <a href={src} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
        <img
          src={src}
          alt={label}
          style={{ width: '100%', height: wide ? '160px' : '110px', objectFit: 'cover', borderRadius: '10px', border: '1.5px solid var(--border, #e2e8f0)', cursor: 'zoom-in' }}
        />
      </a>
    </div>
  );
}
