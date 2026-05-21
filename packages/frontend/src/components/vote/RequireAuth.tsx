// RequireAuth.tsx
// Route guard for the /vote/* subtree. Redirects to /vote/login if no
// session — preserves the intended target via the `from` location state so
// the login page can hand the user back where they were going.

import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../features/vote/AuthContext';

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/vote/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
};
