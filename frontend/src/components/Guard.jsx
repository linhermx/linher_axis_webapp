import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const ProtectedRoute = () => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    return <Outlet />;
};

export const PublicRoute = () => {
    const { user } = useAuth();
    if (user) return <Navigate to="/" replace />;
    return <Outlet />;
};
