// RequireAdmin.tsx
// Stricter guard for /vote/admin/*. Sends regular voters back to the member
// home if they reach an admin URL without privilege.

import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../features/vote/AuthContext';

export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/vote/login" replace />;
  if (!isAdmin) return <Navigate to="/vote" replace />;
  return <>{children}</>;
};
