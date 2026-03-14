import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/AuthProvider';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeDirectory from './pages/EmployeeDirectory';
import CreateEmployee from './pages/CreateEmployee';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) return <div>Cargando...</div>;
    if (!user) return <Navigate to="/login" />;

    return <Layout>{children}</Layout>;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route path="/" element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    } />

                    <Route path="/employees" element={
                        <ProtectedRoute>
                            <EmployeeDirectory />
                        </ProtectedRoute>
                    } />

                    <Route path="/employees/new" element={
                        <ProtectedRoute>
                            <CreateEmployee />
                        </ProtectedRoute>
                    } />

                    {/* Placeholder routes for Milestone 2 scaffolding */}
                    <Route path="/documents" element={
                        <ProtectedRoute>
                            <div className="card">Módulo de Documentos (Hito 2)</div>
                        </ProtectedRoute>
                    } />

                    <Route path="/admin" element={
                        <ProtectedRoute>
                            <div className="card">Módulo de Administración (Hito 2)</div>
                        </ProtectedRoute>
                    } />

                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
