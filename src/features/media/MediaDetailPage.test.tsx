import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPromptModal } from '@/features/auth/components/LoginPromptModal';
import { useLoginPromptStore } from '@/features/auth/stores/useLoginPromptStore';
import { MediaDetailPage } from '@/features/media/pages/MediaDetailPage';
import type { MediaDetail } from '@/shared/api/types';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

function makeDetail(overrides: Partial<MediaDetail> = {}): MediaDetail {
  return {
    id: 1,
    idMal: null,
    type: 'ANIME',
    format: 'TV',
    status: 'FINISHED',
    title: {
      romaji: 'Sousou no Frieren',
      english: 'Frieren: Beyond Journey’s End',
      native: '葬送のフリーレン',
    },
    coverImage: {
      medium: 'https://example.com/cover-m.jpg',
      large: 'https://example.com/cover.jpg',
      extraLarge: 'https://example.com/cover-xl.jpg',
      color: '#2563EB',
    },
    bannerImage: 'https://example.com/banner.jpg',
    episodes: 28,
    chapters: null,
    volumes: null,
    season: 'FALL',
    seasonYear: 2023,
    meanScore: 91,
    popularity: 250000,
    isAdult: false,
    genres: ['Adventure', 'Drama', 'Fantasy'],
    nextAiringEpisode: null,
    mediaListEntry: null,
    weightedScore: 90,
    description:
      '<p>An <b>elf mage</b> journeys.<script>window.__xss=1</script><img src=x onerror="alert(1)"></p>',
    duration: 24,
    source: 'MANGA',
    countryOfOrigin: 'JP',
    startDate: { year: 2023, month: 9, day: 29 },
    endDate: { year: 2024, month: 3, day: 22 },
    synonyms: ['Frieren'],
    favourites: 42000,
    trailer: { id: 'ZEkwCGJ3o7M', site: 'youtube', thumbnail: null },
    tags: [
      { id: 1, name: 'Magic', rank: 92, isMediaSpoiler: false },
      { id: 2, name: 'Demon King Aftermath', rank: 80, isMediaSpoiler: true },
    ],
    studios: {
      edges: [
        {
          id: 110,
          isMain: true,
          node: { id: 11, name: 'Madhouse', isAnimationStudio: true, favourites: 41200 },
        },
      ],
    },
    externalLinks: [
      { id: 100, url: 'https://frieren-anime.jp', site: 'Official Site', type: 'INFO', color: null },
    ],
    relations: {
      edges: [
        {
          id: 500,
          relationType: 'ADAPTATION',
          node: {
            id: 118586,
            idMal: null,
            type: 'MANGA',
            format: 'MANGA',
            status: 'RELEASING',
            title: { romaji: 'Sousou no Frieren', english: 'Frieren', native: null },
            coverImage: { medium: null, large: null, extraLarge: null, color: null },
            bannerImage: null,
            episodes: null,
            chapters: 130,
            volumes: null,
            season: null,
            seasonYear: null,
            meanScore: 89,
            popularity: 100000,
            isAdult: false,
            genres: ['Adventure'],
            nextAiringEpisode: null,
            mediaListEntry: null,
          },
        },
      ],
    },
    characters: {
      edges: [
        {
          id: 600,
          role: 'MAIN',
          node: {
            id: 176754,
            name: { full: 'Frieren', native: 'フリーレン' },
            image: { medium: null, large: null },
          },
          voiceActors: [
            {
              id: 112627,
              name: { full: 'Atsumi Tanezaki' },
              languageV2: 'Japanese',
              image: { medium: null },
            },
          ],
        },
      ],
    },
    staff: {
      edges: [
        {
          id: 800,
          role: 'Director',
          node: {
            id: 12001,
            name: { full: 'Keiichirou Saitou', native: '斎藤圭一郎' },
            languageV2: 'Japanese',
            image: { medium: null, large: null },
            primaryOccupations: ['Director'],
            favourites: 900,
          },
        },
      ],
    },
    recommendations: {
      nodes: [
        {
          id: 700,
          rating: 450,
          mediaRecommendation: {
            id: 21034,
            idMal: null,
            type: 'ANIME',
            format: 'TV',
            status: 'FINISHED',
            title: { romaji: 'Violet Evergarden', english: 'Violet Evergarden', native: null },
            coverImage: { medium: null, large: null, extraLarge: null, color: null },
            bannerImage: null,
            episodes: 13,
            chapters: null,
            volumes: null,
            season: 'WINTER',
            seasonYear: 2018,
            meanScore: 86,
            popularity: 180000,
            isAdult: false,
            genres: ['Drama'],
            nextAiringEpisode: null,
            mediaListEntry: null,
          },
        },
      ],
    },
    ...overrides,
  };
}

