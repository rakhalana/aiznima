import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildOAuthUrl,
  completeOAuthLogin,
  parseOAuthFragment,
  sanitizeReturnPath,
} from './oauth';
import { useAuthStore } from '@/shared/stores/useAuthStore';

describe('AniList OAuth Implicit Grant service', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await useAuthStore.getState().logout();
    vi.restoreAllMocks();
  });

  it('builds valid OAuth authorize URL with state parameter', () => {
    const url = buildOAuthUrl('random-state-xyz', '9999');
    expect(url).toContain('https://anilist.co/api/v2/oauth/authorize');
    expect(url).toContain('client_id=9999');
    expect(url).toContain('response_type=token');
    expect(url).toContain('state=random-state-xyz');
  });

  it('parses access_token, expires_in, and state from Web URL and APK deep link', () => {
    const webResult = parseOAuthFragment(
      'https://aiznima.pages.dev/auth/callback#access_token=abc123&token_type=Bearer&expires_in=31536000&state=st1',
    );
    expect(webResult).toEqual({
      ok: true,
      accessToken: 'abc123',
      expiresIn: 31536000,
      state: 'st1',
    });

    const apkResult = parseOAuthFragment(
      'aiznima://auth/callback#access_token=apk999&token_type=Bearer&expires_in=1000&state=st2',
    );
    expect(apkResult).toEqual({
      ok: true,
      accessToken: 'apk999',
      expiresIn: 1000,
      state: 'st2',
    });
  });

  it('detects cancelled login from query error parameter (AF-01)', () => {
    const cancelled = parseOAuthFragment(
      'https://aiznima.pages.dev/auth/callback?error=access_denied',
    );
    expect(cancelled).toEqual({
      ok: false,
      reason: 'cancelled',
      message: 'Login cancelled.',
    });
  });

  it('verifies CSRF state, saves session, and preserves returnTo route', async () => {
    window.localStorage.setItem('aiznima:oauth_state', 'expected-123');
    window.localStorage.setItem('aiznima:oauth_return_to', '/media/21');

    const result = await completeOAuthLogin(
      'aiznima://auth/callback#access_token=tok-ok&expires_in=3600&state=expected-123',
    );

    expect(result).toEqual({ ok: true, returnTo: '/media/21' });
    expect(useAuthStore.getState().accessToken).toBe('tok-ok');
    expect(window.localStorage.getItem('aiznima:oauth_state')).toBeNull();
  });

  it('rejects state mismatch or missing expected state (AF-01)', async () => {
    window.localStorage.setItem('aiznima:oauth_state', 'expected-123');
    window.localStorage.setItem('aiznima:oauth_return_to', '/search?q=frieren');

    const mismatch = await completeOAuthLogin(
      'https://aiznima.pages.dev/auth/callback#access_token=evil&state=wrong',
    );

    expect(mismatch).toMatchObject({
      ok: false,
      reason: 'state_mismatch',
      returnTo: '/search?q=frieren',
    });
    expect(useAuthStore.getState().accessToken).toBeNull();

    const unsolicited = await completeOAuthLogin(
      'https://aiznima.pages.dev/auth/callback#access_token=evil',
    );
    expect(unsolicited.ok).toBe(false);
  });

  it('sanitizes unsafe returnTo paths and throws friendly error if Client ID is missing', async () => {
    expect(sanitizeReturnPath('https://evil.com')).toBe('/');
    expect(sanitizeReturnPath('//evil.com')).toBe('/');
    expect(sanitizeReturnPath('/auth/callback')).toBe('/');
    expect(sanitizeReturnPath('/media/5')).toBe('/media/5');

    vi.stubEnv('VITE_ANILIST_CLIENT_ID', '');
    vi.resetModules();
    try {
      const { startAniListLogin: startWithoutClientId } = await import('./oauth');
      await expect(startWithoutClientId('/media/5')).rejects.toThrow(/Client ID/i);
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
