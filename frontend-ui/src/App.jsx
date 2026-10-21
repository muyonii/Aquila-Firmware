import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  const { restoreSession, logout } = useAuthStore();

  useEffect(() => {
    // 1. Rehydrate JWT session from LocalStorage on initial load
    restoreSession();

    // 2. Multi-Tab Sync: If user logs out in another browser tab, log out here
    const handleStorageChange = (e) => {
      if (e.key === 'aquila_token' && !e.newValue) {
        logout();
      }
    };

    // 3. Prevent Back-Forward Cache (bfcache) from showing private screens after logout
    const handlePageShow = (e) => {
      if (e.persisted) {
        const token = localStorage.getItem('aquila_token');
        if (!token) {
          logout();
        } else {
          restoreSession();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [restoreSession, logout]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AppRoutes />
  </BrowserRouter>
  );
}