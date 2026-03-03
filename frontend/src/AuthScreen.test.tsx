import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthScreen } from './AuthScreen';
import { useGameStore } from './store';

// ---------------------------------------------------------------------------
// Mock the api module — we test the API layer separately
// ---------------------------------------------------------------------------

vi.mock('./api', () => ({
  login: vi.fn(),
  register: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

// Suppress CSS import
vi.mock('./authScreen.css', () => ({}));

import { login, register, refreshAccessToken } from './api';

const loginMock = vi.mocked(login);
const registerMock = vi.mocked(register);
const refreshMock = vi.mocked(refreshAccessToken);

function renderAuth(initialRoute = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthScreen />
    </MemoryRouter>
  );
}

beforeEach(() => {
  useGameStore.setState(useGameStore.getInitialState());
  vi.clearAllMocks();
  // By default, refresh fails (no existing session)
  refreshMock.mockRejectedValue(new Error('no session'));
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('AuthScreen rendering', () => {
  it('shows "Checking session" while silent refresh is pending', () => {
    // Keep refresh pending indefinitely
    refreshMock.mockReturnValue(new Promise(() => {}));
    renderAuth();
    expect(screen.getByText('Checking session…')).toBeInTheDocument();
  });

  it('shows login form after silent refresh fails', async () => {
    renderAuth();
    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('does not show age confirmation on login tab', async () => {
    renderAuth();
    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });
    expect(screen.queryByText(/18 years/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------

describe('tab switching', () => {
  it('shows age confirmation on register tab', async () => {
    const user = userEvent.setup();
    renderAuth();

    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: 'Register' }));
    expect(screen.getByText(/18 years/)).toBeInTheDocument();
  });

  it('clears error on tab switch', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValueOnce(new Error('bad'));
    renderAuth();

    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    // Type valid credentials and submit to get an error
    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('bad');
    });

    // Switch tab — error should clear
    await user.click(screen.getByRole('tab', { name: 'Register' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Form validation (submit button disabled state)
// ---------------------------------------------------------------------------

describe('form validation', () => {
  it('disables submit when email is empty', async () => {
    const user = userEvent.setup();
    renderAuth();
    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Password'), 'password1');
    expect(screen.getByRole('button', { name: 'Login' })).toBeDisabled();
  });

  it('disables submit when password is too short', async () => {
    const user = userEvent.setup();
    renderAuth();
    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    expect(screen.getByRole('button', { name: 'Login' })).toBeDisabled();
  });

  it('enables submit with valid email and 8+ char password', async () => {
    const user = userEvent.setup();
    renderAuth();
    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    expect(screen.getByRole('button', { name: 'Login' })).toBeEnabled();
  });

  it('requires age confirmation on register tab', async () => {
    const user = userEvent.setup();
    renderAuth();
    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: 'Register' }));
    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 'password1');

    // Without age confirmation — disabled
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeDisabled();

    // With age confirmation — enabled
    await user.click(screen.getByLabelText(/18 years/));
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// Login flow
// ---------------------------------------------------------------------------

describe('login flow', () => {
  it('calls login API and stores token on success', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValueOnce({
      access_token: 'jwt-new',
      token_type: 'Bearer',
      expires_in: 900,
    });

    renderAuth();
    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Email'), 'player@test.com');
    await user.type(screen.getByLabelText('Password'), 'mypassword');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('player@test.com', 'mypassword');
    });
    expect(useGameStore.getState().token).toBe('jwt-new');
  });

  it('shows error message on login failure', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValueOnce(new Error('Invalid credentials'));

    renderAuth();
    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
    });
  });

  it('shows loading state during submit', async () => {
    const user = userEvent.setup();
    // Never resolve — stays loading
    loginMock.mockReturnValueOnce(new Promise(() => {}));

    renderAuth();
    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(screen.getByRole('button', { name: 'Please wait…' })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Register flow
// ---------------------------------------------------------------------------

describe('register flow', () => {
  it('calls register API on register tab', async () => {
    const user = userEvent.setup();
    registerMock.mockResolvedValueOnce({
      access_token: 'new-user-tok',
      token_type: 'Bearer',
      expires_in: 900,
    });

    renderAuth();
    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: 'Register' }));
    await user.type(screen.getByLabelText('Email'), 'new@test.com');
    await user.type(screen.getByLabelText('Password'), 'securepass');
    await user.click(screen.getByLabelText(/18 years/));
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith('new@test.com', 'securepass');
    });
    expect(useGameStore.getState().token).toBe('new-user-tok');
  });
});

// ---------------------------------------------------------------------------
// Silent refresh
// ---------------------------------------------------------------------------

describe('silent refresh', () => {
  it('sets token and skips form when refresh succeeds', async () => {
    refreshMock.mockResolvedValueOnce({
      access_token: 'refreshed-tok',
      token_type: 'Bearer',
      expires_in: 900,
    });

    renderAuth();

    await waitFor(() => {
      expect(useGameStore.getState().token).toBe('refreshed-tok');
    });
  });
});
