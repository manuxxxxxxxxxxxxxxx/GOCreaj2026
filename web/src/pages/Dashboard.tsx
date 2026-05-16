import { DollarSign, Users as UsersIcon, Package, AlertCircle } from 'lucide-react';
import { useGlobal } from '../context/GlobalContext';
import './Dashboard.css';

const STATS = [
  { label: 'Ingresos Totales', value: '$12,450.00', icon: <DollarSign size={24} />, color: 'var(--success)' },
  { label: 'Usuarios Activos', value: '1,245', icon: <UsersIcon size={24} />, color: 'var(--primary)' },
  { label: 'Pedidos Hoy', value: '45', icon: <Package size={24} />, color: '#8b5cf6' },
  { label: 'Pendientes Verificación', value: '12', icon: <AlertCircle size={24} />, color: 'var(--danger)' },
];

export default function Dashboard() {
  const { toggleTheme, cartCount } = useGlobal();
  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Resumen de la Plataforma</h1>
        <p>Bienvenido de vuelta, aquí está el estado actual de LocalMarket.</p>
      </div>

      <div className="stats-grid">
        {STATS.map((stat, i) => (
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
          <h2>Actividad Reciente</h2>
          <div className="activity-list">
            {[1, 2, 3, 4].map(i => (
              <div className="activity-item" key={i}>
                <div className="activity-dot"></div>
                <div className="activity-text">
                  <p className="desc">Nuevo pedido <strong>#LM-842{i}</strong> fue creado.</p>
                  <p className="time">Hace {i * 15} minutos</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card quick-actions">
          <h2>Acciones Rápidas</h2>
          <div className="actions-grid">
            <button className="btn btn-outline">Aprobar Repartidores</button>
            <button className="btn btn-outline">Revisar Productos</button>
            <button className="btn btn-outline">Generar Reporte</button>
          </div>
        </div>
      </div>
    </div>
  );
}
