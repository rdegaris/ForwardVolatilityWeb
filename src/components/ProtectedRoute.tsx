import { Navigate } from 'react-router-dom';
import { useRegistration } from '../lib/registrationContext';

/**
 * Wraps a route element — if the user hasn't registered,
 * they are redirected to the /register page.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isRegistered } = useRegistration();

  if (!isRegistered) {
    return <Navigate to="/register" replace />;
  }

  return <>{children}</>;
}
