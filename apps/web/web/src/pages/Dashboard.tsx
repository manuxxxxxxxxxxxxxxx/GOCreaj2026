import { useState, useEffect } from 'react';
import { Users as UsersIcon, Package, AlertCircle } from 'lucide-react';
import { api } from '../api';

import './Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get('/admin_dashboard.php?action=stats')
      .then(res => {
        if (res.data.ok) setStats(res.data.stats);
      })
      .catch(err => console.error(err));
  }, []);

  const statCards = stats ? [
    { label: 'Usuarios Totales', value: stats.usuarios, icon: <UsersIcon size={24} />, color: 'var(--primary)' },
    { label: 'Vendedores', value: stats.vendedores, icon: <UsersIcon size={24} />, color: 'var(--success)' },
    { label: 'Pedidos Totales', value: stats.pedidos, icon: <Package size={24} />, color: '#8b5cf6' },
    { label: 'Solicitudes Pendientes', value: stats.solicitudes_pendientes, icon: <AlertCircle size={24} />, color: 'var(--danger)' },
  ] : [
    { label: 'Cargando...', value: '-', icon: <UsersIcon size={24} />, color: 'var(--primary)' },
  ];

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Resumen de la Plataforma</h1>
        <p>Bienvenido de vuelta, aquí está el estado actual del sistema integrado.</p>
      </div>

      <div className="stats-grid">
        {statCards.map((stat, i) => (
          <div className="card stat-card" key={i}>
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-content">
        <div className="card recent-activity">
          <h2>Métricas Adicionales</h2>
          <div className="activity-list" style={{ marginTop: '1rem' }}>
            {stats ? (
              <>
                <div className="activity-item">
                  <div className="activity-dot" style={{ background: 'var(--blue)' }}></div>
                  <div className="activity-text">
                    <p className="desc"><strong>{stats.compradores}</strong> compradores registrados.</p>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-dot" style={{ background: 'var(--success)' }}></div>
                  <div className="activity-text">
                    <p className="desc"><strong>{stats.repartidores}</strong> repartidores en el sistema.</p>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-dot" style={{ background: 'var(--danger)' }}></div>
                  <div className="activity-text">
                    <p className="desc"><strong>{stats.soporte_abiertos}</strong> tickets de soporte abiertos.</p>
                  </div>
                </div>
              </>
            ) : <p>Cargando métricas...</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
