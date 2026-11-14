import type {
  AppNotification,
  NotificationType,
  UserTitleLanguage,
} from '@/shared/api/types';
import { formatMediaTitle, formatRelativeTime } from '@/shared/utils/formatters';

export type NotificationFilterCategory = 'ALL' | 'AIRING' | 'SOCIAL' | 'MEDIA';

export interface NotificationFilterOption {
  key: NotificationFilterCategory;
  label: string;
  types?: NotificationType[];
}

export const NOTIFICATION_FILTERS: NotificationFilterOption[] = [
  { key: 'ALL', label: 'All' },
  { key: 'AIRING', label: 'Airing', types: ['AIRING'] },
  {
    key: 'SOCIAL',
    label: 'Activity',
    types: [
      'ACTIVITY_MESSAGE',
      'ACTIVITY_REPLY',
      'FOLLOWING',
      'ACTIVITY_MENTION',
      'THREAD_COMMENT_MENTION',
      'THREAD_SUBSCRIBED',
      'THREAD_COMMENT_REPLY',
      'ACTIVITY_LIKE',
      'ACTIVITY_REPLY_LIKE',
      'THREAD_LIKE',
      'THREAD_COMMENT_LIKE',
      'ACTIVITY_REPLY_SUBSCRIBED',
    ],
  },
  {
    key: 'MEDIA',
    label: 'Media & Edits',
    types: [
      'RELATED_MEDIA_ADDITION',
      'MEDIA_DATA_CHANGE',
      'MEDIA_MERGE',
      'MEDIA_DELETION',
      'MEDIA_SUBMISSION_UPDATE',
      'STAFF_SUBMISSION_UPDATE',
      'CHARACTER_SUBMISSION_UPDATE',
    ],
  },
];

export type NotificationTarget =
  | { kind: 'internal'; path: string }
  | { kind: 'external'; url: string }
  | null;

export interface PresentedNotification {
  id: number;
  kind: 'airing' | 'social' | 'media';
  title: string;
  description: string;
  secondaryText: string | null;
  timeAgo: string;
  imageUrl: string | null;
  imageShape: 'avatar' | 'poster';
  target: NotificationTarget;
  isAdultMedia: boolean;
}

