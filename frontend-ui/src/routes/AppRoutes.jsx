import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout Shells
import PublicLayout from '../layouts/PublicLayout';
import AdminLayout from '../layouts/AdminLayout';
import TechLayout from '../layouts/TechLayout';
import ResidentLayout from '../layouts/ResidentLayout';

// Route Guards
import ProtectedRoute from './ProtectedRoute';
import PublicOnlyRoute from './PublicOnlyRoute';

// Public & Auth Pages
import HomePage from '../pages/public/HomePage';
import LoginPage from '../pages/public/LoginPage';
import RegisterPage from '../pages/public/RegisterPage';
import VerifyOtpPage from '../pages/public/VerifyOtpPage';
import ForgotPasswordPage from '../pages/public/ForgotPasswordPage';
import ResetPasswordPage from '../pages/public/ResetPasswordPage';

// Admin Pages
import DashboardPage from '../pages/admin/dashboard/DashboardPage';
import IncidentsPage from '../pages/admin/incidents/IncidentsPage';
import NetworkMapPage from '../pages/admin/network-map/NetworkMapPage';
import ReportsPage from '../pages/admin/reports/ReportsPage';
import UsersPage from '../pages/admin/users/UsersPage';
import SystemInspectorPage from '../pages/admin/SystemInspectorPage';
import AdminSettingsPage from '../pages/admin/settings/AdminSettingsPage';

// Technician Pages
import MyTasksPage from '../pages/technician/MyTasksPage';
import TaskDetailPage from '../pages/technician/TaskDetailPage';
import MapPage from '../pages/technician/MapPage';
import ProfilePage from '../pages/technician/ProfilePage';

// Resident Pages
import WaterUsagePage from '../pages/resident/WaterUsagePage';
import ReportIssuePage from '../pages/resident/ReportIssuePage';
import HistoryPage from '../pages/resident/HistoryPage';
import SettingsPage from '../pages/resident/SettingsPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* 1. Landing Page (Always accessible first at "/" for all visitors) */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
      </Route>

      {/* 2. Authentication Pages (Redirects to portal if already signed in) */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* 3. Admin Portal (Protected: Role 'admin') */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/settings" element={<AdminSettingsPage />} />
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/network-map" element={<NetworkMapPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/inspector" element={<SystemInspectorPage />} />
        </Route>
      </Route>

      {/* 4. Technician Field Portal (Protected: Role 'technician') */}
      <Route element={<ProtectedRoute allowedRoles={['technician']} />}>
        <Route element={<TechLayout />}>
          <Route path="/tasks" element={<MyTasksPage />} />
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* 5. Resident Consumer Portal (Protected: Role 'resident') */}
      <Route element={<ProtectedRoute allowedRoles={['resident']} />}>
        <Route element={<ResidentLayout />}>
          <Route path="/usage" element={<WaterUsagePage />} />
          <Route path="/my-reports" element={<ReportIssuePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/account" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Fallback Catch-All -> Landing Page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}