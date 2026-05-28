import { authService } from '../services/authService';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
    children: React.ReactNode;
    roles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles = [] }) => {
    const user = authService.getUser();

    if (!authService.isAuthenticated() || !user) {
        return <Navigate to="/" />;
    }

    if (roles.length > 0 && !roles.includes(user.rol.nombre)) {
        return <Navigate to="/dashboard" />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
