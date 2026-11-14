import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

describe('Aiznima App root', () => {
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
