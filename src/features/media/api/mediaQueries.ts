import { useQuery } from '@tanstack/react-query';
import { anilistRequest } from '@/shared/api/graphqlClient';
import { MEDIA_SUMMARY_FIELDS } from '@/shared/api/mediaFragments';
import type { MediaDetail } from '@/shared/api/types';

const MEDIA_DETAIL_QUERY = `
  query MediaDetail($id: Int!) {
    Media(id: $id) {
      ${MEDIA_SUMMARY_FIELDS}
      weightedScore
      description(asHtml: true)
      duration
      source
      countryOfOrigin
      startDate {
        year
        month
        day
      }
      endDate {
        year
        month
        day
      }
      synonyms
      favourites
      trailer {
        id
        site
        thumbnail
      }
      tags {
        id
        name
        rank
        isMediaSpoiler
      }
      studios(isMain: true) {
        nodes {
          id
          name
          isAnimationStudio
        }
      }
      externalLinks {
        id
        url
        site
        type
        color
      }
      relations {
        edges {
          id
          relationType
          node {
            ${MEDIA_SUMMARY_FIELDS}
          }
        }
      }
      characters(sort: [ROLE, FAVOURITES_DESC], perPage: 16) {
        edges {
          id
          role
          node {
            id
            name {
              full
              native
            }
            image {
              medium
              large
            }
          }
          voiceActors(language: JAPANESE, sort: [RELEVANCE]) {
            id
            name {
              full
            }
            languageV2
            image {
              medium
            }
          }
        }
      }
      recommendations(sort: [RATING_DESC], perPage: 12) {
        nodes {
          id
          rating
          mediaRecommendation {
            ${MEDIA_SUMMARY_FIELDS}
          }
        }
      }
    }
  }
`;

interface MediaDetailRaw {
  Media: MediaDetail;
}

export function useMediaDetailQuery(mediaId: number | null) {
  return useQuery({
    queryKey: ['media', mediaId],
    enabled: mediaId !== null && mediaId > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const res = await anilistRequest<MediaDetailRaw>(
        MEDIA_DETAIL_QUERY,
        { id: mediaId },
        { signal },
      );
      return res.Media;
    },
  });
}
