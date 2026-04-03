import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/authContext';

/**
 * Wraps a route element — if the user is not logged in,
 * they are redirected to the /login page.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
