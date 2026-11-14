import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { anilistRequest } from '@/shared/api/graphqlClient';
import type { UserProfile } from '@/shared/api/types';
import { useAuthStore } from '@/shared/stores/useAuthStore';

export const USER_PROFILE_FIELDS = `
  id
  name
  about(asHtml: true)
  avatar {
    large
    medium
  }
  bannerImage
  siteUrl
  unreadNotificationCount
  options {
    titleLanguage
    displayAdultContent
    includeAdultContentInSearch
    profileColor
  }
  mediaListOptions {
    scoreFormat
    rowOrder
  }
  statistics {
    anime {
      count
      meanScore
      minutesWatched
      episodesWatched
    }
    manga {
      count
      meanScore
      chaptersRead
      volumesRead
    }
  }
  favourites {
    anime(perPage: 12) {
      nodes {
        id
        idMal
        type
        format
        status
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          medium
          extraLarge
          color
        }
        episodes
        chapters
        meanScore
        isAdult
        genres
      }
    }
    manga(perPage: 12) {
      nodes {
        id
        idMal
        type
        format
        status
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          medium
          extraLarge
          color
        }
        episodes
        chapters
        meanScore
        isAdult
        genres
      }
    }
  }
`;

export const VIEWER_QUERY = `
  query ViewerProfile {
    Viewer {
      ${USER_PROFILE_FIELDS}
    }
  }
`;

interface ViewerResponse {
  Viewer: UserProfile;
}

export function useViewerQuery() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const setViewer = useAuthStore((state) => state.setViewer);

  const query = useQuery({
    queryKey: ['viewer', accessToken],
    queryFn: ({ signal }) => anilistRequest<ViewerResponse>(VIEWER_QUERY, undefined, { signal }),
    enabled: Boolean(isHydrated && accessToken),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data?.Viewer) {
      setViewer(query.data.Viewer);
    }
  }, [query.data, setViewer]);

  return query;
}
