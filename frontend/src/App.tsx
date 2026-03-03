import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CVLanding } from './CVLanding';
import { AuthScreen } from './AuthScreen';
import { ProtectedRoute } from './components/ProtectedRoute';

const LobbyPage = lazy(() => import('./pages/LobbyPage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const GameHistory = lazy(() => import('./GameHistory'));
const RoundDetail = lazy(() => import('./RoundDetail'));

function RouteSpinner() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: '#888',
      }}
    >
      Loading…
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteSpinner />}>
        <Routes>
          <Route path="/" element={<CVLanding />} />
          <Route path="/login" element={<AuthScreen />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/slots" element={<LobbyPage />} />
            <Route path="/slots/:slug" element={<GamePage />} />
            <Route path="/history" element={<GameHistory />} />
            <Route path="/round/:id" element={<RoundDetail />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
