import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('Aiznima Phase 1 scaffold', () => {
  it('renders the application shell title and status badge', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /aiznima/i })).toBeInTheDocument();
    expect(screen.getByText(/phase 1 ready/i)).toBeInTheDocument();
  });
});
