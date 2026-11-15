import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { anilistRequest } from '@/shared/api/graphqlClient';
import type { AppNotification, NotificationType, PageInfo } from '@/shared/api/types';
import { useAuthStore } from '@/shared/stores/useAuthStore';

const NOTIFICATION_USER_FIELDS = `
  id
  name
  avatar {
    medium
    large
  }
`;

const NOTIFICATION_MEDIA_FIELDS = `
  id
  type
  isAdult
  siteUrl
  title {
    romaji
    english
    native
  }
  coverImage {
    medium
    large
    color
  }
`;

const NOTIFICATION_ACTIVITY_FIELDS = `
  ... on TextActivity { siteUrl }
  ... on ListActivity { siteUrl }
  ... on MessageActivity { siteUrl }
`;

export const UNREAD_NOTIFICATION_COUNT_QUERY = `
  query UnreadNotificationCount {
    Viewer {
      id
      unreadNotificationCount
    }
  }
`;

export const NOTIFICATIONS_QUERY = `
  query ViewerNotifications(
    $page: Int
    $perPage: Int
    $types: [NotificationType]
    $resetNotificationCount: Boolean
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        perPage
        currentPage
        lastPage
        hasNextPage
      }
      notifications(type_in: $types, resetNotificationCount: $resetNotificationCount) {
        __typename
        ... on AiringNotification {
          id
          type
          animeId
          episode
          contexts
          createdAt
          media {
            ${NOTIFICATION_MEDIA_FIELDS}
          }
        }
        ... on FollowingNotification {
          id
          type
          userId
          context
          createdAt
          user {
            ${NOTIFICATION_USER_FIELDS}
          }
        }
        ... on ActivityMessageNotification {
          id
          type
          userId
          activityId
          context
          createdAt
          user {
            ${NOTIFICATION_USER_FIELDS}
          }
          message {
            siteUrl
          }
        }
        ... on ActivityMentionNotification {
          id
          type
          userId
          activityId
          context
          createdAt
          user {
            ${NOTIFICATION_USER_FIELDS}
          }
          activity {
            ${NOTIFICATION_ACTIVITY_FIELDS}
          }
        }
        ... on ActivityReplyNotification {
          id
          type
          userId
          activityId
          context
          createdAt
          user {
            ${NOTIFICATION_USER_FIELDS}
          }
          activity {
            ${NOTIFICATION_ACTIVITY_FIELDS}
          }
        }
        ... on ActivityReplySubscribedNotification {
          id
          type
          userId
          activityId
          context
          createdAt
          user {
            ${NOTIFICATION_USER_FIELDS}
          }
          activity {
            ${NOTIFICATION_ACTIVITY_FIELDS}
          }
        }
        ... on ActivityLikeNotification {
          id
          type
          userId
          activityId
          context
          createdAt
          user {
            ${NOTIFICATION_USER_FIELDS}
          }
          activity {
            ${NOTIFICATION_ACTIVITY_FIELDS}
          }
        }
        ... on ActivityReplyLikeNotification {
          id
          type
          userId
          activityId
          context
          createdAt
          user {
            ${NOTIFICATION_USER_FIELDS}
          }
          activity {
            ${NOTIFICATION_ACTIVITY_FIELDS}
          }
        }
        ... on ThreadCommentMentionNotification {
          id
          type
          userId
          commentId
          context
          createdAt
          user {
            ${NOTIFICATION_USER_FIELDS}
          }
          thread {
            id
            title
            siteUrl
          }
          comment {
            id
            siteUrl
          }
        }
        ... on ThreadCommentReplyNotification {
          id
          type
          userId
          commentId
          context
          createdAt
          user {
            ${NOTIFICATION_USER_FIELDS}
          }
          thread {
            id
            title
            siteUrl
          }
          comment {
            id
            siteUrl
          }
        }
        ... on ThreadCommentSubscribedNotification {
          id
          type
          userId
          commentId
          context
          createdAt
          user {
            ${NOTIFICATION_USER_FIELDS}
          }
          thread {
            id
            title
            siteUrl
          }
          comment {
            id
            siteUrl
          }
        }
        ... on ThreadCommentLikeNotification {
          id
          type
          userId
          commentId
          context
          createdAt
          user {
            ${NOTIFICATION_USER_FIELDS}
          }
          thread {
            id
            title
            siteUrl
          }
          comment {
            id
            siteUrl
          }
        }
        ... on ThreadLikeNotification {
          id
          type
          userId
          threadId
          context
          createdAt
          user {
            ${NOTIFICATION_USER_FIELDS}
          }
          thread {
            id
            title
            siteUrl
          }
        }
        ... on RelatedMediaAdditionNotification {
          id
          type
          mediaId
          context
          createdAt
          media {
            ${NOTIFICATION_MEDIA_FIELDS}
          }
        }
        ... on MediaDataChangeNotification {
          id
          type
          mediaId
          context
          reason
          createdAt
          media {
            ${NOTIFICATION_MEDIA_FIELDS}
          }
        }
        ... on MediaMergeNotification {
          id
          type
          mediaId
          deletedMediaTitles
          context
          reason
          createdAt
          media {
            ${NOTIFICATION_MEDIA_FIELDS}
          }
        }
        ... on MediaDeletionNotification {
          id
          type
          deletedMediaTitle
          context
          reason
          createdAt
        }
        ... on MediaSubmissionUpdateNotification {
          id
          type
          contexts
          status
          submittedTitle
          notes
          createdAt
          media {
            ${NOTIFICATION_MEDIA_FIELDS}
          }
        }
        ... on StaffSubmissionUpdateNotification {
          id
          type
          contexts
          status
          notes
          createdAt
          staff {
            id
            name {
              full
            }
            image {
              medium
            }
          }
        }
        ... on CharacterSubmissionUpdateNotification {
          id
          type
          contexts
          status
          notes
          createdAt
          character {
            id
            name {
              full
            }
            image {
              medium
            }
          }
        }
      }
    }
  }
`;

