import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { register, login, refreshAccessToken } from './api';
import { useGameStore } from './store';
import './authScreen.css';

type Tab = 'login' | 'register';

export function AuthScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') || '/slots';

  const setToken = useGameStore((s) => s.setToken);
  const [tab, setTab] = useState<Tab>(location.pathname === '/register' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [silentRefreshing, setSilentRefreshing] = useState(true);

  const nextPathRef = useRef(nextPath);

  useEffect(() => {
    refreshAccessToken()
      .then((data) => {
        setToken(data.access_token);
        navigate(nextPathRef.current, { replace: true });
      })
      .catch(() => setSilentRefreshing(false));
  }, [setToken, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fn = tab === 'register' ? register : login;
      const data = await fn(email, password);
      setToken(data.access_token);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const isRegister = tab === 'register';
  const canSubmit = !loading && email && password.length >= 8 && (!isRegister || ageConfirmed);

  function handleTabChange(next: Tab) {
    setTab(next);
    setError(null);
  }

  if (silentRefreshing) {
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

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">
          <h1 className="auth-logo-title">SlotsOne</h1>
          <p className="auth-logo-sub">Demo iGaming Platform</p>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'login'}
            className={`auth-tab${tab === 'login' ? ' active' : ''}`}
            onClick={() => handleTabChange('login')}
          >
            Login
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'register'}
            className={`auth-tab${tab === 'register' ? ' active' : ''}`}
            onClick={() => handleTabChange('register')}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              className="auth-input"
              type="email"
              autoComplete="email"
              placeholder="player@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              className="auth-input"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {isRegister && (
            <div className="auth-checkbox-row">
              <input
                id="auth-age"
                className="auth-checkbox"
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
              />
              <label className="auth-checkbox-label" htmlFor="auth-age">
                I confirm I am 18 years of age or older
              </label>
            </div>
          )}

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={!canSubmit}>
            {loading ? 'Please wait…' : isRegister ? 'Create Account' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
