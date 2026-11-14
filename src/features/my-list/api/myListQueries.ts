import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { anilistRequest } from '@/shared/api/graphqlClient';
import { MEDIA_SUMMARY_FIELDS } from '@/shared/api/mediaFragments';
import type {
  MediaDetail,
  MediaListCollection,
  MediaListEntry,
  MediaType,
  SaveMediaListEntryInput,
} from '@/shared/api/types';

const MEDIA_LIST_ENTRY_FIELDS = `
  id
  mediaId
  status
  score
  progress
  progressVolumes
  repeat
  private
  notes
  startedAt {
    year
    month
    day
  }
  completedAt {
    year
    month
    day
  }
  updatedAt
  media {
    ${MEDIA_SUMMARY_FIELDS}
  }
`;

export const MEDIA_LIST_COLLECTION_QUERY = `
  query UserMediaListCollection($userId: Int, $userName: String, $type: MediaType!) {
    MediaListCollection(userId: $userId, userName: $userName, type: $type) {
      hasNextChunk
      lists {
        name
        isCustomList
        status
        entries {
          ${MEDIA_LIST_ENTRY_FIELDS}
        }
      }
    }
  }
`;

export const SAVE_MEDIA_LIST_ENTRY_MUTATION = `
  mutation SaveListEntry(
    $id: Int
    $mediaId: Int
    $status: MediaListStatus
    $score: Float
    $progress: Int
    $progressVolumes: Int
    $repeat: Int
    $private: Boolean
    $notes: String
    $startedAt: FuzzyDateInput
    $completedAt: FuzzyDateInput
  ) {
    SaveMediaListEntry(
      id: $id
      mediaId: $mediaId
      status: $status
      score: $score
      progress: $progress
      progressVolumes: $progressVolumes
      repeat: $repeat
      private: $private
      notes: $notes
      startedAt: $startedAt
      completedAt: $completedAt
    ) {
      ${MEDIA_LIST_ENTRY_FIELDS}
    }
  }
`;

export const DELETE_MEDIA_LIST_ENTRY_MUTATION = `
  mutation DeleteListEntry($id: Int!) {
    DeleteMediaListEntry(id: $id) {
      deleted
    }
  }
`;

interface MediaListCollectionRaw {
  MediaListCollection: MediaListCollection;
}

interface SaveMediaListEntryRaw {
  SaveMediaListEntry: MediaListEntry;
}

interface DeleteMediaListEntryRaw {
  DeleteMediaListEntry: { deleted: boolean };
}

export function myListQueryKey(userId: number | undefined, type: MediaType) {
  return ['my-list', userId ?? 'anon', type] as const;
}

export function publicUserListQueryKey(username: string, type: MediaType) {
  return ['public-user-list', username.toLowerCase(), type] as const;
}

export function useMyListQuery(userId: number | undefined, type: MediaType) {
  return useQuery({
    queryKey: myListQueryKey(userId, type),
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const raw = await anilistRequest<MediaListCollectionRaw>(
        MEDIA_LIST_COLLECTION_QUERY,
        { userId, type },
        { signal },
      );
      return raw.MediaListCollection;
    },
  });
}

export function usePublicUserListQuery(
  userName: string | undefined,
  type: MediaType,
  enabled: boolean,
) {
  return useQuery({
    queryKey: publicUserListQueryKey(userName ?? '', type),
    enabled: Boolean(userName && enabled),
    staleTime: 5 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const raw = await anilistRequest<MediaListCollectionRaw>(
        MEDIA_LIST_COLLECTION_QUERY,
        { userName, type },
        { signal },
      );
      return raw.MediaListCollection;
    },
  });
}

function patchProgressInCollection(
  collection: MediaListCollection | undefined,
  entryId: number,
  nextProgress: number,
): MediaListCollection | undefined {
  if (!collection) {
    return collection;
  }

  return {
    ...collection,
    lists: collection.lists.map((group) => ({
      ...group,
      entries: group.entries.map((entry) =>
        entry.id === entryId ? { ...entry, progress: nextProgress } : entry,
      ),
    })),
  };
}

function removeEntryInCollection(
  collection: MediaListCollection | undefined,
  entryId: number,
): MediaListCollection | undefined {
  if (!collection) {
    return collection;
  }

  return {
    ...collection,
    lists: collection.lists.map((group) => ({
      ...group,
      entries: group.entries.filter((entry) => entry.id !== entryId),
    })),
  };
}

function syncMediaDetailCache(
  queryClient: QueryClient,
  mediaId: number,
  entry: MediaListEntry | null,
): void {
  queryClient.setQueryData<MediaDetail | undefined>(
    ['media-detail', mediaId],
    (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        mediaListEntry: entry
          ? {
              id: entry.id,
              status: entry.status,
              score: entry.score,
              progress: entry.progress,
              progressVolumes: entry.progressVolumes,
              repeat: entry.repeat,
              private: entry.private,
              notes: entry.notes,
              startedAt: entry.startedAt,
              completedAt: entry.completedAt,
              updatedAt: entry.updatedAt,
            }
          : null,
      };
    },
  );
}

export function useUpdateProgressMutation(userId: number | undefined, type: MediaType) {
  const queryClient = useQueryClient();
  const key = myListQueryKey(userId, type);

  return useMutation({
    mutationFn: async (vars: { entryId: number; mediaId: number; progress: number }) => {
      const raw = await anilistRequest<SaveMediaListEntryRaw>(
        SAVE_MEDIA_LIST_ENTRY_MUTATION,
        {
          id: vars.entryId,
          mediaId: vars.mediaId,
          progress: vars.progress,
        },
      );
      return raw.SaveMediaListEntry;
    },
    async onMutate(vars) {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MediaListCollection>(key);
      queryClient.setQueryData<MediaListCollection | undefined>(key, (old) =>
        patchProgressInCollection(old, vars.entryId, vars.progress),
      );
      return { previous };
    },
    onError(_err, _vars, context) {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess(saved) {
      syncMediaDetailCache(queryClient, saved.mediaId, saved);
      void queryClient.invalidateQueries({ queryKey: ['my-list'] });
      void queryClient.invalidateQueries({ queryKey: ['viewer'] });
    },
  });
}

export function useSaveMediaListEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveMediaListEntryInput) => {
      const raw = await anilistRequest<SaveMediaListEntryRaw>(
        SAVE_MEDIA_LIST_ENTRY_MUTATION,
        input as Record<string, unknown>,
      );
      return raw.SaveMediaListEntry;
    },
    onSuccess(saved) {
      syncMediaDetailCache(queryClient, saved.mediaId, saved);
      void queryClient.invalidateQueries({ queryKey: ['my-list'] });
      void queryClient.invalidateQueries({ queryKey: ['viewer'] });
    },
  });
}

export function useDeleteMediaListEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { id: number; mediaId: number; type: MediaType; userId?: number }) => {
      const raw = await anilistRequest<DeleteMediaListEntryRaw>(
        DELETE_MEDIA_LIST_ENTRY_MUTATION,
        { id: vars.id },
      );
      return raw.DeleteMediaListEntry;
    },
    onSuccess(_res, vars) {
      if (vars.userId) {
        queryClient.setQueryData<MediaListCollection | undefined>(
          myListQueryKey(vars.userId, vars.type),
          (old) => removeEntryInCollection(old, vars.id),
        );
      }
      syncMediaDetailCache(queryClient, vars.mediaId, null);
      void queryClient.invalidateQueries({ queryKey: ['my-list'] });
      void queryClient.invalidateQueries({ queryKey: ['viewer'] });
    },
  });
}
