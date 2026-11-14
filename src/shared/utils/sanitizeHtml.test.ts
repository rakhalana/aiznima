import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitizeHtml';

describe('sanitizeHtml', () => {
  it('strips dangerous scripts, event attributes, and javascript links', () => {
    const dirty =
      '<p>Hello <b>World</b></p><script>alert(1)</script><img src=x onerror=alert(2) /><a href="javascript:alert(3)">Bad</a>';
    const clean = sanitizeHtml(dirty);

    expect(clean).toContain('<p>Hello <b>World</b></p>');
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('javascript:');
  });

  it('enforces safe external attributes on https links', () => {
    const html = '<a href="https://anilist.co/anime/1">Cowboy Bebop</a>';
    const clean = sanitizeHtml(html);

    expect(clean).toContain('target="_blank"');
    expect(clean).toContain('rel="noopener noreferrer"');
  });

  it('returns empty string for null or empty input', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
  });
});
