import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ApiError,
  login,
  register,
  refreshAccessToken,
  logout,
  initGame,
  spin,
  fetchHistory,
  fetchRoundDetail,
  generateThumbnail,
} from './api';

// ---------------------------------------------------------------------------
// Global fetch mock
// ---------------------------------------------------------------------------

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

describe('ApiError', () => {
  it('carries status and message', () => {
    const err = new ApiError('Unauthorized', 401);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(401);
    expect(err.message).toBe('Unauthorized');
  });
});

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------

describe('login', () => {
  it('posts credentials and returns token', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ access_token: 'tok-123', token_type: 'Bearer', expires_in: 900 })
    );

    const result = await login('user@test.com', 'password1');
    expect(result.access_token).toBe('tok-123');
    expect(result.token_type).toBe('Bearer');

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/auth/login');
    expect(opts.method).toBe('POST');
    expect(opts.credentials).toBe('include');
    expect(JSON.parse(opts.body as string)).toEqual({
      email: 'user@test.com',
      password: 'password1',
    });
  });

  it('throws ApiError with server error message on failure', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Invalid credentials' }, 401));

    try {
      await login('x@x.com', 'wrong');
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(401);
      expect((e as ApiError).message).toBe('Invalid credentials');
    }
  });

  it('falls back to statusText when error body is unparseable', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('not json')),
    } as Response);

    await expect(login('x@x.com', 'pwd12345')).rejects.toThrow('Internal Server Error');
  });
});

describe('register', () => {
  it('posts to register endpoint', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ access_token: 'new-tok', token_type: 'Bearer', expires_in: 900 })
    );
    const result = await register('new@test.com', 'securepass');
    expect(result.access_token).toBe('new-tok');

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('/auth/register');
  });
});

describe('refreshAccessToken', () => {
  it('calls refresh with no body', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ access_token: 'refreshed', token_type: 'Bearer', expires_in: 900 })
    );
    const result = await refreshAccessToken();
    expect(result.access_token).toBe('refreshed');

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/auth/refresh');
    expect(opts.body).toBeUndefined();
    expect(opts.credentials).toBe('include');
  });

  it('throws ApiError on 401', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'No session' }, 401));
    await expect(refreshAccessToken()).rejects.toThrow(ApiError);
  });
});

describe('logout', () => {
  it('posts to logout and does not throw', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null, 204));
    await expect(logout()).resolves.toBeUndefined();

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/auth/logout');
    expect(opts.method).toBe('POST');
    expect(opts.credentials).toBe('include');
  });
});

// ---------------------------------------------------------------------------
// Game endpoints
// ---------------------------------------------------------------------------

describe('initGame', () => {
  it('sends auth header and game_id', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        session_id: 's1',
        game_id: 'g1',
        config: {},
        balance: { amount: 100, currency: 'USD' },
        idle_matrix: [],
        expires_at: '2026-01-01T00:00:00Z',
      })
    );

    const result = await initGame('tok-abc', 'g1');
    expect(result.session_id).toBe('s1');

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer tok-abc');
  });

  it('throws ApiError on 401', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    } as Response);

    try {
      await initGame('bad-tok', 'g1');
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(401);
    }
  });
});

describe('spin', () => {
  it('sends idempotency key when provided', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        spin_id: 'sp1',
        session_id: 's1',
        game_id: 'g1',
        balance: { amount: 99, currency: 'USD' },
        bet: { amount: 1, currency: 'USD', lines: 20 },
        outcome: {
          reel_matrix: [],
          win: { amount: 0, currency: 'USD', breakdown: [] },
          bonus_triggered: null,
        },
        next_state: 'idle',
        timestamp: Date.now(),
      })
    );

    await spin('tok', 's1', 'g1', { amount: 1, currency: 'USD', lines: 20 }, 'idem-key-1');

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['Idempotency-Key']).toBe('idem-key-1');
  });

  it('omits idempotency key when not provided', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        spin_id: 'sp1',
        session_id: 's1',
        game_id: 'g1',
        balance: { amount: 99, currency: 'USD' },
        bet: { amount: 1, currency: 'USD', lines: 20 },
        outcome: {
          reel_matrix: [],
          win: { amount: 0, currency: 'USD', breakdown: [] },
          bonus_triggered: null,
        },
        next_state: 'idle',
        timestamp: Date.now(),
      })
    );

    await spin('tok', 's1', 'g1', { amount: 1, currency: 'USD', lines: 20 });

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['Idempotency-Key']).toBeUndefined();
  });

  it('parses error response with code field when error is absent', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ code: 'INSUFFICIENT_BALANCE' }, 400));

    await expect(
      spin('tok', 's1', 'g1', { amount: 1, currency: 'USD', lines: 20 })
    ).rejects.toThrow('INSUFFICIENT_BALANCE');
  });

  it('prefers error field over code when both present', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: 'Not enough funds', code: 'INSUFFICIENT_BALANCE' }, 400)
    );

    await expect(
      spin('tok', 's1', 'g1', { amount: 1, currency: 'USD', lines: 20 })
    ).rejects.toThrow('Not enough funds');
  });
});

// ---------------------------------------------------------------------------
// History endpoints
// ---------------------------------------------------------------------------

describe('fetchHistory', () => {
  it('sends all filter params as query string', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: [], total: 0, limit: 20, offset: 0, summary: {} })
    );

    await fetchHistory('tok', {
      limit: 10,
      offset: 20,
      date_from: '2025-01-01',
      date_to: '2025-12-31',
      result: 'win',
      min_bet: 5,
      max_bet: 50,
    });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('limit=10');
    expect(url).toContain('offset=20');
    expect(url).toContain('date_from=2025-01-01');
    expect(url).toContain('date_to=2025-12-31');
    expect(url).toContain('result=win');
    expect(url).toContain('min_bet=5');
    expect(url).toContain('max_bet=50');
  });

  it('omits "all" result filter', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: [], total: 0, limit: 20, offset: 0, summary: {} })
    );

    await fetchHistory('tok', { result: 'all' });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).not.toContain('result=');
  });

  it('sends no query string when filters are empty', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: [], total: 0, limit: 20, offset: 0, summary: {} })
    );

    await fetchHistory('tok');
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).not.toContain('?');
  });
});

describe('fetchRoundDetail', () => {
  it('encodes round id in URL path', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ round: {}, provably_fair: null, transactions: [] })
    );

    await fetchRoundDetail('tok', 'id/with/slashes');
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('id%2Fwith%2Fslashes');
  });
});

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

describe('generateThumbnail', () => {
  it('posts request body and returns response', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ jobId: 'j1', status: 'completed', imageUrl: '/img.png', error: null })
    );

    const result = await generateThumbnail('tok', {
      title: 'Game',
      category: 'slots',
      provider: 'SlotsOne',
    });

    expect(result.imageUrl).toBe('/img.png');
    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(opts.body as string)).toEqual({
      title: 'Game',
      category: 'slots',
      provider: 'SlotsOne',
    });
  });
});
