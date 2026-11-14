import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const COLLAPSED_HTML_HEIGHT = 112;

interface CollapsibleHtmlSectionProps {
  title: string;
  html: string;
  className?: string;
}

/**
 * Renders sanitized HTML content inside a height-clamped card that expands on
 * text tap or clicking the Read more / Show less toggle button.
 */
export function CollapsibleHtmlSection({
  title,
  html,
  className = 'p-4 md:p-5',
}: CollapsibleHtmlSectionProps) {
  const plainLength = useMemo(
    () => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().length,
    [html],
  );
  const lineBreakCount = useMemo(
    () => (html.match(/<(?:p|br)\b/gi) ?? []).length,
    [html],
  );

  const [expanded, setExpanded] = useState(false);
  const [canCollapse, setCanCollapse] = useState(
    () => plainLength > 200 || lineBreakCount >= 3,
  );
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setExpanded(false);
    setCanCollapse(plainLength > 200 || lineBreakCount >= 3);
  }, [html, plainLength, lineBreakCount]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) {
      return undefined;
    }

    const measure = () => {
      if (el.scrollHeight > 0) {
        setCanCollapse(el.scrollHeight > COLLAPSED_HTML_HEIGHT + 4);
      }
    };

    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    }
    return undefined;
  }, [html]);

  const isClamped = canCollapse && !expanded;

  return (
    <section
      className={`rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-token-xs ${className}`}
    >
      <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
      <div
        onClick={(event) => {
          if (isClamped && !(event.target as HTMLElement).closest('a')) {
            setExpanded(true);
          }
        }}
        className={`relative ${isClamped ? 'max-h-28 cursor-pointer overflow-hidden' : ''}`}
      >
        <div
          ref={contentRef}
          className="prose-sm max-w-none space-y-2 text-sm leading-relaxed text-[var(--text-secondary)] [&_a]:text-[var(--accent-primary)] [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {isClamped ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--bg-surface)] to-transparent"
          />
        ) : null}
      </div>

      {canCollapse ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-2 inline-flex items-center gap-1 rounded text-xs font-semibold text-[var(--accent-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <span>{expanded ? 'Show less' : 'Read more'}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      ) : null}
    </section>
  );
}
