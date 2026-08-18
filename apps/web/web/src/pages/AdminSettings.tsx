import { useState } from 'react';
import { Save, Bell, Shield, Globe, Database, Palette, ChevronRight, AlertTriangle } from 'lucide-react';
import './Dashboard.css';

interface SettingSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const SECTIONS: SettingSection[] = [
  { id: 'general',       icon: <Globe size={20} />,    title: 'General',                description: 'Nombre de la plataforma, región y moneda' },
  { id: 'notifications', icon: <Bell size={20} />,     title: 'Notificaciones',          description: 'Alertas de pedidos, reportes y usuarios' },
  { id: 'security',      icon: <Shield size={20} />,   title: 'Seguridad',               description: 'Autenticación, sesiones y permisos' },
  { id: 'appearance',    icon: <Palette size={20} />,  title: 'Apariencia',              description: 'Tema, colores y personalización' },
  { id: 'data',          icon: <Database size={20} />, title: 'Datos y Privacidad',      description: 'Exportar datos y control de información' },
];

export default function AdminSettings() {
  const [activeSection, setActiveSection] = useState('general');
  const [saved, setSaved] = useState(false);

  // General Settings
  const [platformName, setPlatformName] = useState('GOCreaj');
  const [currency, setCurrency] = useState('MXN');
  const [region, setRegion] = useState('Mexico');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Notification Settings
  const [notifyNewOrder, setNotifyNewOrder] = useState(true);
  const [notifyNewUser, setNotifyNewUser] = useState(true);
  const [notifyReport, setNotifyReport] = useState(false);
  const [emailDigest, setEmailDigest] = useState('daily');

  // Security Settings
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('60');
  const [maxLoginAttempts, setMaxLoginAttempts] = useState('5');

  // Appearance
  const [accentColor, setAccentColor] = useState('#1D5FD1');
  const [defaultTheme, setDefaultTheme] = useState('light');

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: value ? '#123F94' : '#e2e8f0', position: 'relative', transition: 'background 0.3s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: value ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', display: 'block',
      }} />
    </button>
  );

  const InputRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{label}</span>
      {children}
    </div>
  );

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)',
    fontSize: '0.88rem', outline: 'none', background: 'var(--bg)', color: 'var(--text)',
    fontFamily: 'inherit', minWidth: 180, textAlign: 'right',
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <>
            <InputRow label="Nombre de la Plataforma">
              <input value={platformName} onChange={e => setPlatformName(e.target.value)} style={inputStyle} />
            </InputRow>
            <InputRow label="Moneda Predeterminada">
              <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="MXN">MXN — Peso Mexicano</option>
                <option value="USD">USD — Dólar Americano</option>
                <option value="EUR">EUR — Euro</option>
                <option value="COP">COP — Peso Colombiano</option>
              </select>
            </InputRow>
            <InputRow label="Región / País">
              <input value={region} onChange={e => setRegion(e.target.value)} style={inputStyle} />
            </InputRow>
            <InputRow label="Modo Mantenimiento">
              <Toggle value={maintenanceMode} onChange={setMaintenanceMode} />
            </InputRow>
            {maintenanceMode && (
              <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fef3c7', border: '1.5px solid #fbbf24', fontSize: '0.85rem', color: '#92400e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} strokeWidth={2.2} />Modo mantenimiento activado. Los usuarios no podrán acceder a la plataforma.
              </div>
            )}
          </>
        );
      case 'notifications':
        return (
          <>
            <InputRow label="Notificar nuevos pedidos"><Toggle value={notifyNewOrder} onChange={setNotifyNewOrder} /></InputRow>
            <InputRow label="Notificar nuevos usuarios"><Toggle value={notifyNewUser} onChange={setNotifyNewUser} /></InputRow>
            <InputRow label="Alertas de reportes"><Toggle value={notifyReport} onChange={setNotifyReport} /></InputRow>
            <InputRow label="Frecuencia del resumen por email">
              <select value={emailDigest} onChange={e => setEmailDigest(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="realtime">Tiempo real</option>
                <option value="hourly">Cada hora</option>
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="never">Nunca</option>
              </select>
            </InputRow>
          </>
        );
      case 'security':
        return (
          <>
            <InputRow label="Autenticación de dos factores (2FA)"><Toggle value={twoFactor} onChange={setTwoFactor} /></InputRow>
            <InputRow label="Tiempo de expiración de sesión (min)">
              <input type="number" value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} style={{ ...inputStyle, maxWidth: 100 }} />
            </InputRow>
            <InputRow label="Intentos máximos de inicio de sesión">
              <input type="number" value={maxLoginAttempts} onChange={e => setMaxLoginAttempts(e.target.value)} style={{ ...inputStyle, maxWidth: 100 }} />
            </InputRow>
            <div style={{ marginTop: 8 }}>
              <button style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #ef4444', background: 'transparent', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'inherit' }}>
                Revocar Todas las Sesiones Activas
              </button>
            </div>
          </>
        );
      case 'appearance':
        return (
          <>
            <InputRow label="Tema Predeterminado">
              <select value={defaultTheme} onChange={e => setDefaultTheme(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
                <option value="system">Según el sistema</option>
              </select>
            </InputRow>
            <InputRow label="Color de Acento">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                  style={{ width: 40, height: 36, borderRadius: 8, border: '1.5px solid var(--border)', cursor: 'pointer', padding: 2 }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{accentColor.toUpperCase()}</span>
              </div>
            </InputRow>
            <div style={{ marginTop: 12, padding: 16, borderRadius: 12, background: 'var(--bg)', border: '1.5px solid var(--border)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>Vista previa del color</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ height: 36, flex: 1, borderRadius: 8, background: accentColor, transition: 'background 0.3s' }} />
                <div style={{ height: 36, flex: 1, borderRadius: 8, background: accentColor + '22', border: `2px solid ${accentColor}`, transition: 'all 0.3s' }} />
              </div>
            </div>
          </>
        );
      case 'data':
        return (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Exportar todos los pedidos', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>, desc: 'Descargar CSV con historial completo' },
                { label: 'Exportar usuarios y roles', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, desc: 'Descargar CSV de cuentas registradas' },
                { label: 'Exportar reporte financiero', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, desc: 'Ventas, comisiones y movimientos' },
              ].map(item => (
                <button key={item.label}
                  style={{ padding: '16px 20px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#1D5FD1'; e.currentTarget.style.background = '#e8f0f7'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)'; }}>
                  <span style={{ color: '#1D5FD1' }}>{item.svg}</span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 2 }}>{item.label}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>{item.desc}</p>
                  </div>
                  <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                </button>
              ))}
              <div style={{ marginTop: 8, padding: '16px 20px', borderRadius: 12, border: '1.5px solid #fca5a5', background: '#fef2f2' }}>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#991b1b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Zona Peligrosa
                </p>
                <p style={{ fontSize: '0.82rem', color: '#b91c1c', marginBottom: 12 }}>Estas acciones son irreversibles. Procede con precaución.</p>
                <button style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid #ef4444', background: 'transparent', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit' }}>
                  Eliminar Caché del Sistema
                </button>
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const currentSection = SECTIONS.find(s => s.id === activeSection);

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Configuración</h1>
        <p>Gestiona las preferencias generales y la configuración de la plataforma.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
        {/* Sidebar */}
        <div className="card" style={{ padding: '12px', height: 'fit-content' }}>
          {SECTIONS.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: 'none',
                background: activeSection === section.id ? '#e8f0f7' : 'transparent',
                color: activeSection === section.id ? '#123F94' : 'var(--text-muted)',
                fontWeight: activeSection === section.id ? 700 : 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                textAlign: 'left', fontSize: '0.88rem', fontFamily: 'inherit', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (activeSection !== section.id) e.currentTarget.style.background = 'var(--bg)'; }}
              onMouseLeave={e => { if (activeSection !== section.id) e.currentTarget.style.background = 'transparent'; }}
            >
              {section.icon}
              {section.title}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{currentSection?.title}</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{currentSection?.description}</p>
              </div>
              <button
                onClick={handleSave}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: saved ? '#10b981' : '#123F94', color: '#fff',
                  fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: '0.88rem', fontFamily: 'inherit', transition: 'background 0.3s',
                }}
              >
                <Save size={16} />
                {saved ? '¡Guardado!' : 'Guardar Cambios'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {renderSection()}
          </div>
        </div>
      </div>

      {/* Media Query fallback for small screens */}
      <style>{`
        @media (max-width: 768px) {
          .settings-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
