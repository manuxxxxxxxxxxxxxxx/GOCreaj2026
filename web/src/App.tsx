import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalProvider } from './context/GlobalContext';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';

import Home from './pages/Home';
import Login from './pages/Login';
import Market from './pages/Market';
import CarritoYpago from './pages/CarritoYpago';
import Perfil from './pages/Perfil';
import Chat from './pages/Chat';
import Entregas from './pages/Entregas';
import Reels from './pages/Reels';
import Historial from './pages/Historial';
import VendedorDashboard from './pages/VendedorDashboard';
import RepartidorDashboard from './pages/RepartidorDashboard';
import NotFound from './pages/NotFound';

function App() {
  return (
    <GlobalProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/market" element={<Market />} />
        <Route path="/carritoypago" element={<CarritoYpago />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/entregas" element={<Entregas />} />
        <Route path="/reels" element={<Reels />} />
        <Route path="/dashboard-vendedor" element={<VendedorDashboard />} />
        <Route path="/dashboard-repartidor" element={<RepartidorDashboard />} />
        
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    </GlobalProvider>
  );
}

export default App;
