import { useMutation, useQueryClient } from '@tanstack/react-query';
import { anilistRequest } from '@/shared/api/graphqlClient';
import { useToastStore } from '@/shared/stores/useToastStore';

export type FavouriteTargetKind = 'ANIME' | 'MANGA' | 'CHARACTER' | 'STAFF' | 'STUDIO';

export interface ToggleFavouriteVars {
  kind: FavouriteTargetKind;
  id: number;
  nextIsFavourite: boolean;
}

const TOGGLE_FAVOURITE_MUTATION = `
  mutation ToggleFavourite(
    $animeId: Int
    $mangaId: Int
    $characterId: Int
    $staffId: Int
    $studioId: Int
  ) {
    ToggleFavourite(
      animeId: $animeId
      mangaId: $mangaId
      characterId: $characterId
      staffId: $staffId
      studioId: $studioId
    ) {
      anime(page: 1, perPage: 1) {
        pageInfo {
          total
        }
      }
    }
  }
`;

interface FavouritableEntity {
  isFavourite?: boolean;
  favourites?: number | null;
}

function getDetailQueryKey(kind: FavouriteTargetKind, id: number): readonly unknown[] {
  switch (kind) {
    case 'ANIME':
    case 'MANGA':
      return ['media', id];
    case 'CHARACTER':
      return ['character', 'detail', id];
    case 'STAFF':
      return ['staff', 'detail', id];
    case 'STUDIO':
      return ['studio', 'detail', id];
  }
}

function getMutationVariables(kind: FavouriteTargetKind, id: number): Record<string, number> {
  switch (kind) {
    case 'ANIME':
      return { animeId: id };
    case 'MANGA':
      return { mangaId: id };
    case 'CHARACTER':
      return { characterId: id };
    case 'STAFF':
      return { staffId: id };
    case 'STUDIO':
      return { studioId: id };
  }
}

export function useToggleFavouriteMutation() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: async (vars: ToggleFavouriteVars) => {
      await anilistRequest(
        TOGGLE_FAVOURITE_MUTATION,
        getMutationVariables(vars.kind, vars.id),
      );
      return vars;
    },
    async onMutate(vars) {
      const key = getDetailQueryKey(vars.kind, vars.id);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<FavouritableEntity>(key);

      queryClient.setQueryData<FavouritableEntity | undefined>(key, (old) => {
        if (!old) return old;
        const wasFavourite = Boolean(old.isFavourite);
        const delta =
          wasFavourite === vars.nextIsFavourite ? 0 : vars.nextIsFavourite ? 1 : -1;

        return {
          ...old,
          isFavourite: vars.nextIsFavourite,
          favourites:
            typeof old.favourites === 'number'
              ? Math.max(0, old.favourites + delta)
              : old.favourites,
        };
      });

      return { key, previous };
    },
    onError(_error, _vars, context) {
      if (context && context.previous !== undefined) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess(vars) {
      void queryClient.invalidateQueries({ queryKey: ['viewer'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      addToast({
        variant: 'success',
        message: vars.nextIsFavourite ? 'Added to favorites.' : 'Removed from favorites.',
      });
    },
  });
}
