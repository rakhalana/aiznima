import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

describe('Aiznima App root', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the responsive AppShell and Discover page', async () => {
    render(<App />);
    await waitFor(() => {
      expect(useAuthStore.getState().isHydrated).toBe(true);
      expect(usePrefsStore.getState().isHydrated).toBe(true);
    });
    expect(screen.getAllByText('Aiznima').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /discover/i })).toBeInTheDocument();
  });
});
