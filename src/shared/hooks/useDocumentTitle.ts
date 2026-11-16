import { useEffect } from 'react';

export const DEFAULT_DOCUMENT_TITLE = 'Aiznima — Unofficial AniList Client';

/**
 * Updates `document.title` for the active route and resets it on unmount.
 */
export function useDocumentTitle(pageTitle?: string | null): void {
  useEffect(() => {
    const trimmed = pageTitle?.trim();
    document.title = trimmed ? `${trimmed} — Aiznima` : DEFAULT_DOCUMENT_TITLE;

    return () => {
      document.title = DEFAULT_DOCUMENT_TITLE;
    };
  }, [pageTitle]);
}
