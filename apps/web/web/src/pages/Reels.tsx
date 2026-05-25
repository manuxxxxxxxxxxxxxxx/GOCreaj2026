import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { api } from '../api';
import '../../css/Reels.css';
import '../../css/dark.css';

interface Reel {
  id: number;
  video: string;
  seller: string;
  desc: string;
  likes: string;
  likesCount: number;
  comments: number;
  loc: string;
  isLiked?: boolean;
}

export default function Reels() {
  const navigate = useNavigate();

  const [reels, setReels] = useState<Reel[]>([]);

  useEffect(() => {
    document.body.style.setProperty('overflow', 'hidden', 'important');
    document.documentElement.style.setProperty('overflow', 'hidden', 'important');

    api.get('/productos.php?action=reels')
      .then(res => {
        if (res.data.ok) {
          const mapped = res.data.reels.map((r: any) => ({
            id: r.id,
            video: r.video_url || '',
            seller: r.tienda_nombre,
            desc: r.descripcion || '',
            likesCount: parseInt(r.likes_count) || 0,
            likes: r.likes_count >= 1000 ? `${(r.likes_count / 1000).toFixed(1)}k` : `${r.likes_count || 0}`,
            comments: parseInt(r.comentarios_count) || 0,
            loc: r.municipio || ''
          }));
          setReels(mapped);
        }
      })
      .catch(console.error);

    return () => {
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow');
    };
  }, []);

  const handleLike = async (id: number) => {
    try {
      await api.post('/interacciones.php?action=like_video', { producto_id: id });
      setReels(prev => prev.map(r => {
        if (r.id === id) {
          const isLiked = !r.isLiked;
          const diff = isLiked ? 1 : -1;
          const newCount = r.likesCount + diff;
          return {
            ...r,
            isLiked,
            likesCount: newCount,
            likes: newCount >= 1000 ? `${(newCount / 1000).toFixed(1)}k` : `${newCount}`
          };
        }
        return r;
      }));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="reels-main-wrapper" style={{ background: '#000', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Header />

      {/* ══ REELS LAYOUT ══ */}
      <div className="reels-page">
        {/* Left Sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <button onClick={() => navigate(-1)} className="back-link" style={{ cursor: 'pointer', border: 'none', background: 'transparent', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '700' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Volver
          </button>
        </aside>

        {/* Reals Viewport */}
        <main className="reels-viewport">
          {reels.map((reel) => (
            <div key={reel.id} className="reel" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              <video src={reel.video} autoPlay loop muted playsInline className="reel-bg" />
              
              <div className="reel-top">
                <div className="seller-info">
                  <div className="seller-avatar" style={{ background: 'var(--blue)', display: 'grid', placeItems: 'center', fontSize: '1.2rem', fontWeight: '800' }}>🏪</div>
                  <div className="seller-meta">
                    <div className="seller-name" style={{ color: '#fff', fontWeight: '700' }}>
                      @{reel.seller} 
                      <span className="verified" style={{ marginLeft: '4px' }}>
                        <svg viewBox="0 0 24 24" fill="var(--blue)" width="14" height="14" style={{ display: 'inline' }}>
                          <path d="M9 12l2 2 4-4"/>
                        </svg>
                      </span>
                    </div>
                    <div className="seller-loc" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>{reel.loc}</div>
                  </div>
                </div>
                <button className="follow-btn" style={{ background: 'var(--blue)', border: 'none', color: '#fff', borderRadius: '20px', padding: '6px 14px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}>Seguir</button>
              </div>

              {/* Actions Overlay */}
              <div className="reel-actions">
                <div className="action-btn" onClick={() => handleLike(reel.id)} style={{ cursor: 'pointer' }}>
                  <svg 
                    viewBox="0 0 24 24" 
                    fill={reel.isLiked ? 'var(--blue)' : 'none'} 
                    stroke={reel.isLiked ? 'var(--blue)' : 'white'} 
                    strokeWidth="2" 
                    width="24" 
                    height="24"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <span className="action-count" style={{ color: '#fff', fontSize: '0.8rem', marginTop: '4px' }}>{reel.likes}</span>
                </div>
                <div className="action-btn" onClick={() => navigate('/chat')} style={{ cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="24" height="24">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span className="action-count" style={{ color: '#fff', fontSize: '0.8rem', marginTop: '4px' }}>{reel.comments}</span>
                </div>
                <div className="action-btn" style={{ cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="24" height="24">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16 6 12 2 8 6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                  <span className="action-count" style={{ color: '#fff', fontSize: '0.8rem', marginTop: '4px' }}>Share</span>
                </div>
              </div>

              <div className="reel-bottom">
                <div className="reel-caption" style={{ color: '#fff', fontSize: '0.9rem', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{reel.desc}</div>
                <button 
                  className="visit-local-btn" 
                  onClick={() => navigate('/market')}
                  style={{ background: '#fff', color: '#111111', fontWeight: '700', borderRadius: '30px', border: 'none', padding: '10px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  Ver tienda
                </button>
              </div>
            </div>
          ))}
        </main>

        {/* Right Sidebar */}
        <aside className="reels-sidebar">
          <div className="activity-tray" style={{ background: '#111111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
            <div className="tray-header" style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '800', marginBottom: '16px' }}>Mi Actividad</div>
            <div className="tray-tabs" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
              <button className="tray-tab active" style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 10px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>Guardados</button>
              <button className="tray-tab" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '8px', padding: '8px 10px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>Siguiendo</button>
            </div>
            <div className="tray-content">
              <div className="tray-empty" style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                <p>Aún no tienes actividad guardada.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
