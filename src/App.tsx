import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import Productos from './pages/Productos';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';
import Ventas from './pages/Ventas';
import Entregas from './pages/Entregas';
import Movimientos from './pages/Movimientos';
import Perfil from './pages/Perfil';
import Clientes from './pages/Clientes';
import Proveedores from './pages/Proveedores';
import Compras from './pages/Compras';
import Kardex from './pages/Kardex';
import Header from './components/Layout/Header';
import AsistenteChat from './components/AsistenteChat';
import ProtectedRoute from './components/ProtectedRoute';
import Auditoria from './pages/Auditoria';
import DevolucionesGarantias from './pages/DevolucionesGarantias';
import './App.css';

const MainLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <Header />
    <main>{children}</main>
    <AsistenteChat />
  </>
);

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>

          {/* LOGIN */}
          <Route path="/" element={<Login />} />

          {/* DASHBOARD — todos los roles */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <MainLayout><Dashboard /></MainLayout>
            </ProtectedRoute>
          } />

          {/* PERFIL — todos los roles */}
          <Route path="/perfil" element={
            <ProtectedRoute>
              <MainLayout><Perfil /></MainLayout>
            </ProtectedRoute>
          } />

          {/* USUARIOS — solo ADMIN */}
          <Route path="/usuarios" element={
            <ProtectedRoute roles={['ADMIN']}>
              <MainLayout><Usuarios /></MainLayout>
            </ProtectedRoute>
          } />

          {/* CLIENTES — ADMIN y VENDEDOR */}
          <Route path="/clientes" element={
            <ProtectedRoute roles={['ADMIN', 'VENDEDOR']}>
              <MainLayout><Clientes /></MainLayout>
            </ProtectedRoute>
          } />

          {/* PRODUCTOS — ADMIN, INVENTARIO, VENDEDOR, TECNICO */}
          <Route path="/productos" element={
            <ProtectedRoute roles={['ADMIN', 'INVENTARIO', 'VENDEDOR', 'TECNICO']}>
              <MainLayout><Productos /></MainLayout>
            </ProtectedRoute>
          } />

          {/* MOVIMIENTOS — ADMIN e INVENTARIO */}
          <Route path="/movimientos" element={
            <ProtectedRoute roles={['ADMIN', 'INVENTARIO']}>
              <MainLayout><Movimientos /></MainLayout>
            </ProtectedRoute>
          } />

          {/* VENTAS — ADMIN y VENDEDOR */}
          <Route path="/ventas" element={
            <ProtectedRoute roles={['ADMIN', 'VENDEDOR']}>
              <MainLayout><Ventas /></MainLayout>
            </ProtectedRoute>
          } />

          {/* DEVOLUCIONES / GARANTIAS — ADMIN, VENDEDOR y TECNICO */}
          <Route path="/devoluciones-garantias" element={
            <ProtectedRoute roles={['ADMIN', 'VENDEDOR', 'TECNICO']}>
              <MainLayout><DevolucionesGarantias /></MainLayout>
            </ProtectedRoute>
          } />

          {/* ÓRDENES DE SERVICIO — ADMIN y TECNICO */}
          <Route path="/entregas" element={
            <ProtectedRoute roles={['ADMIN', 'TECNICO']}>
              <MainLayout><Entregas /></MainLayout>
            </ProtectedRoute>
          } />

          {/* PROVEEDORES — ADMIN e INVENTARIO */}
          <Route path="/proveedores" element={
            <ProtectedRoute roles={['ADMIN', 'INVENTARIO']}>
              <MainLayout><Proveedores /></MainLayout>
            </ProtectedRoute>
          } />

          {/* COMPRAS — ADMIN e INVENTARIO */}
          <Route path="/compras" element={
            <ProtectedRoute roles={['ADMIN', 'INVENTARIO']}>
              <MainLayout><Compras /></MainLayout>
            </ProtectedRoute>
          } />

          {/* KARDEX — ADMIN e INVENTARIO */}
          <Route path="/kardex" element={
            <ProtectedRoute roles={['ADMIN', 'INVENTARIO']}>
              <MainLayout><Kardex /></MainLayout>
            </ProtectedRoute>
          } />

          {/* REPORTES — solo ADMIN */}
          <Route path="/reportes" element={
            <ProtectedRoute roles={['ADMIN']}>
              <MainLayout><Reportes /></MainLayout>
            </ProtectedRoute>
          } />

          {/* CONFIGURACIÓN — solo ADMIN */}
          <Route path="/configuracion" element={
            <ProtectedRoute roles={['ADMIN']}>
              <MainLayout><Configuracion /></MainLayout>
            </ProtectedRoute>
          } />

          {/* AUDITORÍA — solo ADMIN */}
          <Route path="/auditoria" element={
            <ProtectedRoute roles={['ADMIN']}>
              <MainLayout><Auditoria /></MainLayout>
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />

        </Routes>
      </div>
    </Router>
  );
}

export default App;
