import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';
import { MediaCard } from './MediaCard';
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
});
