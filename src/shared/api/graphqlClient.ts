import { env } from '@/shared/config/env';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useToastStore } from '@/shared/stores/useToastStore';
import { logger } from '@/shared/utils/logger';

export interface GraphQLErrorItem {
  message: string;
  status?: number;
  locations?: Array<{ line: number; column: number }>;
}

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds = 60, message?: string) {
    super(
      message ??
        `Rate limit reached. Please wait ${retryAfterSeconds}s before trying again.`,
    );
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Your AniList session has expired. Please log in again.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Unable to reach AniList. Check your internet connection.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AniListApiError extends Error {
  readonly status: number;
  readonly errors: GraphQLErrorItem[];

  constructor(message: string, status = 400, errors: GraphQLErrorItem[] = []) {
    super(message);
    this.name = 'AniListApiError';
    this.status = status;
    this.errors = errors;
  }
}

export interface RequestOptions {
  signal?: AbortSignal;
  skipAuth?: boolean;
}

function parseRetryAfter(headerValue: string | null): number {
  if (!headerValue) {
    return 60;
  }
  const parsed = Number.parseInt(headerValue, 10);
  if (!Number.isNaN(parsed) && parsed > 0) {
    return parsed;
  }
  return 60;
}

export async function anilistRequest<
  TData,
  TVariables = Record<string, unknown>,
>(
  query: string,
  variables?: TVariables,
  options?: RequestOptions,
): Promise<TData> {
  const authState = useAuthStore.getState();
  const hasValidToken =
    !options?.skipAuth &&
    Boolean(authState.accessToken) &&
    (!authState.expiresAt || authState.expiresAt > Date.now());

  if (!options?.skipAuth && authState.accessToken && authState.expiresAt && authState.expiresAt <= Date.now()) {
    void authState.handleTokenExpired();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (hasValidToken && authState.accessToken) {
    headers.Authorization = `Bearer ${authState.accessToken}`;
  }

  let response: Response;
  const startedAt = Date.now();

  try {
    response = await fetch(env.anilistApiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      signal: options?.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    logger.warn('Network failure calling AniList API', { err: String(err) });
    throw new NetworkError();
  }

  useToastStore.getState().setIsOffline(false);

  if (response.status === 429) {
    const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
    useToastStore.getState().setRateLimitUntil(Date.now() + retryAfter * 1000);
    logger.warn('AniList rate limit hit', { retryAfter });
    throw new RateLimitError(retryAfter);
  }

  if (response.status === 401) {
    await useAuthStore.getState().handleTokenExpired();
    throw new UnauthorizedError();
  }

  let payload: { data?: TData; errors?: GraphQLErrorItem[] };
  try {
    payload = (await response.json()) as {
      data?: TData;
      errors?: GraphQLErrorItem[];
    };
  } catch {
    throw new AniListApiError(
      `Unexpected response from AniList (HTTP ${response.status}).`,
      response.status,
    );
  }

  if (payload.errors && payload.errors.length > 0) {
    const firstError = payload.errors[0];
    const message = firstError?.message || 'AniList returned an error.';
    const errorStatus = firstError?.status ?? response.status;

    if (
      errorStatus === 401 ||
      /invalid token/i.test(message) ||
      /unauthenticated/i.test(message)
    ) {
      await useAuthStore.getState().handleTokenExpired();
      throw new UnauthorizedError(message);
    }

    logger.warn('AniList GraphQL error', { status: errorStatus, message });
    throw new AniListApiError(message, errorStatus, payload.errors);
  }

  if (!response.ok || payload.data === undefined) {
    throw new AniListApiError(
      `AniList request failed (HTTP ${response.status}).`,
      response.status,
    );
  }

  useToastStore.getState().setRateLimitUntil(null);
  logger.debug('AniList request succeeded', { durationMs: Date.now() - startedAt });
  return payload.data;
}
