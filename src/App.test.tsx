import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('Aiznima scaffold', () => {
  it('renders the application shell title and phase badge', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /aiznima/i })).toBeInTheDocument();
    expect(screen.getByText(/phase 2 core ready/i)).toBeInTheDocument();
  });
});