export function presentNotification(
  item: AppNotification,
  preferredLanguage: UserTitleLanguage,
): PresentedNotification {
  const timeAgo = formatRelativeTime(item.createdAt);

  switch (item.type) {
    case 'AIRING': {
      const mediaTitle = formatMediaTitle(item.media?.title, preferredLanguage);
      return {
        id: item.id,
        kind: 'airing',
        title: mediaTitle,
        description: `Episode ${item.episode} aired`,
        secondaryText: null,
        timeAgo,
        imageUrl: item.media?.coverImage?.medium ?? item.media?.coverImage?.large ?? null,
        imageShape: 'poster',
        target: item.media?.id ? { kind: 'internal', path: `/media/${item.media.id}` } : null,
        isAdultMedia: Boolean(item.media?.isAdult),
      };
    }

    case 'FOLLOWING': {
      const username = item.user?.name ?? 'An AniList user';
      return {
        id: item.id,
        kind: 'social',
        title: username,
        description: item.context?.trim() || 'started following you',
        secondaryText: null,
        timeAgo,
        imageUrl: item.user?.avatar?.medium ?? item.user?.avatar?.large ?? null,
        imageShape: 'avatar',
        target: item.user?.name
          ? { kind: 'internal', path: `/user/${encodeURIComponent(item.user.name)}` }
          : null,
        isAdultMedia: false,
      };
    }

    case 'ACTIVITY_MESSAGE':
    case 'ACTIVITY_REPLY':
    case 'ACTIVITY_MENTION':
    case 'ACTIVITY_LIKE':
    case 'ACTIVITY_REPLY_LIKE':
    case 'ACTIVITY_REPLY_SUBSCRIBED': {
      const username = item.user?.name ?? 'An AniList user';
      const url =
        item.activity?.siteUrl ??
        item.message?.siteUrl ??
        (item.activityId ? `https://anilist.co/activity/${item.activityId}` : null);
      return {
        id: item.id,
        kind: 'social',
        title: username,
        description: item.context?.trim() || 'interacted with your activity',
        secondaryText: null,
        timeAgo,
        imageUrl: item.user?.avatar?.medium ?? item.user?.avatar?.large ?? null,
        imageShape: 'avatar',
        target: url ? { kind: 'external', url } : null,
        isAdultMedia: false,
      };
    }

    case 'THREAD_COMMENT_MENTION':
    case 'THREAD_COMMENT_REPLY':
    case 'THREAD_SUBSCRIBED':
    case 'THREAD_COMMENT_LIKE':
    case 'THREAD_LIKE': {
      const username = item.user?.name ?? 'An AniList user';
      const url =
        item.comment?.siteUrl ??
        item.thread?.siteUrl ??
        (item.thread?.id ? `https://anilist.co/forum/thread/${item.thread.id}` : null);
      return {
        id: item.id,
        kind: 'social',
        title: username,
        description: `${item.context?.trim() || 'updated a thread'}${
          item.thread?.title ? ` · ${item.thread.title}` : ''
        }`,
        secondaryText: null,
        timeAgo,
        imageUrl: item.user?.avatar?.medium ?? item.user?.avatar?.large ?? null,
        imageShape: 'avatar',
        target: url ? { kind: 'external', url } : null,
        isAdultMedia: false,
      };
    }

    case 'RELATED_MEDIA_ADDITION':
    case 'MEDIA_DATA_CHANGE':
    case 'MEDIA_MERGE':
    case 'MEDIA_DELETION': {
      const fallbackTitle =
        item.deletedMediaTitle ??
        (item.deletedMediaTitles?.filter(Boolean).join(', ') || 'Media update');
      const mediaTitle = item.media
        ? formatMediaTitle(item.media.title, preferredLanguage)
        : fallbackTitle;
      const targetId = item.media?.id ?? item.mediaId;
      return {
        id: item.id,
        kind: 'media',
        title: mediaTitle,
        description: item.context?.trim() || 'Media database updated',
        secondaryText: item.reason?.trim() || null,
        timeAgo,
        imageUrl: item.media?.coverImage?.medium ?? item.media?.coverImage?.large ?? null,
        imageShape: 'poster',
        target:
          targetId && item.type !== 'MEDIA_DELETION'
            ? { kind: 'internal', path: `/media/${targetId}` }
            : null,
        isAdultMedia: Boolean(item.media?.isAdult),
      };
    }

    case 'MEDIA_SUBMISSION_UPDATE':
    case 'STAFF_SUBMISSION_UPDATE':
    case 'CHARACTER_SUBMISSION_UPDATE': {
      const entityTitle = item.media
        ? formatMediaTitle(item.media.title, preferredLanguage)
        : item.staff?.name?.full ??
          item.character?.name?.full ??
          item.submittedTitle ??
          'Submission update';
      const contextText = (item.contexts ?? []).filter(Boolean).join(' ').trim();
      const description =
        contextText ||
        (item.status ? `Submission status: ${item.status.toLowerCase()}` : 'Submission updated');

      let target: NotificationTarget = null;
      if (item.media?.id) {
        target = { kind: 'internal', path: `/media/${item.media.id}` };
      } else if (item.staff?.id) {
        target = { kind: 'internal', path: `/staff/${item.staff.id}` };
      } else if (item.character?.id) {
        target = { kind: 'internal', path: `/character/${item.character.id}` };
      }

      const imageUrl =
        item.media?.coverImage?.medium ??
        item.media?.coverImage?.large ??
        item.staff?.image?.medium ??
        item.character?.image?.medium ??
        null;

      return {
        id: item.id,
        kind: 'media',
        title: entityTitle,
        description,
        secondaryText: item.notes?.trim() || null,
        timeAgo,
        imageUrl,
        imageShape: 'poster',
        target,
        isAdultMedia: Boolean(item.media?.isAdult),
      };
    }
  }
}
