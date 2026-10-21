import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

export default function PublicOnlyRoute() {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user) {
    if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
    if (user.role === 'technician') return <Navigate to="/tasks" replace />;
    if (user.role === 'resident') return <Navigate to="/usage" replace />;
  }

  return <Outlet />;
}