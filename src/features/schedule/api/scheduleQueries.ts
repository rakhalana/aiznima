import { useQuery } from '@tanstack/react-query';
import { anilistRequest } from '@/shared/api/graphqlClient';
import { MEDIA_SUMMARY_FIELDS } from '@/shared/api/mediaFragments';
import type { AiringScheduleItem } from '@/shared/api/types';

const AIRING_SCHEDULE_QUERY = `
  query AiringScheduleWindow($start: Int, $end: Int) {
    Page(page: 1, perPage: 50) {
      airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: [TIME]) {
        id
        airingAt
        timeUntilAiring
        episode
        mediaId
        media {
          ${MEDIA_SUMMARY_FIELDS}
        }
      }
    }
  }
`;

interface AiringScheduleRaw {
  Page: {
    airingSchedules: AiringScheduleItem[];
  };
}

export function getDayBoundsSeconds(dayOffset: number): {
  start: number;
  end: number;
  date: Date;
} {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + dayOffset);

  const start = Math.floor(base.getTime() / 1000);
  const end = start + 86_400;
  return { start, end, date: base };
}

export function useScheduleQuery(dayOffset: number, allowAdult: boolean) {
  const { start, end } = getDayBoundsSeconds(dayOffset);

  return useQuery({
    queryKey: ['schedule', start, allowAdult ? 'all' : 'safe'],
    staleTime: 2 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const raw = await anilistRequest<AiringScheduleRaw>(
        AIRING_SCHEDULE_QUERY,
        { start, end },
        { signal },
      );

      return raw.Page.airingSchedules.filter(
        (item) => item.media && (allowAdult || !item.media.isAdult),
      );
    },
  });
}
