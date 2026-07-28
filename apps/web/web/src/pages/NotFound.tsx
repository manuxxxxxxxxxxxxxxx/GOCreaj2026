
import { useNavigate } from 'react-router-dom';
import '../../css/index.css';
import '../../css/dark.css';

export default function NotFound() {

  const navigate = useNavigate();

  return (
    <div className="not-found-page" style={{ textAlign: 'center', padding: '100px 20px', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="nav-logo" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', color: 'var(--blue)', cursor: 'pointer', marginBottom: '50px' }} onClick={() => navigate('/')}>
        <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #4f6ef7, #8b3cf7)', borderRadius: '10px', width: '38px', height: '38px', display: 'grid', placeItems: 'center', color: '#fff' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '20px', height: '20px' }}>
            <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
            <path d="M9 22V12h6v10M2 9l10-7 10 7" />
          </svg>
        </div>
        <span style={{ fontSize: '1.5rem' }}>LocalMarket</span>
      </div>

      <div style={{ fontSize: '6rem', fontWeight: '800', color: 'var(--blue)', lineHeight: '1', opacity: '0.2', marginBottom: '10px' }}>404</div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', opacity: 0.3 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.5" width="80" height="80"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
      </div>
      <h1 style={{ fontSize: '2rem', marginBottom: '10px', color: 'var(--text)' }}>Página no encontrada</h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 30px' }}>
        La página que buscas no existe o fue movida. No te preocupes, el mercado sigue abierto.
      </p>

      <div className="actions" style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '50px' }}>
        <button className="btn-solid-white" onClick={() => navigate('/')} style={{ background: 'var(--blue)', border: 'none', color: '#fff', padding: '12px 30px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>
          Ir al inicio
        </button>
        <button className="btn-outline-white" onClick={() => navigate(-1)} style={{ borderColor: 'var(--blue)', color: 'var(--blue)', padding: '12px 30px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', background: 'transparent', border: '2px solid' }}>
          Volver atrás
        </button>
      </div>

      <div className="suggestions">
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>¿O tal vez buscabas?</p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Marketplace', path: '/market', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><path d="M2 9l10-7 10 7"/></svg> },
            { label: 'Entregas', path: '/entregas', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
            { label: 'Reels', path: '/reels', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg> },
            { label: 'Chat', path: '/chat', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
            { label: 'Historial', path: '/historial', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
          ].map((item, idx) => (
            <a
              key={idx}
              onClick={() => navigate(item.path)}
              style={{ cursor: 'pointer', textDecoration: 'none', color: 'var(--text)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: 'var(--white)', borderRadius: '10px', boxShadow: 'var(--card-shadow)' }}
            >
              {item.svg} {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
