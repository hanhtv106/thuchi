import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = ({ allowedRoles, requiredPermission }) => {
    const { user, isAuthenticated, hasPermission } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Nếu yêu cầu permission, kiểm tra permission trước
    if (requiredPermission && !hasPermission(requiredPermission)) {
        return <Navigate to="/" replace />;
    }

    // Nếu chỉ yêu cầu role (giữ lại để tương thích ngược)
    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};
