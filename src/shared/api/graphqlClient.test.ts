import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AniListApiError,
  NetworkError,
  RateLimitError,
  UnauthorizedError,
  anilistRequest,
} from './graphqlClient';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useToastStore } from '@/shared/stores/useToastStore';

describe('anilistRequest', () => {
  beforeEach(async () => {
    await useAuthStore.getState().logout();
    useToastStore.setState({ rateLimitUntil: null, isOffline: false });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends guest request without Authorization header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { Page: { media: [] } } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const data = await anilistRequest<{ Page: { media: unknown[] } }>('query { Page { media { id } } }');
    expect(data.Page.media).toEqual([]);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('attaches Bearer token when session is active', async () => {
    await useAuthStore.getState().setSession('secret-token-123', 3600);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { Viewer: { id: 1 } } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await anilistRequest('query { Viewer { id } }');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer secret-token-123');
  });

  it('throws RateLimitError with Retry-After and records cooldown on HTTP 429', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: 'Too Many Requests' }] }), {
        status: 429,
        headers: { 'Retry-After': '45' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(anilistRequest('query { Viewer { id } }')).rejects.toMatchObject({
      name: 'RateLimitError',
      retryAfterSeconds: 45,
    });
    expect(useToastStore.getState().rateLimitUntil).not.toBeNull();
  });

  it('clears session and throws UnauthorizedError on HTTP 401', async () => {
    await useAuthStore.getState().setSession('expired-token', 3600);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: 'Invalid token' }] }), {
        status: 401,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(anilistRequest('query { Viewer { id } }')).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().sessionExpiredFlag).toBe(true);
  });

  it('maps GraphQL errors payload to AniListApiError', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ errors: [{ message: 'Not Found.', status: 404 }] }),
        { status: 404 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(anilistRequest('query { Media { id } }')).rejects.toMatchObject({
      name: 'AniListApiError',
      status: 404,
      message: 'Not Found.',
    });
    expect(RateLimitError).toBeDefined();
    expect(AniListApiError).toBeDefined();
  });

  it('wraps fetch rejections in NetworkError and rethrows AbortError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(anilistRequest('query { Media { id } }')).rejects.toBeInstanceOf(
      NetworkError,
    );

    const abortError = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));
    await expect(anilistRequest('query { Media { id } }')).rejects.toThrow('Aborted');
  });
});
