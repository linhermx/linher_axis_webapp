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
import MicrosipAdmin from './pages/MicrosipAdmin';
import MyProfile360 from './pages/MyProfile360';
import EmployeeProfile360 from './pages/EmployeeProfile360';

const ProtectedRoute = ({ children, requiredPermissions = [] }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!hasAnyPermission(user, requiredPermissions)) {
    return (
      <Layout>
        <StatusView
          title="Acceso restringido"
          description="No cuentas con permisos para ver esta sección."
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
            path="/employees/:id/profile-360"
            element={
              <ProtectedRoute requiredPermissions={['view_profile_employee']}>
                <EmployeeProfile360 />
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
            path="/calendar"
            element={
              <ProtectedRoute requiredPermissions={['view_calendar']}>
                <StatusView
                  title="Calendario organizacional"
                  description="Esta pantalla se habilitará cuando se complete el módulo de eventos, aniversarios y ausencias aprobadas."
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/recruitment"
            element={
              <ProtectedRoute requiredPermissions={['manage_recruitment']}>
                <StatusView
                  title="Módulo de reclutamiento"
                  description="Esta pantalla se habilitará cuando se active el flujo de vacantes, candidatos y etapas del proceso."
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute requiredPermissions={['view_dashboard']}>
                <StatusView
                  title="Módulo de reportes"
                  description="Esta pantalla se habilitará cuando se complete la analítica operativa y los reportes exportables."
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/documents"
            element={
              <ProtectedRoute requiredPermissions={['view_documents', 'manage_documents', 'validate_documents']}>
                <StatusView
                  title="Expediente digital"
                  description="Esta pantalla se habilitará al cerrar el flujo de Mis Documentos (autoservicio del empleado) y validaciones de RRHH."
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredPermissions={['view_audit_logs']}>
                <MicrosipAdmin />
              </ProtectedRoute>
            }
          />

          <Route
            path="/me/profile"
            element={
              <ProtectedRoute requiredPermissions={['view_profile_self', 'view_profile_employee']}>
                <MyProfile360 />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredPermissions={['view_audit_logs']}>
                <Navigate to="/admin" replace />
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
