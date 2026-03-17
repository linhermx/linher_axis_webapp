import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/AuthProvider';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import { StatusView } from './components/ui';
import { hasAnyPermission } from './lib/permissions';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeDirectory from './pages/EmployeeDirectory';
import CreateEmployee from './pages/CreateEmployee';
import OrganizationStructure from './pages/OrganizationStructure';

const ProtectedRoute = ({ children, requiredPermissions = [] }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!hasAnyPermission(user, requiredPermissions)) {
    return (
      <Layout>
        <StatusView
          title="Acceso restringido"
          description="No cuentas con permisos para ver esta seccion."
        />
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees"
            element={
              <ProtectedRoute requiredPermissions={['view_employees']}>
                <EmployeeDirectory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees/new"
            element={
              <ProtectedRoute requiredPermissions={['create_employee']}>
                <CreateEmployee />
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees/organization"
            element={
              <ProtectedRoute requiredPermissions={['view_employees']}>
                <OrganizationStructure />
              </ProtectedRoute>
            }
          />

          <Route
            path="/documents"
            element={
              <ProtectedRoute requiredPermissions={['view_employees']}>
                <StatusView
                  title="Módulo de documentos"
                  description="Esta pantalla se habilitará cuando se conecte el flujo completo de expediente digital y validaciones HR."
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredPermissions={['view_audit_logs']}>
                <StatusView
                  title="Módulo de administración"
                  description="Esta pantalla se habilitará cuando se complete la bitácora avanzada, la gestión de roles y las herramientas de plataforma."
                />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
