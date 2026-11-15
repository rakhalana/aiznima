import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MyListPage } from '@/features/my-list/pages/MyListPage';
import type { MediaListEntry, UserProfile } from '@/shared/api/types';
import { ToastViewport } from '@/shared/components/ToastViewport';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';
import { useToastStore } from '@/shared/stores/useToastStore';

function makeViewer(scoreFormat: 'POINT_100' | 'POINT_3' = 'POINT_100'): UserProfile {
  return {
    id: 42,
    name: 'RakhaDev',
    about: null,
    avatar: null,
    bannerImage: null,
    siteUrl: null,
    options: { titleLanguage: 'ROMAJI', displayAdultContent: false, profileColor: 'blue' },
    mediaListOptions: { scoreFormat, rowOrder: 'score' },
    statistics: null,
    favourites: null,
  };
}

function makeEntry(overrides: Partial<MediaListEntry> = {}): MediaListEntry {
  return {
    id: 1001,
    mediaId: 1,
    status: 'CURRENT',
    score: 85,
    progress: 4,
    progressVolumes: 0,
    repeat: 0,
    private: false,
    notes: 'Great animation',
    startedAt: { year: 2026, month: 1, day: 5 },
    completedAt: null,
    updatedAt: 1700000000,
    media: {
      id: 1,
      idMal: null,
      type: 'ANIME',
      format: 'TV',
      status: 'RELEASING',
      title: { romaji: 'Frieren', english: 'Frieren', native: null },
      coverImage: { medium: null, large: 'https://example.com/1.jpg', extraLarge: null, color: null },
      bannerImage: null,
      episodes: 28,
      chapters: null,
      volumes: null,
      season: 'FALL',
      seasonYear: 2023,
      meanScore: 91,
      popularity: 100000,
      genres: ['Fantasy'],
      isAdult: false,
      nextAiringEpisode: null,
      mediaListEntry: null,
    },
    ...overrides,
  };
}

