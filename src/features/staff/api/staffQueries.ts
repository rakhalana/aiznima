import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { anilistRequest } from '@/shared/api/graphqlClient';
import { MEDIA_SUMMARY_FIELDS, STAFF_SUMMARY_FIELDS } from '@/shared/api/mediaFragments';
import type {
  MediaType,
  PageInfo,
  StaffCharacterMediaEdge,
  StaffDetail,
  StaffMediaEdge,
} from '@/shared/api/types';

const STAFF_DETAIL_QUERY = `
  query StaffDetail($id: Int!) {
    Staff(id: $id) {
      ${STAFF_SUMMARY_FIELDS}
      name {
        full
        native
        alternative
      }
      description(asHtml: true)
      gender
      dateOfBirth {
        year
        month
        day
      }
      dateOfDeath {
        year
        month
        day
      }
      age
      yearsActive
      homeTown
      bloodType
      siteUrl
    }
  }
`;

const STAFF_CHARACTER_MEDIA_QUERY = `
  query StaffCharacterMedia($id: Int!, $page: Int!, $perPage: Int!) {
    Staff(id: $id) {
      id
      characterMedia(sort: [POPULARITY_DESC], page: $page, perPage: $perPage) {
        pageInfo {
          total
          perPage
          currentPage
          lastPage
          hasNextPage
        }
        edges {
          id
          characterRole
          characters {
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
          node {
            ${MEDIA_SUMMARY_FIELDS}
          }
        }
      }
    }
  }
`;

const STAFF_MEDIA_QUERY = `
  query StaffMedia($id: Int!, $page: Int!, $perPage: Int!, $type: MediaType) {
    Staff(id: $id) {
      id
      staffMedia(sort: [POPULARITY_DESC], type: $type, page: $page, perPage: $perPage) {
        pageInfo {
          total
          perPage
          currentPage
          lastPage
          hasNextPage
        }
        edges {
          id
          staffRole
          node {
            ${MEDIA_SUMMARY_FIELDS}
          }
        }
      }
    }
  }
`;

interface StaffDetailRaw {
  Staff: StaffDetail | null;
}

export interface StaffCharacterMediaRaw {
  Staff: {
    id: number;
    characterMedia: {
      pageInfo: PageInfo;
      edges: StaffCharacterMediaEdge[];
    };
  } | null;
}

export interface StaffMediaRaw {
  Staff: {
    id: number;
    staffMedia: {
      pageInfo: PageInfo;
      edges: StaffMediaEdge[];
    };
  } | null;
}

export function useStaffDetailQuery(staffId: number) {
  return useQuery({
    queryKey: ['staff', 'detail', staffId],
    enabled: Number.isFinite(staffId) && staffId > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: ({ signal }) =>
      anilistRequest<StaffDetailRaw>(STAFF_DETAIL_QUERY, { id: staffId }, { signal }).then(
        (res) => res.Staff,
      ),
  });
}

export function useStaffCharacterMediaQuery(staffId: number, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['staff', 'characterMedia', staffId],
    enabled: enabled && Number.isFinite(staffId) && staffId > 0,
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
    queryFn: ({ pageParam, signal }) =>
      anilistRequest<StaffCharacterMediaRaw>(
        STAFF_CHARACTER_MEDIA_QUERY,
        { id: staffId, page: pageParam, perPage: 18 },
        { signal },
      ),
    getNextPageParam: (lastPage) => {
      const pageInfo = lastPage.Staff?.characterMedia.pageInfo;
      return pageInfo?.hasNextPage ? (pageInfo.currentPage ?? 1) + 1 : undefined;
    },
  });
}

export function useStaffMediaQuery(
  staffId: number,
  mediaType?: MediaType,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: ['staff', 'staffMedia', staffId, mediaType ?? 'ALL'],
    enabled: enabled && Number.isFinite(staffId) && staffId > 0,
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
    queryFn: ({ pageParam, signal }) =>
      anilistRequest<StaffMediaRaw>(
        STAFF_MEDIA_QUERY,
        { id: staffId, page: pageParam, perPage: 18, type: mediaType },
        { signal },
      ),
    getNextPageParam: (lastPage) => {
      const pageInfo = lastPage.Staff?.staffMedia.pageInfo;
      return pageInfo?.hasNextPage ? (pageInfo.currentPage ?? 1) + 1 : undefined;
    },
  });
}
