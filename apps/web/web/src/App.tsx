import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalProvider } from './context/GlobalContext';
import AdminLayout from './components/AdminLayout';
import Users from './pages/Users';
import AdminOrders from './pages/AdminOrders';
import AdminProducts from './pages/AdminProducts';
import AdminArbol from './pages/AdminArbol';
import AdminCupones from './pages/AdminCupones';

import Login from './pages/Login';
import Market from './pages/Market';
import CarritoYpago from './pages/CarritoYpago';
import Perfil from './pages/Perfil';
import Chat from './pages/Chat';
import CallEmbed from './pages/CallEmbed';
import Entregas from './pages/Entregas';
import Reels from './pages/Reels';
import Historial from './pages/Historial';
import VendedorDashboard from './pages/VendedorDashboard';
import RepartidorDashboard from './pages/RepartidorDashboard';
import BecomeSeller from './pages/BecomeSeller';
import Explorar from './pages/Explorar';
import NotFound from './pages/NotFound';

function App() {
  return (
    <GlobalProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Market />} />
          <Route path="/login" element={<Login />} />
          <Route path="/market" element={<Navigate to="/" replace />} />
          <Route path="/carritoypago" element={<CarritoYpago />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/call-embed" element={<CallEmbed />} />
          <Route path="/entregas/:pedidoId" element={<Entregas />} />
          <Route path="/entregas" element={<Entregas />} />
          <Route path="/reels" element={<Reels />} />
          <Route path="/dashboard-vendedor" element={<VendedorDashboard />} />
          <Route path="/dashboard-repartidor" element={<RepartidorDashboard />} />
          <Route path="/become-seller" element={<BecomeSeller />} />
          <Route path="/explorar" element={<Explorar />} />

          {/* Admin — sin /dashboard ni /settings (eliminados según directiva). */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/arbol" replace />} />
            <Route path="arbol"    element={<AdminArbol />} />
            <Route path="users"    element={<Users />} />
            <Route path="orders"   element={<AdminOrders />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="cupones"  element={<AdminCupones />} />
            {/* Redirección de las rutas obsoletas — preserva enlaces antiguos */}
            <Route path="dashboard" element={<Navigate to="/admin/arbol" replace />} />
            <Route path="settings"  element={<Navigate to="/admin/arbol" replace />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </GlobalProvider>
  );
}

export default App;
