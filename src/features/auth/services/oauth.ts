import { closeOAuthBrowser, openOAuthUrl, platformStorage } from '@/platform';
import { env, hasOAuthConfig } from '@/shared/config/env';
import { useAuthStore } from '@/shared/stores/useAuthStore';

const OAUTH_STATE_KEY = 'aiznima:oauth_state';
const OAUTH_RETURN_TO_KEY = 'aiznima:oauth_return_to';

export function generateOAuthState(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export function buildOAuthUrl(state: string, clientId = env.anilistClientId): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'token',
    state,
  });
  return `${env.anilistOAuthUrl}?${params.toString()}`;
}

export type ParsedOAuthResult =
  | {
      ok: true;
      accessToken: string;
      expiresIn: number;
      state: string | null;
    }
  | {
      ok: false;
      reason: 'cancelled' | 'missing_token' | 'error';
      message: string;
    };

export function parseOAuthFragment(rawUrlOrHash: string): ParsedOAuthResult {
  const hashIndex = rawUrlOrHash.indexOf('#');
  const queryIndex = rawUrlOrHash.indexOf('?');

  const fragment =
    hashIndex >= 0
      ? rawUrlOrHash.slice(hashIndex + 1)
      : rawUrlOrHash.startsWith('access_token=')
        ? rawUrlOrHash
        : '';

  const query =
    queryIndex >= 0
      ? rawUrlOrHash.slice(
          queryIndex + 1,
          hashIndex > queryIndex ? hashIndex : undefined,
        )
      : '';

  const fragmentParams = new URLSearchParams(fragment);
  const queryParams = new URLSearchParams(query);

  const errorCode =
    fragmentParams.get('error') ?? queryParams.get('error');
  const errorDescription =
    fragmentParams.get('error_description') ?? queryParams.get('error_description');

  if (errorCode) {
    const isCancelled = errorCode === 'access_denied';
    return {
      ok: false,
      reason: isCancelled ? 'cancelled' : 'error',
      message: isCancelled
        ? 'Login cancelled.'
        : errorDescription || 'Login failed. Please try again.',
    };
  }

  const accessToken = fragmentParams.get('access_token');
  if (!accessToken) {
    return {
      ok: false,
      reason: 'missing_token',
      message: 'Login could not be verified. No access token received.',
    };
  }

  const rawExpires = Number.parseInt(fragmentParams.get('expires_in') ?? '31536000', 10);
  const expiresIn = !Number.isNaN(rawExpires) && rawExpires > 0 ? rawExpires : 31_536_000;

  return {
    ok: true,
    accessToken,
    expiresIn,
    state: fragmentParams.get('state'),
  };
}

export function sanitizeReturnPath(path: string | null | undefined): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/auth/callback')) {
    return '/';
  }
  return path;
}

export async function startAniListLogin(returnTo?: string): Promise<void> {
  if (!hasOAuthConfig()) {
    throw new Error(
      'AniList Client ID is not configured. Set VITE_ANILIST_CLIENT_ID in your environment.',
    );
  }

  const state = generateOAuthState();
  const safeReturnTo = sanitizeReturnPath(
    returnTo ?? (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/'),
  );

  await Promise.all([
    platformStorage.setItem(OAUTH_STATE_KEY, state),
    platformStorage.setItem(OAUTH_RETURN_TO_KEY, safeReturnTo),
  ]);

  const url = buildOAuthUrl(state);
  await openOAuthUrl(url);
}

export type CompleteOAuthResult =
  | {
      ok: true;
      returnTo: string;
    }
  | {
      ok: false;
      returnTo: string;
      reason: 'cancelled' | 'state_mismatch' | 'missing_token' | 'error';
      message: string;
    };

export async function completeOAuthLogin(rawUrlOrHash: string): Promise<CompleteOAuthResult> {
  const [expectedState, storedReturnTo] = await Promise.all([
    platformStorage.getItem(OAUTH_STATE_KEY),
    platformStorage.getItem(OAUTH_RETURN_TO_KEY),
  ]);

  await Promise.all([
    platformStorage.removeItem(OAUTH_STATE_KEY),
    platformStorage.removeItem(OAUTH_RETURN_TO_KEY),
  ]);

  await closeOAuthBrowser();

  const returnTo = sanitizeReturnPath(storedReturnTo);
  const parsed = parseOAuthFragment(rawUrlOrHash);

  if (!parsed.ok) {
    return {
      ok: false,
      returnTo,
      reason: parsed.reason,
      message: parsed.message,
    };
  }

  if (!expectedState || (parsed.state !== null && parsed.state !== expectedState)) {
    return {
      ok: false,
      returnTo,
      reason: 'state_mismatch',
      message: 'Login cancelled or could not be verified.',
    };
  }

  await useAuthStore.getState().setSession(parsed.accessToken, parsed.expiresIn);

  return {
    ok: true,
    returnTo,
  };
}
