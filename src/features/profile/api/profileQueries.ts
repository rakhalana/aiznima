import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { USER_PROFILE_FIELDS } from '@/features/auth/api/viewerQuery';
import { AniListApiError, anilistRequest } from '@/shared/api/graphqlClient';
import type { UpdateUserInput, UserProfile } from '@/shared/api/types';
import { useAuthStore } from '@/shared/stores/useAuthStore';

const PUBLIC_USER_QUERY = `
  query PublicUserProfile($name: String!) {
    User(name: $name) {
      ${USER_PROFILE_FIELDS}
    }
  }
`;

const UPDATE_USER_MUTATION = `
  mutation UpdateUserProfile(
    $about: String
    $titleLanguage: UserTitleLanguage
    $displayAdultContent: Boolean
    $includeAdultContentInSearch: Boolean
    $scoreFormat: ScoreFormat
    $profileColor: String
  ) {
    UpdateUser(
      about: $about
      titleLanguage: $titleLanguage
      displayAdultContent: $displayAdultContent
      includeAdultContentInSearch: $includeAdultContentInSearch
      scoreFormat: $scoreFormat
      profileColor: $profileColor
    ) {
      ${USER_PROFILE_FIELDS}
    }
  }
`;

interface PublicUserRaw {
  User: UserProfile | null;
}

interface UpdateUserRaw {
  UpdateUser: UserProfile;
}

export function isPrivateListError(error: unknown): boolean {
  return (
    error instanceof AniListApiError &&
    (error.status === 403 || /private/i.test(error.message))
  );
}

export function isUserNotFoundError(error: unknown): boolean {
  return (
    error instanceof AniListApiError &&
    (error.status === 404 || /not found/i.test(error.message))
  );
}

export function usePublicUserQuery(username: string | undefined) {
  return useQuery({
    queryKey: ['public-user', username?.toLowerCase() ?? ''],
    enabled: Boolean(username && username.trim().length > 0),
    staleTime: 5 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const raw = await anilistRequest<PublicUserRaw>(
        PUBLIC_USER_QUERY,
        { name: username },
        { signal },
      );
      return raw.User;
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateUserInput) => {
      const raw = await anilistRequest<UpdateUserRaw>(
        UPDATE_USER_MUTATION,
        input as Record<string, unknown>,
      );
      return raw.UpdateUser;
    },
    onSuccess(updatedUser) {
      useAuthStore.getState().setViewer(updatedUser);
      queryClient.setQueryData(['viewer'], updatedUser);
      void queryClient.invalidateQueries({ queryKey: ['my-list'] });
      void queryClient.invalidateQueries({ queryKey: ['discover'] });
      void queryClient.invalidateQueries({ queryKey: ['search'] });
    },
  });
}
