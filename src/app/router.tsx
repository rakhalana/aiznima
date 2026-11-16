import { Suspense, lazy, type ComponentType } from 'react';
import { Loader2 } from 'lucide-react';
import { Route, Routes } from 'react-router-dom';
import { DiscoverPage } from '@/features/discover/pages/DiscoverPage';
import { NotFoundPage } from './pages/NotFoundPage';

function lazyPage<
  TModule extends Record<string, unknown>,
  TKey extends keyof TModule,
>(loader: () => Promise<TModule>, exportName: TKey) {
  return lazy(async () => {
    const mod = await loader();
    return { default: mod[exportName] as ComponentType };
  });
}

const RecommendedPage = lazyPage(
  () => import('@/features/discover/pages/RecommendedPage'),
  'RecommendedPage',
);
const SeasonalPage = lazyPage(
  () => import('@/features/discover/pages/SeasonalPage'),
  'SeasonalPage',
);
const SearchPage = lazyPage(
  () => import('@/features/search/pages/SearchPage'),
  'SearchPage',
);
const SchedulePage = lazyPage(
  () => import('@/features/schedule/pages/SchedulePage'),
  'SchedulePage',
);
const MediaDetailPage = lazyPage(
  () => import('@/features/media/pages/MediaDetailPage'),
  'MediaDetailPage',
);
const CharacterDetailPage = lazyPage(
  () => import('@/features/character/pages/CharacterDetailPage'),
  'CharacterDetailPage',
);
const StaffDetailPage = lazyPage(
  () => import('@/features/staff/pages/StaffDetailPage'),
  'StaffDetailPage',
);
const StudioDetailPage = lazyPage(
  () => import('@/features/studio/pages/StudioDetailPage'),
  'StudioDetailPage',
);
const MyListPage = lazyPage(
  () => import('@/features/my-list/pages/MyListPage'),
  'MyListPage',
);
const NotificationsPage = lazyPage(
  () => import('@/features/notifications/pages/NotificationsPage'),
  'NotificationsPage',
);
const ProfilePage = lazyPage(
  () => import('@/features/profile/pages/ProfilePage'),
  'ProfilePage',
);
const PublicUserPage = lazyPage(
  () => import('@/features/user/pages/PublicUserPage'),
  'PublicUserPage',
);
const SettingsPage = lazyPage(
  () => import('@/features/settings/pages/SettingsPage'),
  'SettingsPage',
);
const AuthCallbackPage = lazyPage(
  () => import('@/features/auth/pages/AuthCallbackPage'),
  'AuthCallbackPage',
);

function RouteLoadingFallback() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="flex min-h-[45vh] items-center justify-center"
    >
      <Loader2
        className="h-6 w-6 animate-spin text-[var(--accent-primary)]"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className="sr-only">Loading page...</span>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/" element={<DiscoverPage />} />
        <Route path="/discover/recommended" element={<RecommendedPage />} />
        <Route path="/discover/seasonal" element={<SeasonalPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/media/:id" element={<MediaDetailPage />} />
        <Route path="/character/:id" element={<CharacterDetailPage />} />
        <Route path="/staff/:id" element={<StaffDetailPage />} />
        <Route path="/studio/:id" element={<StudioDetailPage />} />
        <Route path="/my-list" element={<MyListPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/user/:username" element={<PublicUserPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
