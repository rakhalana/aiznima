import { useAuthStore } from '@/shared/stores/useAuthStore';
import type { UserTitleLanguage } from '@/shared/api/types';

export function usePreferredTitleLanguage(): UserTitleLanguage {
  return useAuthStore((state) => state.viewer?.options?.titleLanguage ?? 'ROMAJI');
}
