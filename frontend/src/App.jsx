import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CallCenter from './pages/CallCenter';
import Audit from './pages/Audit';
import Logistic from './pages/Logistic';
import Delivery from './pages/Delivery';
import RRHH from './pages/RRHH';
import Inventory from './pages/Inventory';
import StockReport from './pages/StockReport';
import TransitReport from './pages/TransitReport';
import ActivosFijos from './pages/ActivosFijos';
import Sucursales from './pages/Sucursales';
import Usuarios from './pages/Usuarios';
import RepartidorPortal from './pages/RepartidorPortal';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <main className="main-content">
            <Routes>
              <Route path="/login" element={<Login />} />
              
              {/* DASHBOARD: Accesible para todos los roles válidos */}
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR', 'GERENTE', 'CAJERO', 'VENDEDOR']}><Dashboard /></ProtectedRoute>} />
              
              {/* PORTAL EXCLUSIVO REPARTIDORES */}
              <Route path="/repartidor" element={<ProtectedRoute allowedRoles={['REPARTIDOR', 'ADMINISTRADOR']}><RepartidorPortal /></ProtectedRoute>} />
              
              {/* OPERATIVO BÁSICO: Vendedor en adelante */}
              <Route path="/stock" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR', 'GERENTE', 'CAJERO', 'VENDEDOR']}><StockReport /></ProtectedRoute>} />
              <Route path="/call-center" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR', 'GERENTE', 'CAJERO', 'VENDEDOR']}><CallCenter /></ProtectedRoute>} />
              
              {/* LOGÍSTICA BÁSICA: Cajero en adelante */}
              <Route path="/logistica" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR', 'GERENTE', 'CAJERO']}><Logistic /></ProtectedRoute>} />
              <Route path="/delivery" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR', 'GERENTE', 'CAJERO']}><Delivery /></ProtectedRoute>} />
              
              {/* OPERATIVO GERENCIAL: Gerente y Administrador */}
              <Route path="/transito" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR', 'GERENTE']}><TransitReport /></ProtectedRoute>} />
              <Route path="/activos-fijos" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR', 'GERENTE']}><ActivosFijos /></ProtectedRoute>} />
              <Route path="/auditoria" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR', 'GERENTE']}><Audit /></ProtectedRoute>} />
              
              {/* EXCLUSIVO ADMINISTRADORES */}
              <Route path="/registros-medicamento" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR']}><Inventory /></ProtectedRoute>} />
              <Route path="/rrhh" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR']}><RRHH /></ProtectedRoute>} />
              <Route path="/sucursales" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR']}><Sucursales/></ProtectedRoute>} />
              <Route path="/usuarios" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR']}><Usuarios/></ProtectedRoute>} />
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;