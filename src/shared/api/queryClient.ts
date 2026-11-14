import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/shared/stores/useToastStore';
import {
  AniListApiError,
  NetworkError,
  RateLimitError,
  UnauthorizedError,
} from './graphqlClient';

function notifyRateLimit(error: unknown): void {
  if (error instanceof RateLimitError) {
    useToastStore.getState().addToast({
      variant: 'warning',
      message: `Too many requests. Please wait ${error.retryAfterSeconds}s.`,
      durationMs: 5000,
    });
  }
}

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError(error) {
        notifyRateLimit(error);
        if (error instanceof NetworkError) {
          useToastStore.getState().setIsOffline(true);
        }
      },
    }),
    mutationCache: new MutationCache({
      onError(error) {
        if (error instanceof RateLimitError) {
          notifyRateLimit(error);
          return;
        }
        if (error instanceof UnauthorizedError) {
          useToastStore.getState().addToast({
            variant: 'error',
            message: 'Session expired. Log in again to save your changes.',
            durationMs: 5000,
          });
          return;
        }
        if (error instanceof NetworkError) {
          useToastStore.getState().setIsOffline(true);
          useToastStore.getState().addToast({
            variant: 'error',
            message: error.message,
          });
          return;
        }
        if (error instanceof AniListApiError) {
          useToastStore.getState().addToast({
            variant: 'error',
            message: error.message,
          });
          return;
        }
        useToastStore.getState().addToast({
          variant: 'error',
          message: 'Something went wrong while saving changes.',
        });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry(failureCount, error) {
          if (
            error instanceof RateLimitError ||
            error instanceof UnauthorizedError ||
            error instanceof AniListApiError
          ) {
            return false;
          }
          return failureCount < 1;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export const queryClient = createAppQueryClient();