function renderMyList() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/my-list']}>
        <MyListPage />
        <ToastViewport />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MyListPage & ListEditorModal', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useToastStore.setState({ toasts: [], rateLimitUntil: null, isOffline: false });
    usePrefsStore.setState({
      activeMediaType: 'ANIME',
      guestShowAdult: false,
      isHydrated: true,
    });
    useAuthStore.setState({
      accessToken: 'valid-token',
      expiresAt: Date.now() + 60_000,
      viewer: makeViewer(),
      isHydrated: true,
      sessionExpiredFlag: false,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('optimistically increments progress (+1) and reverts when Toast Undo is clicked', async () => {
    let serverProgress = 4;
    const fetchMock = vi.fn().mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: { progress?: number };
      };

      if (body.query?.includes('SaveListEntry')) {
        serverProgress = body.variables?.progress ?? serverProgress;
        return new Response(
          JSON.stringify({
            data: { SaveMediaListEntry: makeEntry({ progress: serverProgress }) },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          data: {
            MediaListCollection: {
              hasNextChunk: false,
              lists: [
                {
                  name: 'Watching',
                  isCustomList: false,
                  status: 'CURRENT',
                  entries: [makeEntry({ progress: serverProgress })],
                },
              ],
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    renderMyList();

    await waitFor(() => {
      expect(screen.getByText('4 / 28 ep')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /increment progress for frieren/i }));

    // Optimistic update displays immediately
    await waitFor(() => {
      expect(screen.getByText('5 / 28 ep')).toBeInTheDocument();
    });

    // Toast displays Undo button
    const undoBtn = await screen.findByRole('button', { name: 'Undo' });
    fireEvent.click(undoBtn);

    await waitFor(() => {
      expect(screen.getByText('4 / 28 ep')).toBeInTheDocument();
    });
    expect(serverProgress).toBe(4);
  });

  it('edits with dynamic ScoreFormat (POINT_3), preserves draft on 401 (AF-02), and deletes on confirmation', async () => {
    useAuthStore.setState({ viewer: makeViewer('POINT_3') });
    let failWith401 = true;

    const fetchMock = vi.fn().mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };

      if (body.query?.includes('SaveListEntry')) {
        if (failWith401) {
          return new Response(JSON.stringify({ errors: [{ message: 'Invalid token' }] }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(
          JSON.stringify({ data: { SaveMediaListEntry: makeEntry({ score: 3 }) } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (body.query?.includes('DeleteListEntry')) {
        return new Response(
          JSON.stringify({ data: { DeleteMediaListEntry: { deleted: true } } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          data: {
            MediaListCollection: {
              hasNextChunk: false,
              lists: [
                {
                  name: 'Watching',
                  isCustomList: false,
                  status: 'CURRENT',
                  entries: [makeEntry({ score: 2 })],
                },
              ],
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    renderMyList();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByRole('dialog', { name: /edit list entry/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/rating \(1 – 3\)/i)).toBeInTheDocument();
    const episodesInput = screen.getByLabelText(/episodes/i);
    const rewatchesInput = screen.getByLabelText(/total rewatches/i);
    const episodesField = episodesInput.closest('div.min-w-0');
    const rowContainer = rewatchesInput.closest('div.grid');
    expect(rowContainer).toBe(episodesField?.parentElement);
    expect(rowContainer).toHaveClass('sm:grid-cols-2');
    expect(episodesField).not.toHaveClass('col-span-2');

    const notesBox = screen.getByPlaceholderText(/personal notes/i);
    fireEvent.change(notesBox, { target: { value: 'Unsaved masterpiece note' } });

    // Trigger 401 on save -> modal + draft stay intact (AF-02)
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    const dialog = screen.getByRole('dialog', { name: /edit list entry/i });
    await waitFor(() => {
      expect(
        within(dialog).getByText(/log in again below without closing this editor/i),
      ).toBeInTheDocument();
    });
    expect(notesBox).toHaveValue('Unsaved masterpiece note');

    // Re-authenticate & delete with 2-step confirmation
    failWith401 = false;
    useAuthStore.setState({ accessToken: 'fresh-token', sessionExpiredFlag: false });

    fireEvent.click(within(dialog).getByRole('button', { name: /delete entry/i }));
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm delete/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /edit list entry/i })).not.toBeInTheDocument();
    });
  });

  it('toggles between 2-col grid view and left-poster row view beside filter input', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              MediaListCollection: {
                hasNextChunk: false,
                lists: [
                  {
                    name: 'Watching',
                    isCustomList: false,
                    status: 'CURRENT',
                    entries: [makeEntry()],
                  },
                ],
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    renderMyList();

    expect(await screen.findByText('Frieren')).toBeInTheDocument();

    const card = screen.getByText('Frieren').closest('article');
    expect(card).toHaveClass('flex-col');

    fireEvent.click(screen.getByRole('button', { name: /switch to row view/i }));
    expect(usePrefsStore.getState().listViewMode).toBe('list');
    expect(screen.getByRole('button', { name: /switch to grid view/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(card).toHaveClass('flex-row');
  });

  it('merges hasNextChunk collection pages, displays airing/behind badges, and supports full-width mobile sort & format controls', async () => {
    const futureSec = Math.floor(Date.now() / 1000) + 5 * 3600;
    const chunk1Entry = makeEntry({
      id: 2001,
      mediaId: 101,
      score: 75,
      progress: 4,
      media: {
        ...makeEntry().media,
        id: 101,
        format: 'TV',
        status: 'RELEASING',
        episodes: 24,
        title: { romaji: 'Blue Box', english: 'Blue Box', native: null },
        nextAiringEpisode: { id: 1201, episode: 12, airingAt: futureSec, timeUntilAiring: 5 * 3600 },
      },
    });
    const chunk2Entry = makeEntry({
      id: 2002,
      mediaId: 102,
      score: 95,
      progress: 1,
      media: {
        ...makeEntry().media,
        id: 102,
        format: 'MOVIE',
        status: 'FINISHED',
        episodes: 1,
        title: { romaji: 'A Silent Voice', english: 'A Silent Voice', native: null },
        nextAiringEpisode: null,
      },
    });

    const fetchMock = vi.fn().mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        variables?: { chunk?: number };
      };
      if (body.variables?.chunk === 2) {
        return new Response(
          JSON.stringify({
            data: {
              MediaListCollection: {
                hasNextChunk: false,
                lists: [
                  {
                    name: 'Watching',
                    isCustomList: false,
                    status: 'CURRENT',
                    entries: [chunk2Entry],
                  },
                ],
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          data: {
            MediaListCollection: {
              hasNextChunk: true,
              lists: [
                {
                  name: 'Watching',
                  isCustomList: false,
                  status: 'CURRENT',
                  entries: [chunk1Entry],
                },
              ],
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    renderMyList();

    expect(await screen.findByText('Blue Box')).toBeInTheDocument();
    expect(screen.getByText('A Silent Voice')).toBeInTheDocument();
    expect(screen.getByText(/Ep 12 in/i)).toBeInTheDocument();
    expect(screen.getByText('Behind 7 ep')).toBeInTheDocument();

    // Airing / Behind filter pill is removed; Sort & Format share full mobile width in one row
    expect(screen.queryByRole('button', { name: /airing \/ behind/i })).not.toBeInTheDocument();
    const sortCombobox = screen.getByRole('combobox', { name: 'Sort list entries' });
    const formatCombobox = screen.getByRole('combobox', { name: 'Filter by format' });
    expect(sortCombobox.parentElement).toHaveClass('min-w-0', 'flex-1', 'md:min-w-[156px]', 'md:flex-none');
    expect(formatCombobox.parentElement).toHaveClass('min-w-0', 'flex-1', 'md:min-w-[132px]', 'md:flex-none');
    expect(sortCombobox.parentElement?.parentElement).toHaveClass('flex', 'w-full', 'items-center', 'md:w-auto');

    // Filter by Movie format -> only A Silent Voice remains
    fireEvent.click(formatCombobox);
    fireEvent.click(screen.getByRole('option', { name: 'Movie' }));
    expect(screen.getByText('A Silent Voice')).toBeInTheDocument();
    expect(screen.queryByText('Blue Box')).not.toBeInTheDocument();

    // Reset format & sort by Title A-Z
    fireEvent.click(formatCombobox);
    fireEvent.click(screen.getByRole('option', { name: 'All Formats' }));
    fireEvent.click(sortCombobox);
    fireEvent.click(screen.getByRole('option', { name: 'Title A–Z' }));

    const headings = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);
    expect(headings).toEqual(['A Silent Voice', 'Blue Box']);
  });
});
