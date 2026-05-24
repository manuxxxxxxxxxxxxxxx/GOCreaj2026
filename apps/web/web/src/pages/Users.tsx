import { useState } from 'react';
import { Search, Shield } from 'lucide-react';

import './Users.css';

// Mock data, to be replaced by API calls
const INITIAL_USERS = [
  { id: '1', name: 'Ana García', email: 'ana@ejemplo.com', role: 'buyer', status: 'verified' },
  { id: '2', name: 'Panadería Don José', email: 'jose@panaderia.com', role: 'seller', status: 'verified' },
  { id: '3', name: 'Luis Torres', email: 'luis@reparto.com', role: 'driver', status: 'pending' },
  { id: '4', name: 'Admin Master', email: 'admin@localmarket.com', role: 'master_admin', status: 'verified' },
];



export default function Users() {

  const [users, setUsers] = useState(INITIAL_USERS);
  const [search, setSearch] = useState('');
  
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const changeRole = (id: string, newRole: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
    // Here you would call: await axios.put(`/api/admin/users/${id}/role`, { role: newRole })
  };

  const toggleStatus = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'verified' ? 'banned' : 'verified' } : u));
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>Gestión de Usuarios y Roles</h1>
        <p>Administra accesos, aprueba repartidores y asigna roles administrativos.</p>
      </div>

      <div className="card users-container">
        <div className="toolbar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o correo..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary">
            <Shield size={18} /> Agregar Admin
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol Actual</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="user-info-cell">
                      <div className="avatar-sm">{u.name.charAt(0)}</div>
                      <div>
                        <p className="user-name">{u.name}</p>
                        <p className="user-email">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select 
                      className="role-select" 
                      value={u.role} 
                      onChange={(e) => changeRole(u.id, e.target.value)}
                    >
                      <option value="buyer">Comprador</option>
                      <option value="seller">Vendedor</option>
                      <option value="driver">Repartidor</option>
                      <option value="admin">Admin</option>
                      <option value="master_admin">Master Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${u.status === 'verified' ? 'badge-success' : 'badge-danger'}`}>
                      {u.status === 'verified' ? 'Verificado' : 'Pendiente'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className={`btn ${u.status === 'verified' ? 'btn-outline' : 'btn-primary'}`}
                        onClick={() => toggleStatus(u.id)}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      >
                        {u.status === 'verified' ? 'Suspender' : 'Aprobar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-state">No se encontraron usuarios.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
