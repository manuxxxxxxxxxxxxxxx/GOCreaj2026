import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGlobal } from '../context/GlobalContext';

export default function Footer() {
  const { t } = useTranslation();
  const { theme } = useGlobal();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const bg      = isDark ? '#080D18' : '#F8FAFC';
  const border  = isDark ? '#1E293B' : '#E2E8F0';
  const accent  = isDark ? '#3B82F6' : '#2563EB';
  const text    = isDark ? '#F1F5F9' : '#0F172A';
  const muted   = isDark ? '#64748B' : '#64748B';

  const linkStyle: React.CSSProperties = {
    color: muted, textDecoration: 'none', fontSize: 13.5, fontWeight: 500,
    cursor: 'pointer', display: 'block', marginBottom: 10,
  };

  const colTitle: React.CSSProperties = {
    color: text, fontWeight: 800, fontSize: 13, textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 14,
  };

  return (
    <footer style={{ background: bg, borderTop: `1px solid ${border}`, marginTop: 40 }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '40px 24px 24px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, background: accent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13,
            }}>SV</div>
            <span style={{ fontWeight: 800, fontSize: 15, color: text }}>[SV]Go</span>
          </div>
          <p style={{ color: muted, fontSize: 13, lineHeight: 1.6, maxWidth: 260 }}>
            {t('footer.tagline')}
          </p>
        </div>

        <div>
          <div style={colTitle}>{t('footer.explora')}</div>
          <a style={linkStyle} onClick={() => navigate('/')}>{t('footer.inicio')}</a>
          <a style={linkStyle} onClick={() => navigate('/explorar')}>{t('footer.explorar')}</a>
          <a style={linkStyle} onClick={() => navigate('/reels')}>{t('footer.reels')}</a>
          <a style={linkStyle} onClick={() => navigate('/historial')}>{t('footer.pedidos')}</a>
        </div>

        <div>
          <div style={colTitle}>{t('footer.socios')}</div>
          <a style={linkStyle} onClick={() => navigate('/become-seller')}>{t('footer.convertirseSocio')}</a>
          <a style={linkStyle} onClick={() => navigate('/dashboard-vendedor')}>{t('footer.panelVendedor')}</a>
          <a style={linkStyle} onClick={() => navigate('/dashboard-repartidor')}>{t('footer.panelRepartidor')}</a>
        </div>

        <div>
          <div style={colTitle}>{t('footer.ayuda')}</div>
          <a style={linkStyle} onClick={() => navigate('/chat')}>{t('footer.soporte')}</a>
          <a style={linkStyle} onClick={() => navigate('/perfil')}>{t('footer.miCuenta')}</a>
        </div>
      </div>

      <div style={{
        borderTop: `1px solid ${border}`, padding: '16px 24px', textAlign: 'center',
        color: muted, fontSize: 12,
      }}>
        {t('footer.copyright', { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
