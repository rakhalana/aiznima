import { Route, Routes } from 'react-router-dom';
import { AuthCallbackPage } from '@/features/auth/pages/AuthCallbackPage';
import { DiscoverPage } from '@/features/discover/pages/DiscoverPage';
import { MediaDetailPage } from '@/features/media/pages/MediaDetailPage';
import { MyListPage } from '@/features/my-list/pages/MyListPage';
import { ProfilePage } from '@/features/profile/pages/ProfilePage';
import { SchedulePage } from '@/features/schedule/pages/SchedulePage';
import { SearchPage } from '@/features/search/pages/SearchPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DiscoverPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/schedule" element={<SchedulePage />} />
      <Route path="/media/:id" element={<MediaDetailPage />} />
      <Route path="/my-list" element={<MyListPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/user/:username" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
