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
import BusinessPartner from './pages/BusinessPartner';
import ActivosFijos from './pages/ActivosFijos';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <main className="main-content">
            <Routes>
              <Route path="/login" element={<Login />} />
              
              {/* Rutas protegidas para cualquier usuario con sesión activa */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/call-center" element={<ProtectedRoute><CallCenter /></ProtectedRoute>} />
              <Route path="/logistica" element={<ProtectedRoute><Logistic /></ProtectedRoute>} />
              <Route path="/delivery" element={<ProtectedRoute><Delivery /></ProtectedRoute>} />
              <Route path="/registros-medicamento" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/stock" element={<ProtectedRoute><StockReport /></ProtectedRoute>} />
              <Route path="/transito" element={<ProtectedRoute><TransitReport /></ProtectedRoute>} />
              <Route path="/business-partner" element={<ProtectedRoute><BusinessPartner /></ProtectedRoute>} />
              
              {/* Ruta protegida exclusiva para Administradores (Auditoría Financiera) */}
              <Route path="/auditoria" element={<ProtectedRoute requiredRole="ADMINISTRADOR"><Audit /></ProtectedRoute>} />
              <Route path="/rrhh" element={<ProtectedRoute requiredRole="ADMINISTRADOR"><RRHH /></ProtectedRoute>} />
              <Route path="/activos-fijos" element={<ProtectedRoute requiredRole="ADMINISTRADOR"><ActivosFijos /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;