export interface NotificationsPageResponse {
  Page: {
    pageInfo: PageInfo;
    notifications: AppNotification[];
  };
}

interface UnreadCountResponse {
  Viewer: {
    id: number;
    unreadNotificationCount: number | null;
  } | null;
}

export function useUnreadNotificationCount() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const viewerUnread = useAuthStore((state) => state.viewer?.unreadNotificationCount);

  const query = useQuery({
    queryKey: ['unread-notifications', accessToken],
    queryFn: async ({ signal }) => {
      const data = await anilistRequest<UnreadCountResponse>(
        UNREAD_NOTIFICATION_COUNT_QUERY,
        undefined,
        { signal },
      );
      return data.Viewer?.unreadNotificationCount ?? 0;
    },
    enabled: Boolean(isHydrated && accessToken),
    staleTime: 60 * 1000,
  });

  if (!accessToken) {
    return 0;
  }
  return query.data ?? viewerUnread ?? 0;
}

export function useNotificationsInfiniteQuery(types?: NotificationType[]) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const typesKey = types && types.length > 0 ? types.join(',') : 'ALL';

  return useInfiniteQuery({
    queryKey: ['notifications', accessToken, typesKey],
    queryFn: ({ pageParam, signal }) =>
      anilistRequest<NotificationsPageResponse>(
        NOTIFICATIONS_QUERY,
        {
          page: pageParam,
          perPage: 25,
          types: types && types.length > 0 ? types : undefined,
          resetNotificationCount: false,
        },
        { signal },
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.Page.pageInfo.hasNextPage
        ? (lastPage.Page.pageInfo.currentPage ?? 1) + 1
        : undefined,
    enabled: Boolean(isHydrated && accessToken),
    staleTime: 60 * 1000,
  });
}
