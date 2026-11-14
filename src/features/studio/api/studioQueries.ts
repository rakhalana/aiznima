import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { anilistRequest } from '@/shared/api/graphqlClient';
import { MEDIA_SUMMARY_FIELDS, STUDIO_SUMMARY_FIELDS } from '@/shared/api/mediaFragments';
import type {
  MediaSort,
  PageInfo,
  StudioDetail,
  StudioMediaEdge,
} from '@/shared/api/types';

const STUDIO_DETAIL_QUERY = `
  query StudioDetail($id: Int!) {
    Studio(id: $id) {
      ${STUDIO_SUMMARY_FIELDS}
      siteUrl
    }
  }
`;

const STUDIO_MEDIA_QUERY = `
  query StudioMedia($id: Int!, $page: Int!, $perPage: Int!, $sort: [MediaSort], $isMain: Boolean) {
    Studio(id: $id) {
      id
      media(sort: $sort, isMain: $isMain, page: $page, perPage: $perPage) {
        pageInfo {
          total
          perPage
          currentPage
          lastPage
          hasNextPage
        }
        edges {
          id
          isMainStudio
          node {
            ${MEDIA_SUMMARY_FIELDS}
          }
        }
      }
    }
  }
`;

interface StudioDetailRaw {
  Studio: StudioDetail | null;
}

export interface StudioMediaRaw {
  Studio: {
    id: number;
    media: {
      pageInfo: PageInfo;
      edges: StudioMediaEdge[];
    };
  } | null;
}

export function useStudioDetailQuery(studioId: number) {
  return useQuery({
    queryKey: ['studio', 'detail', studioId],
    enabled: Number.isFinite(studioId) && studioId > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: ({ signal }) =>
      anilistRequest<StudioDetailRaw>(STUDIO_DETAIL_QUERY, { id: studioId }, { signal }).then(
        (res) => res.Studio,
      ),
  });
}

export function useStudioMediaQuery(
  studioId: number,
  sort: MediaSort,
  mainOnly: boolean,
) {
  return useInfiniteQuery({
    queryKey: ['studio', 'media', studioId, sort, mainOnly],
    enabled: Number.isFinite(studioId) && studioId > 0,
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
    queryFn: ({ pageParam, signal }) =>
      anilistRequest<StudioMediaRaw>(
        STUDIO_MEDIA_QUERY,
        {
          id: studioId,
          page: pageParam,
          perPage: 24,
          sort: [sort],
          isMain: mainOnly ? true : undefined,
        },
        { signal },
      ),
    getNextPageParam: (lastPage) => {
      const pageInfo = lastPage.Studio?.media.pageInfo;
      return pageInfo?.hasNextPage ? (pageInfo.currentPage ?? 1) + 1 : undefined;
    },
  });
}
