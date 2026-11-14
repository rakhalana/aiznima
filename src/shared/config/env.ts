export type AppPlatformTarget = 'web' | 'apk';

const DEFAULT_API_URL = 'https://graphql.anilist.co';
const DEFAULT_OAUTH_URL = 'https://anilist.co/api/v2/oauth/authorize';

function readEnv(key: string, fallback = ''): string {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

export const env = {
  anilistApiUrl: readEnv('VITE_ANILIST_API_URL', DEFAULT_API_URL),
  anilistOAuthUrl: readEnv('VITE_ANILIST_OAUTH_URL', DEFAULT_OAUTH_URL),
  anilistClientId: readEnv('VITE_ANILIST_CLIENT_ID', ''),
  oauthRedirectUri: readEnv(
    'VITE_OAUTH_REDIRECT_URI',
    typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '',
  ),
  platform: (readEnv('VITE_APP_PLATFORM', 'web') === 'apk' ? 'apk' : 'web') as AppPlatformTarget,
} as const;

export function hasOAuthConfig(): boolean {
  return env.anilistClientId.length > 0;
}
