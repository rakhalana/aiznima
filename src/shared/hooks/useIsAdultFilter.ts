import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

/**
 * AniList GraphQL Page.media(isAdult):
 * - Passing `false` filters out adult entries.
 * - Passing `undefined` allows both adult and non-adult entries.
 */
export function useIsAdultFilter(): {
  allowAdult: boolean;
  isAdultQueryArg: false | undefined;
} {
  const viewer = useAuthStore((state) => state.viewer);
  const accessToken = useAuthStore((state) => state.accessToken);
  const guestShowAdult = usePrefsStore((state) => state.guestShowAdult);

  const allowAdult =
    accessToken && viewer?.options
      ? Boolean(viewer.options.displayAdultContent)
      : guestShowAdult;

  return {
    allowAdult,
    isAdultQueryArg: allowAdult ? undefined : false,
  };
}
