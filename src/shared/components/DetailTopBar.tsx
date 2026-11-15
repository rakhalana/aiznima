import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Share2 } from 'lucide-react';
import { copyTextToClipboard } from '@/platform';
import { useToastStore } from '@/shared/stores/useToastStore';

interface DetailTopBarProps {
  onBack: () => void;
  shareUrl?: string | null;
  hasBanner?: boolean;
}

const FLOATING_ICON_BUTTON_CLASS =
  'glass-pill pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-[var(--text-primary)] transition-crisp hover:bg-[var(--bg-surface)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40';

/**
 * Sticky top bar shared by detail pages: mirrored Back (left) and
 * icon-only Share (right) floating controls on both mobile and desktop.
 */
export function DetailTopBar({
  onBack,
  shareUrl,
  hasBanner = false,
}: DetailTopBarProps) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const isCopied = Boolean(shareUrl && copiedUrl === shareUrl);

  const handleShareClick = async () => {
    if (!shareUrl) return;
    const ok = await copyTextToClipboard(shareUrl);

    if (ok) {
      setCopiedUrl(shareUrl);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedUrl(null);
      }, 2000);
      addToast({
        variant: 'success',
        message: 'AniList link copied to clipboard.',
      });
      return;
    }

    addToast({
      variant: 'error',
      message: 'Unable to copy link.',
    });
  };

  return (
    <div
      className={`pointer-events-none sticky z-30 flex items-center justify-between ${
        hasBanner
          ? 'top-safe px-3 pt-3 md:top-[var(--desktop-nav-height)] md:px-4 md:pt-4'
          : 'top-safe-float mb-3 md:top-[calc(var(--desktop-nav-height)+1rem)] md:mb-4'
      }`}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className={FLOATING_ICON_BUTTON_CLASS}
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
      </button>

      {shareUrl ? (
        <button
          type="button"
          onClick={() => void handleShareClick()}
          aria-label={isCopied ? 'Copied link' : 'Share'}
          title={isCopied ? 'Copied' : 'Copy AniList link'}
          className={FLOATING_ICON_BUTTON_CLASS}
        >
          {isCopied ? (
            <Check className="h-4 w-4 text-[var(--success-text)]" strokeWidth={1.75} />
          ) : (
            <Share2 className="h-4 w-4" strokeWidth={1.75} />
          )}
        </button>
      ) : null}
    </div>
  );
}
