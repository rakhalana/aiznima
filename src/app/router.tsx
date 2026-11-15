import { Route, Routes } from 'react-router-dom';
import { AuthCallbackPage } from '@/features/auth/pages/AuthCallbackPage';
import { CharacterDetailPage } from '@/features/character/pages/CharacterDetailPage';
import { DiscoverPage } from '@/features/discover/pages/DiscoverPage';
import { RecommendedPage } from '@/features/discover/pages/RecommendedPage';
import { SeasonalPage } from '@/features/discover/pages/SeasonalPage';
import { MediaDetailPage } from '@/features/media/pages/MediaDetailPage';
import { MyListPage } from '@/features/my-list/pages/MyListPage';
import { NotificationsPage } from '@/features/notifications/pages/NotificationsPage';
import { ProfilePage } from '@/features/profile/pages/ProfilePage';
import { SchedulePage } from '@/features/schedule/pages/SchedulePage';
import { SearchPage } from '@/features/search/pages/SearchPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { StaffDetailPage } from '@/features/staff/pages/StaffDetailPage';
import { StudioDetailPage } from '@/features/studio/pages/StudioDetailPage';
import { PublicUserPage } from '@/features/user/pages/PublicUserPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function AppRoutes() {
  return (
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
  );
}
