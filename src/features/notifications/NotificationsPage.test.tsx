import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsPage } from '@/features/notifications/pages/NotificationsPage';
import * as platform from '@/platform';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

function RouteEcho() {
  const location = useLocation();
  return <div data-testid="route-echo">{location.pathname}</div>;
}

function renderNotificationsRoute() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/notifications']}>
        <Routes>
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/media/:id" element={<RouteEcho />} />
          <Route path="/user/:username" element={<RouteEcho />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    usePrefsStore.setState({ activeMediaType: 'ANIME', guestShowAdult: false, isHydrated: true });
    useAuthStore.setState({
      accessToken: null,
      expiresAt: null,
      viewer: null,
      isHydrated: true,
      sessionExpiredFlag: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows AniList login prompt when signed out', () => {
    renderNotificationsRoute();

    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login with anilist/i })).toBeInTheDocument();
  });

  it('renders notifications, filters categories, and navigates on click without a Mark all read button', async () => {
    const openExternalSpy = vi.spyOn(platform, 'openExternalUrl').mockResolvedValue();

    useAuthStore.setState({
      accessToken: 'notif-token',
      isHydrated: true,
      viewer: {
        id: 1,
        name: 'Tester',
        about: null,
        avatar: null,
        bannerImage: null,
        siteUrl: null,
        unreadNotificationCount: 2,
        options: null,
        mediaListOptions: null,
        statistics: null,
      },
    });

    const nowSec = Math.floor(Date.now() / 1000);
    let unreadCount = 2;

    const allNotifications = [
      {
        id: 11,
        type: 'AIRING',
        animeId: 154587,
        episode: 12,
        contexts: ['Episode ', ' of ', ' aired.'],
        createdAt: nowSec - 1800,
        media: {
          id: 154587,
          type: 'ANIME',
          isAdult: false,
          siteUrl: 'https://anilist.co/anime/154587',
          title: { romaji: 'Sousou no Frieren', english: 'Frieren', native: null },
          coverImage: { medium: null, large: null, color: null },
        },
      },
      {
        id: 12,
        type: 'FOLLOWING',
        userId: 88,
        context: 'started following you',
        createdAt: nowSec - 7200,
        user: { id: 88, name: 'FernChan', avatar: null },
      },
      {
        id: 13,
        type: 'ACTIVITY_REPLY',
        userId: 99,
        activityId: 555,
        context: 'replied to your activity',
        createdAt: nowSec - 86400,
        user: { id: 99, name: 'Stark', avatar: null },
        activity: { siteUrl: 'https://anilist.co/activity/555' },
      },
    ];

    const fetchMock = vi.fn().mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: { types?: string[]; resetNotificationCount?: boolean };
      };

      if (body.query?.includes('UnreadNotificationCount')) {
        return new Response(
          JSON.stringify({ data: { Viewer: { id: 1, unreadNotificationCount: unreadCount } } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (body.variables?.resetNotificationCount) {
        unreadCount = 0;
        return new Response(
          JSON.stringify({
            data: {
              Page: {
                pageInfo: { total: 1, perPage: 1, currentPage: 1, lastPage: 1, hasNextPage: false },
                notifications: [],
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const filtered = body.variables?.types?.length
        ? allNotifications.filter((item) => body.variables?.types?.includes(item.type))
        : allNotifications;

      return new Response(
        JSON.stringify({
          data: {
            Page: {
              pageInfo: {
                total: filtered.length,
                perPage: 25,
                currentPage: 1,
                lastPage: 1,
                hasNextPage: false,
              },
              notifications: filtered,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    renderNotificationsRoute();

    expect(await screen.findByText('Episode 12 aired')).toBeInTheDocument();
    expect(screen.getByText('2 unread')).toBeInTheDocument();
    expect(screen.getByText('started following you')).toBeInTheDocument();
    expect(screen.getByText('replied to your activity')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Unread notification')).toHaveLength(2);

    // Clicking activity notification opens AniList URL externally
    fireEvent.click(screen.getByText('replied to your activity'));
    expect(openExternalSpy).toHaveBeenCalledWith('https://anilist.co/activity/555');

    expect(screen.queryByRole('button', { name: /mark all read/i })).not.toBeInTheDocument();

    // Filter to Airing only
    fireEvent.click(screen.getByRole('tab', { name: 'Airing' }));
    expect(await screen.findByText('Episode 12 aired')).toBeInTheDocument();
    expect(screen.queryByText('started following you')).not.toBeInTheDocument();
    expect(screen.queryAllByLabelText('Unread notification')).toHaveLength(0);

    // Clicking Airing notification navigates to /media/:id
    fireEvent.click(screen.getByText('Episode 12 aired'));
    await waitFor(() => {
      expect(screen.getByTestId('route-echo')).toHaveTextContent('/media/154587');
    });
  });
});
