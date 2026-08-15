import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
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

function RolChip({ rol }: { rol: string }) {
  return <span className="ur-role-chip">{rol}</span>;
}

const PAGE_SIZE = 15;

function getCurrentUserId(): number | null {
  try {
    const saved = localStorage.getItem('lm_user_v1');
    if (!saved) return null;
    const u = JSON.parse(saved);
    return u?.id ?? null;
  } catch {
    return null;
  }
}

export default function Users() {
  const currentUserId = getCurrentUserId();
  const [users, setUsers]             = useState<UserRow[]>([]);
  const [totalUsers, setTotalUsers]   = useState(0);
  const [page, setPage]               = useState(1);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState<'usuarios' | 'solicitudes'>('usuarios');
  const [verSol, setVerSol]           = useState<Solicitud | null>(null);
  const [notas, setNotas]             = useState('');
  // Modal suspensión
  const [suspendModal, setSuspendModal] = useState<{ id: number; nombre: string; activo: number } | null>(null);
  const [suspendRazon, setSuspendRazon] = useState('');
  // Toast
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);

  const fetchUsuarios = async (targetPage: number, q: string) => {
    const res = await api.get('/admin_dashboard.php?action=usuarios', {
      params: { page: targetPage, limit: PAGE_SIZE, q: q.trim() || undefined },
    });
    if (res.data.ok) {
      setUsers(res.data.usuarios ?? []);
      setTotalUsers(res.data.total ?? 0);
      setPage(res.data.page ?? targetPage);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [, resS] = await Promise.all([
        fetchUsuarios(1, search),
        api.get('/admin_dashboard.php?action=solicitudes&estado=pendiente'),
      ]);
      if (resS.data.ok) setSolicitudes(resS.data.solicitudes ?? []);
    } catch (e) {
      console.error('Error fetching data', e);
    }
    setLoading(false);
  };

  useEffect(() => { void fetchData(); }, []);

  // Búsqueda server-side con debounce — resetea a la página 1 en cada cambio
  useEffect(() => {
    const t = setTimeout(() => { void fetchUsuarios(1, search); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  const filteredUsers = users;

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  };

  const changeRole = async (id: number, newRole: string) => {
    try {
      const res = await api.post('/admin_dashboard.php?action=actualizar_usuario', { usuario_id: id, rol: newRole });
      if (res.data.ok) {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, rol: newRole } : u));
        showToast('Rol actualizado correctamente');
      } else {
        showToast(res.data.error || 'Error cambiando rol', false);
      }
    } catch (e) {
      showToast('Error cambiando rol', false);
    }
  };

  // Abre el modal de confirmación antes de suspender/activar
  const pedirSuspension = (u: UserRow) => {
    setSuspendRazon('');
    setSuspendModal({ id: u.id, nombre: u.nombre, activo: u.activo });
  };

  const confirmarSuspension = async () => {
    if (!suspendModal) return;
    try {
      const res = await api.post('/admin_dashboard.php?action=banear_usuario', {
        usuario_id: suspendModal.id,
        razon: suspendRazon,
      });
      if (res.data.ok) {
        setUsers(prev => prev.map(u => u.id === suspendModal.id ? { ...u, activo: res.data.activo } : u));
        showToast(res.data.activo ? 'Cuenta reactivada y usuario notificado' : 'Cuenta suspendida y usuario notificado');
        setSuspendModal(null);
        setSuspendRazon('');
      } else {
        showToast(res.data.error || 'Error al cambiar estado', false);
      }
    } catch (e) {
      showToast('Error al cambiar estado', false);
    }
  };

  const resolverSolicitud = async (id: number, decision: 'aprobado' | 'rechazado', notasOverride?: string) => {
    const notasEnviar = notasOverride !== undefined ? notasOverride : notas;
    // Para rechazar desde botón rápido sin notas, abrir modal primero
    if (decision === 'rechazado' && !notasEnviar.trim() && !verSol) {
      const sol = solicitudes.find(s => s.id === id);
      if (sol) { setVerSol(sol); setNotas(''); }
      return;
    }
    try {
      const res = await api.post('/admin_dashboard.php?action=resolver', {
        solicitud_id: id,
        decision,
        notas: notasEnviar,
      });
      if (res.data.ok) {
        setVerSol(null);
        setNotas('');
        showToast(decision === 'aprobado' ? 'Solicitud aprobada — usuario notificado' : 'Solicitud rechazada — usuario notificado');
        void fetchData();
      } else {
        showToast(res.data.error || 'Error al procesar la solicitud', false);
      }
    } catch (e: any) {
      const msg = e.response?.data?.error || 'Error al procesar la solicitud';
      showToast(msg, false);
    }
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>Usuarios y roles</h1>
        <p>Administra accesos, aprueba solicitudes y asigna roles.</p>
      </div>

      <div className="card">
        <div className="ur-tabs">
          <button
            className={`ur-tab ${activeTab === 'usuarios' ? 'active' : ''}`}
            onClick={() => setActiveTab('usuarios')}
          >
            Usuarios ({users.length})
          </button>
          <button
            className={`ur-tab ${activeTab === 'solicitudes' ? 'active' : ''}`}
            onClick={() => setActiveTab('solicitudes')}
          >
            Solicitudes pendientes
            {solicitudes.length > 0 && <span className="ur-tab-badge">{solicitudes.length}</span>}
          </button>
        </div>

        {activeTab === 'usuarios' && (
          <>
           

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="ur-empty">Cargando...</td></tr>
                  ) : filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="ur-user-cell">
                          <div className="ur-avatar">{(u.nombre || '?').charAt(0).toUpperCase()}</div>
                          <div>
                            <div className="ur-name">{u.nombre || 'Sin Nombre'}</div>
                            <div className="ur-contact">{u.email ?? u.telefono ?? u.username ?? '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          className="role-select"
                          value={u.rol}
                          disabled={u.id === currentUserId}
                          title={u.id === currentUserId ? 'No puedes cambiar tu propio rol. Otro administrador debe hacerlo.' : undefined}
                          onChange={e => changeRole(u.id, e.target.value)}
                        >
                          <option value="comprador">Comprador</option>
                          <option value="vendedor">Vendedor</option>
                          <option value="repartidor">Repartidor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        <span className={`ur-status ${u.activo ? 'on' : 'off'}`}>
                          {u.activo ? 'Activo' : 'Suspendido'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-outline"
                            disabled={u.id === currentUserId}
                            title={u.id === currentUserId ? 'No puedes suspender/activar tu propia cuenta. Otro administrador debe hacerlo.' : undefined}
                            onClick={() => pedirSuspension(u)}
                          >
                            {u.activo ? 'Suspender' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredUsers.length === 0 && (
                    <tr><td colSpan={4} className="ur-empty">No se encontraron usuarios.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalUsers > 0 && (
              <div className="ur-pagination">
                <span className="count">
                  {totalUsers} usuario{totalUsers !== 1 ? 's' : ''} · página {page} de {totalPages}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-outline"
                    disabled={page <= 1 || loading}
                    onClick={() => void fetchUsuarios(page - 1, search)}
                  >← Anterior</button>
                  <button
                    className="btn btn-outline"
                    disabled={page >= totalPages || loading}
                    onClick={() => void fetchUsuarios(page + 1, search)}
                  >Siguiente →</button>
                </div>
              </div>
            )}
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
                  <tr><td colSpan={5} className="ur-empty">Cargando...</td></tr>
                ) : solicitudes.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="ur-user-cell">
                        <div className="ur-avatar">{(s.usuario_nombre || '?').charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="ur-name">{s.nombre_completo || s.usuario_nombre || 'Sin nombre'}</div>
                          <div className="ur-contact">{s.email ?? s.telefono ?? '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td><RolChip rol={s.rol_solicitado} /></td>
                    <td className="ur-contact">{s.dui_numero}</td>
                    <td className="ur-contact">{new Date(s.created_at).toLocaleDateString('es-SV')}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-outline" onClick={() => { setVerSol(s); setNotas(''); }}>
                          Ver
                        </button>
                        <button className="btn btn-outline" onClick={() => resolverSolicitud(s.id, 'aprobado')}>
                          Aprobar
                        </button>
                        <button className="btn btn-outline" onClick={() => resolverSolicitud(s.id, 'rechazado')}>
                          Rechazar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && solicitudes.length === 0 && (
                  <tr><td colSpan={5} className="ur-empty">No hay solicitudes pendientes.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div className={`ur-toast ${toast.ok ? 'ok' : 'err'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── MODAL: Suspender / Activar ── */}
      {suspendModal && (
        <div className="ur-modal-overlay" onClick={e => e.target === e.currentTarget && setSuspendModal(null)}>
          <div className="ur-modal ur-modal-confirm">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <AlertTriangle size={20} color={suspendModal.activo ? '#dc2626' : '#22c55e'} />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>
                {suspendModal.activo ? 'Suspender cuenta' : 'Reactivar cuenta'}
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              {suspendModal.nombre} — {suspendModal.activo
                ? 'no podrá iniciar sesión. Recibirá una notificación en su chat.'
                : 'podrá acceder de nuevo. Recibirá una notificación en su chat.'}
            </p>
            {suspendModal.activo && (
              <div style={{ marginBottom: '14px' }}>
                <label className="ur-section-label" style={{ display: 'block', marginBottom: '5px' }}>
                  Motivo (se enviará al usuario)
                </label>
                <textarea
                  className="ur-textarea"
                  value={suspendRazon}
                  onChange={e => setSuspendRazon(e.target.value)}
                  placeholder="Ej: Incumplimiento de términos de uso..."
                  rows={3}
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setSuspendModal(null)}>Cancelar</button>
              <button
                className={`btn ${suspendModal.activo ? 'btn-danger' : 'btn-primary'}`}
                onClick={confirmarSuspension}
              >
                {suspendModal.activo ? 'Suspender' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Detalle solicitud ── */}
      {verSol && (
        <div className="ur-modal-overlay" onClick={e => e.target === e.currentTarget && setVerSol(null)}>
          <div className="ur-modal ur-modal-detail">
            <div className="ur-modal-header">
              <div>
                <h2>{verSol.nombre_completo}</h2>
                <p>Solicita ser {verSol.rol_solicitado}</p>
              </div>
              <button className="ur-modal-close" onClick={() => setVerSol(null)}><X size={16} /></button>
            </div>

            <div className="ur-modal-body">
              <InfoGrid rows={[
                ['DUI', verSol.dui_numero],
                ['Email', verSol.email ?? '—'],
                ['Teléfono', verSol.telefono ?? '—'],
                verSol.credenciales ? ['Credenciales', verSol.credenciales] : null,
              ]} />

              <SectionLabel>Fotos del DUI</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <PhotoViewer src={imgUri(verSol.dui_frente)} label="Frente" />
                <PhotoViewer src={imgUri(verSol.dui_reverso)} label="Reverso" />
              </div>

              {verSol.rol_solicitado === 'vendedor' && (verSol.nombre_negocio || verSol.foto_negocio) && (
                <>
                  <SectionLabel>Información del negocio</SectionLabel>
                  {verSol.nombre_negocio && <KVRow label="Nombre del negocio" value={verSol.nombre_negocio} />}
                  {verSol.foto_negocio && (
                    <PhotoViewer src={imgUri(verSol.foto_negocio)} label="Foto del negocio" wide />
                  )}
                </>
              )}

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

              <div>
                <SectionLabel>Notas (opcional)</SectionLabel>
                <textarea
                  className="ur-textarea"
                  style={{ marginTop: 5 }}
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Motivo del rechazo o comentario para el usuario..."
                  rows={2}
                />
              </div>
            </div>

            <div className="ur-modal-footer">
              <button className="btn btn-outline" onClick={() => setVerSol(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => resolverSolicitud(verSol.id, 'rechazado')}>
                Rechazar
              </button>
              <button className="btn btn-primary" onClick={() => resolverSolicitud(verSol.id, 'aprobado')}>
                Aprobar
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
  return <p className="ur-section-label">{children}</p>;
}

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="ur-kv-row">
      <span className="k">{label}</span>
      <span className="v">{value}</span>
    </div>
  );
}

function InfoGrid({ rows }: { rows: ([string, string] | null)[] }) {
  const valid = rows.filter(Boolean) as [string, string][];
  return (
    <div className="ur-info-grid">
      {valid.map(([label, value]) => (
        <KVRow key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function PhotoViewer({ src, label, wide }: { src?: string; label: string; wide?: boolean }) {
  if (!src) {
    return (
      <div className={`ur-photo-wrap ${wide ? 'wide' : ''}`}>
        <span className="ur-photo-label">{label}</span>
        <div className="ur-photo-empty">Sin imagen</div>
      </div>
    );
  }
  return (
    <div className={`ur-photo-wrap ${wide ? 'wide' : ''}`}>
      <span className="ur-photo-label">{label}</span>
      <a href={src} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
        <img
          src={src}
          alt={label}
          className="ur-photo-img"
          style={{ height: wide ? '150px' : '100px' }}
        />
      </a>
    </div>
  );
}
