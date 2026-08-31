import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { CartProvider } from "./context/CartContext";
import { CallProvider } from "./context/CallContext";
import { CallOverlay } from "./components/domain/chat/CallOverlay";
import { PublicLayout } from "./components/layout/PublicLayout";
import { AuthShell } from "./components/layout/AuthShell";
import { RequireAuth, RequireRole } from "./routes/guards";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { Onboarding } from "./pages/auth/Onboarding";
import { Home } from "./pages/Home";
import { Explorar } from "./pages/Explorar";
import { ProductDetail } from "./pages/ProductDetail";
import { StoreDetail } from "./pages/StoreDetail";
import { Cart } from "./pages/Cart";
import { Checkout } from "./pages/Checkout";
import { Orders } from "./pages/Orders";
import { OrderTracking } from "./pages/OrderTracking";
import { Chat } from "./pages/Chat";
import { Reels } from "./pages/Reels";
import { Profile } from "./pages/Profile";
import { Direcciones } from "./pages/Direcciones";
import { Wallet } from "./pages/Wallet";
import { Notifications } from "./pages/Notifications";
import { Convertirse } from "./pages/Convertirse";
import { Soporte } from "./pages/Soporte";
import { ComingSoon } from "./pages/ComingSoon";
import { VendedorLayout } from "./pages/vendedor/VendedorLayout";
import { VendedorResumen } from "./pages/vendedor/VendedorResumen";
import { VendedorPedidos } from "./pages/vendedor/VendedorPedidos";
import { VendedorProductos } from "./pages/vendedor/VendedorProductos";
import { VendedorTienda } from "./pages/vendedor/VendedorTienda";
import { VendedorResenas } from "./pages/vendedor/VendedorResenas";
import { RepartidorLayout } from "./pages/repartidor/RepartidorLayout";
import { RepartidorDisponibles } from "./pages/repartidor/RepartidorDisponibles";
import { RepartidorEntregas } from "./pages/repartidor/RepartidorEntregas";
import { RepartidorPerfil } from "./pages/repartidor/RepartidorPerfil";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminResumen } from "./pages/admin/AdminResumen";
import { AdminUsuarios } from "./pages/admin/AdminUsuarios";
import { AdminPedidos } from "./pages/admin/AdminPedidos";
import { AdminProductos } from "./pages/admin/AdminProductos";
import { AdminCupones } from "./pages/admin/AdminCupones";
import { AdminSoporte } from "./pages/admin/AdminSoporte";
import { AdminSolicitudes } from "./pages/admin/AdminSolicitudes";
import { AdminArbol } from "./pages/admin/AdminArbol";
import { AdminFinanzas } from "./pages/admin/AdminFinanzas";
import { AdminCobertura } from "./pages/admin/AdminCobertura";
import { AdminRepartidores } from "./pages/admin/AdminRepartidores";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

function GoogleAuthScope({ children }: { children: ReactNode }) {
  return GOOGLE_CLIENT_ID ? <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider> : <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <GoogleAuthScope>
          <BrowserRouter>
            <AuthProvider>
              <CartProvider>
              <CallProvider>
                <CallOverlay />
                <Routes>
                  <Route element={<AuthShell />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/recuperar" element={<ForgotPassword />} />
                  </Route>

                  <Route
                    path="/onboarding"
                    element={
                      <RequireAuth>
                        <Onboarding />
                      </RequireAuth>
                    }
                  />

                  <Route element={<PublicLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/explorar" element={<Explorar />} />
                  <Route path="/reels" element={<Reels />} />
                  <Route path="/producto/:id" element={<ProductDetail />} />
                  <Route path="/tienda/:id" element={<StoreDetail />} />

                  <Route
                    path="/carrito"
                    element={
                      <RequireAuth>
                        <Cart />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/checkout"
                    element={
                      <RequireAuth>
                        <Checkout />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/pedidos"
                    element={
                      <RequireAuth>
                        <Orders />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/pedidos/:id"
                    element={
                      <RequireAuth>
                        <OrderTracking />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/chat"
                    element={
                      <RequireAuth>
                        <Chat />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/chat/:id"
                    element={
                      <RequireAuth>
                        <Chat />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/perfil"
                    element={
                      <RequireAuth>
                        <Profile />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/perfil/seguridad"
                    element={
                      <RequireAuth>
                        <ComingSoon label="Sesiones activas" />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/direcciones"
                    element={
                      <RequireAuth>
                        <Direcciones />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/wallet"
                    element={
                      <RequireAuth>
                        <Wallet />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/notificaciones"
                    element={
                      <RequireAuth>
                        <Notifications />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/convertirse"
                    element={
                      <RequireAuth>
                        <Convertirse />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/soporte"
                    element={
                      <RequireAuth>
                        <Soporte />
                      </RequireAuth>
                    }
                  />
                </Route>

                <Route
                  path="/vendedor"
                  element={
                    <RequireRole role="vendedor">
                      <VendedorLayout />
                    </RequireRole>
                  }
                >
                  <Route index element={<VendedorResumen />} />
                  <Route path="pedidos" element={<VendedorPedidos />} />
                  <Route path="productos" element={<VendedorProductos />} />
                  <Route path="tienda" element={<VendedorTienda />} />
                  <Route path="resenas" element={<VendedorResenas />} />
                  <Route path="wallet" element={<Wallet />} />
                </Route>
                <Route
                  path="/repartidor"
                  element={
                    <RequireRole role="repartidor">
                      <RepartidorLayout />
                    </RequireRole>
                  }
                >
                  <Route index element={<RepartidorDisponibles />} />
                  <Route path="entregas" element={<RepartidorEntregas />} />
                  <Route path="perfil" element={<RepartidorPerfil />} />
                  <Route path="wallet" element={<Wallet />} />
                </Route>
                <Route
                  path="/admin"
                  element={
                    <RequireRole role="admin">
                      <AdminLayout />
                    </RequireRole>
                  }
                >
                  <Route index element={<AdminResumen />} />
                  <Route path="usuarios" element={<AdminUsuarios />} />
                  <Route path="pedidos" element={<AdminPedidos />} />
                  <Route path="productos" element={<AdminProductos />} />
                  <Route path="cupones" element={<AdminCupones />} />
                  <Route path="soporte" element={<AdminSoporte />} />
                  <Route path="solicitudes" element={<AdminSolicitudes />} />
                  <Route path="arbol" element={<AdminArbol />} />
                  <Route path="finanzas" element={<AdminFinanzas />} />
                  <Route path="cobertura" element={<AdminCobertura />} />
                  <Route path="repartidores" element={<AdminRepartidores />} />
                </Route>

                <Route path="*" element={<ComingSoon label="Página no encontrada" />} />
              </Routes>
              </CallProvider>
              </CartProvider>
            </AuthProvider>
          </BrowserRouter>
        </GoogleAuthScope>
      </ToastProvider>
    </ThemeProvider>
  );
}
