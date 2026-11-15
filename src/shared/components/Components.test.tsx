import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BottomSheetOrModal } from './BottomSheetOrModal';
import { ErrorBoundary } from './ErrorBoundary';
import { MediaCard } from './MediaCard';
import { SelectDropdown } from './SelectDropdown';
import { EmptyState, ErrorState } from './StateFeedback';
import type { MediaSummary } from '@/shared/api/types';

const SAMPLE_MEDIA: MediaSummary = {
  id: 1,
  idMal: 1,
  type: 'ANIME',
  format: 'TV',
  status: 'FINISHED',
  title: { romaji: 'Cowboy Bebop', english: 'Cowboy Bebop', native: 'カウボーイビバップ' },
  coverImage: {
    extraLarge: null,
    large: 'https://example.com/broken.jpg',
    medium: null,
    color: null,
  },
  bannerImage: null,
  episodes: 26,
  chapters: null,
  volumes: null,
  season: 'SPRING',
  seasonYear: 1998,
  meanScore: 86,
  popularity: 100000,
  genres: ['Action', 'Sci-Fi'],
  isAdult: false,
  nextAiringEpisode: null,
  mediaListEntry: null,
};

describe('shared UI components', () => {
  it('renders MediaCard and falls back cleanly on broken cover image (AF-07)', () => {
    const onSelect = vi.fn();
    render(<MediaCard media={SAMPLE_MEDIA} onSelect={onSelect} />);

    expect(screen.getByText('Cowboy Bebop')).toBeInTheDocument();
    expect(screen.getByText('86%')).toBeInTheDocument();

    const img = screen.getByRole('img', { name: 'Cowboy Bebop' });
    fireEvent.error(img);
    expect(screen.getByTestId('media-cover-fallback')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(SAMPLE_MEDIA);
  });

  it('renders upcoming episode countdown line on airing MediaCard without cluttering cover', () => {
    const futureSec = Math.floor(Date.now() / 1000) + 2 * 86400 + 3 * 3600;
    render(
      <MediaCard
        media={{
          ...SAMPLE_MEDIA,
          status: 'RELEASING',
          nextAiringEpisode: {
            id: 901,
            episode: 9,
            airingAt: futureSec,
            timeUntilAiring: 2 * 86400 + 3 * 3600,
          },
        }}
      />,
    );

    expect(screen.getByText(/Ep 9 in 2d/i)).toBeInTheDocument();
  });

  it('renders EmptyState and ErrorState with actionable CTAs', () => {
    const onReset = vi.fn();
    const onRetry = vi.fn();

    render(
      <>
        <EmptyState
          title="No results found"
          description="Try clearing filters."
          actionLabel="Reset Filters"
          onAction={onReset}
        />
        <ErrorState
          message="Rate limit hit"
          showingCached
          onRetry={onRetry}
        />
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: /reset filters/i }));
    expect(onReset).toHaveBeenCalledTimes(1);

    expect(screen.getByText(/showing cached data/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('catches rendering crashes in ErrorBoundary', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function BrokenChild(): never {
      throw new Error('Boom');
    }

    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload app/i })).toBeInTheDocument();
    spy.mockRestore();
  });

  it('renders custom SelectDropdown trigger & portal listbox with keyboard and modal Escape isolation', () => {
    const onChange = vi.fn();
    const onCloseModal = vi.fn();

    render(
      <BottomSheetOrModal open onClose={onCloseModal} title="Test Modal">
        <SelectDropdown
          label="Sort By"
          value="TRENDING_DESC"
          options={[
            { value: 'TRENDING_DESC', label: 'Trending' },
            { value: 'POPULARITY_DESC', label: 'Most Popular' },
            { value: 'SCORE_DESC', label: 'Highest Score' },
          ]}
          onChange={onChange}
        />
      </BottomSheetOrModal>,
    );

    const combobox = screen.getByLabelText('Sort By');
    expect(combobox).toHaveAttribute('role', 'combobox');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(combobox).toHaveTextContent('Trending');

    // Open dropdown portal
    fireEvent.click(combobox);
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox', { name: 'Sort By' });
    expect(listbox).toBeInTheDocument();

    const selectedOpt = screen.getByRole('option', { name: 'Trending' });
    expect(selectedOpt).toHaveAttribute('aria-selected', 'true');

    // Pressing Escape closes dropdown without closing parent modal
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onCloseModal).not.toHaveBeenCalled();

    // Open via ArrowDown and pick option via keyboard
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    fireEvent.keyDown(combobox, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('POPULARITY_DESC');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
