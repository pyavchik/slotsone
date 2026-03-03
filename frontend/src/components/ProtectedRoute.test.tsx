import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useGameStore } from '@/store';

vi.mock('@/api', () => ({
  refreshAccessToken: vi.fn(),
}));

import { refreshAccessToken } from '@/api';
const refreshMock = vi.mocked(refreshAccessToken);

beforeEach(() => {
  useGameStore.setState(useGameStore.getInitialState());
  vi.clearAllMocks();
});

function renderWithRouter(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/slots" element={<div data-testid="protected-content">Slots</div>} />
          <Route path="/history" element={<div data-testid="protected-content">History</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('renders child route when token exists', async () => {
    useGameStore.getState().setToken('valid-token');
    refreshMock.mockRejectedValue(new Error('not needed'));

    renderWithRouter('/slots');

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toHaveTextContent('Slots');
    });
  });

  it('redirects to /login with next param when no token and refresh fails', async () => {
    refreshMock.mockRejectedValueOnce(new Error('no session'));

    renderWithRouter('/slots');

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  it('shows checking state while refresh is pending', () => {
    refreshMock.mockReturnValue(new Promise(() => {}));

    renderWithRouter('/slots');

    expect(screen.getByText('Checking session…')).toBeInTheDocument();
  });

  it('recovers from refresh and shows protected content', async () => {
    refreshMock.mockResolvedValueOnce({
      access_token: 'refreshed',
      token_type: 'Bearer' as const,
      expires_in: 900,
    });

    renderWithRouter('/history');

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toHaveTextContent('History');
    });
    expect(useGameStore.getState().token).toBe('refreshed');
  });
});
