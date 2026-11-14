import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { anilistRequest } from '@/shared/api/graphqlClient';
import { CHARACTER_SUMMARY_FIELDS, MEDIA_SUMMARY_FIELDS } from '@/shared/api/mediaFragments';
import type {
  CharacterDetail,
  CharacterMediaEdge,
  MediaType,
  PageInfo,
} from '@/shared/api/types';

const CHARACTER_DETAIL_QUERY = `
  query CharacterDetail($id: Int!) {
    Character(id: $id) {
      ${CHARACTER_SUMMARY_FIELDS}
      name {
        full
        native
        alternative
        alternativeSpoiler
      }
      description(asHtml: true)
      gender
      dateOfBirth {
        year
        month
        day
      }
      age
      bloodType
      siteUrl
    }
  }
`;

const CHARACTER_MEDIA_QUERY = `
  query CharacterMedia($id: Int!, $page: Int!, $perPage: Int!, $type: MediaType) {
    Character(id: $id) {
      id
      media(sort: [POPULARITY_DESC], type: $type, page: $page, perPage: $perPage) {
        pageInfo {
          total
          perPage
          currentPage
          lastPage
          hasNextPage
        }
        edges {
          id
          relationType
          characterRole
          voiceActors(sort: [RELEVANCE]) {
            id
            name {
              full
            }
            languageV2
            image {
              medium
            }
          }
          node {
            ${MEDIA_SUMMARY_FIELDS}
          }
        }
      }
    }
  }
`;

interface CharacterDetailRaw {
  Character: CharacterDetail | null;
}

export interface CharacterMediaPageRaw {
  Character: {
    id: number;
    media: {
      pageInfo: PageInfo;
      edges: CharacterMediaEdge[];
    };
  } | null;
}

export function useCharacterDetailQuery(characterId: number) {
  return useQuery({
    queryKey: ['character', 'detail', characterId],
    enabled: Number.isFinite(characterId) && characterId > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: ({ signal }) =>
      anilistRequest<CharacterDetailRaw>(
        CHARACTER_DETAIL_QUERY,
        { id: characterId },
        { signal },
      ).then((res) => res.Character),
  });
}

export function useCharacterMediaQuery(characterId: number, mediaType?: MediaType) {
  return useInfiniteQuery({
    queryKey: ['character', 'media', characterId, mediaType ?? 'ALL'],
    enabled: Number.isFinite(characterId) && characterId > 0,
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
    queryFn: ({ pageParam, signal }) =>
      anilistRequest<CharacterMediaPageRaw>(
        CHARACTER_MEDIA_QUERY,
        {
          id: characterId,
          page: pageParam,
          perPage: 18,
          type: mediaType,
        },
        { signal },
      ),
    getNextPageParam: (lastPage) => {
      const pageInfo = lastPage.Character?.media.pageInfo;
      return pageInfo?.hasNextPage ? (pageInfo.currentPage ?? 1) + 1 : undefined;
    },
  });
}
