import { useState, useEffect } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useGameStore } from '@/store';
import { refreshAccessToken } from '@/api';

const DEMO_TOKEN = import.meta.env.VITE_DEMO_JWT;

export function ProtectedRoute() {
  const token = useGameStore((s) => s.token);
  const setToken = useGameStore((s) => s.setToken);
  const location = useLocation();
  const [checking, setChecking] = useState(!token && DEMO_TOKEN !== 'e2e.mock.token');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // In E2E mode, set the mock token immediately
    if (DEMO_TOKEN === 'e2e.mock.token' && !token) {
      setToken(DEMO_TOKEN);
      return;
    }

    if (token) {
      setChecking(false);
      return;
    }
    refreshAccessToken()
      .then((data) => {
        setToken(data.access_token);
        setChecking(false);
      })
      .catch(() => {
        setFailed(true);
        setChecking(false);
      });
  }, [token, setToken]);

  if (checking) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-logo">
            <h1 className="auth-logo-title">SlotsOne</h1>
            <p className="auth-logo-sub">Demo iGaming Platform</p>
          </div>
          <p className="auth-silent-checking">Checking session…</p>
        </div>
      </div>
    );
  }

  if (!token && !DEMO_TOKEN) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (failed && !token) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <Outlet />;
}