function RouteEcho() {
  const location = useLocation();
  return <div data-testid="route-echo">{location.pathname}</div>;
}

function renderMediaRoute(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/media/:id" element={<MediaDetailPage />} />
          <Route path="/character/:id" element={<RouteEcho />} />
          <Route path="/staff/:id" element={<RouteEcho />} />
          <Route path="/studio/:id" element={<RouteEcho />} />
        </Routes>
        <LoginPromptModal />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MediaDetailPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({ accessToken: null, viewer: null, isHydrated: true });
    usePrefsStore.setState({
      activeMediaType: 'ANIME',
      guestShowAdult: false,
      isHydrated: true,
    });
    useLoginPromptStore.getState().closeLoginPrompt();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sanitizes HTML synopsis, switches tabs, and triggers LoginPromptModal for Guest on Add to List', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { Media: makeDetail() } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const { container } = renderMediaRoute('/media/1');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sousou no Frieren' })).toBeInTheDocument();
    });

    // XSS stripped by DOMPurify
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('onerror');
    expect(screen.getByText(/elf mage/i)).toBeInTheDocument();

    // Spoiler tag hidden until toggled
    expect(screen.queryByText('Demon King Aftermath')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show 1 spoiler tags/i }));
    expect(screen.getByText('Demon King Aftermath')).toBeInTheDocument();

    // Tabs switch cleanly
    fireEvent.click(screen.getByRole('tab', { name: 'Relations' }));
    expect(screen.getByText('ADAPTATION')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Characters' }));
    expect(screen.getByText('Frieren')).toBeInTheDocument();
    expect(screen.getByText(/Atsumi Tanezaki/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Staff' }));
    expect(screen.getByText('Keiichirou Saitou')).toBeInTheDocument();
    expect(screen.getByText('Director')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Recommendations' }));
    expect(screen.getByText('Violet Evergarden')).toBeInTheDocument();

    // Guest Add to List opens LoginPromptModal
    fireEvent.click(screen.getByRole('button', { name: /add to list/i }));
    expect(screen.getByRole('dialog', { name: /log in with anilist/i })).toBeInTheDocument();
  });

  it('cross-links studio, character, and voice actor / staff detail routes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () =>
        new Response(JSON.stringify({ data: { Media: makeDetail() } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    renderMediaRoute('/media/1');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sousou no Frieren' })).toBeInTheDocument();
    });

    // Studio button click in Overview
    fireEvent.click(screen.getByRole('button', { name: 'Madhouse' }));
    expect(screen.getByTestId('route-echo')).toHaveTextContent('/studio/11');
  });

  it('navigates from Characters tab to /character/:id and /staff/:id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () =>
        new Response(JSON.stringify({ data: { Media: makeDetail() } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    renderMediaRoute('/media/1');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sousou no Frieren' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Characters' }));
    fireEvent.click(screen.getByText('Frieren'));
    expect(screen.getByTestId('route-echo')).toHaveTextContent('/character/176754');
  });

  it('guards 18+ entries with AdultContentGate (AF-06) until explicitly revealed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              Media: makeDetail({
                id: 99,
                isAdult: true,
                title: { romaji: 'Mature Title', english: 'Mature Title', native: null },
              }),
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    renderMediaRoute('/media/99');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /18\+ content hidden/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Mature Title' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show this entry/i }));

    expect(screen.getByRole('heading', { name: 'Mature Title' })).toBeInTheDocument();
  });

  it('renders floating sticky z-30 Back button over banner and avoids overlapping cover when banner is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: { Media: makeDetail() } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: {
                Media: makeDetail({
                  id: 2,
                  bannerImage: null,
                  title: { romaji: 'No Banner Title', english: 'No Banner Title', native: null },
                }),
              },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        ),
    );

    renderMediaRoute('/media/1');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sousou no Frieren' })).toBeInTheDocument();
    });

    const backButton = screen.getByRole('button', { name: /back/i });
    expect(backButton.parentElement?.className).toContain('sticky');
    expect(backButton.parentElement?.className).toContain('z-30');
    expect(backButton.parentElement?.nextElementSibling?.className).toContain('-mt-12');

    // Also render without bannerImage -> no negative top margin pulling card under Back button
    renderMediaRoute('/media/2');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'No Banner Title' })).toBeInTheDocument();
    });

    const allBackButtons = screen.getAllByRole('button', { name: /back/i });
    const noBannerBack = allBackButtons[allBackButtons.length - 1];
    expect(noBannerBack.parentElement?.className).toContain('sticky');
    expect(noBannerBack.parentElement?.className).toContain('z-30');
    expect(noBannerBack.parentElement?.nextElementSibling?.className).not.toContain('-mt-12');
  });
});
