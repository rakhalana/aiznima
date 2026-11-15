interface BrandLogoProps {
  className?: string;
  variant?: 'brand' | 'mono';
  title?: string;
}

const UPPER_FOLD_PATH =
  'M 8 53 L 27.5 11 L 36.5 11 L 46.25 32 L 37.5 32 L 32 20.1 L 16.8 53 Z';
const KEYSTONE_FOLD_PATH =
  'M 28.6 36.2 L 48.2 36.2 L 56 53 L 47.2 53 L 42.7 43.2 L 25.4 43.2 Z';

/** Geometric Origami Fold monogram for Aiznima. */
export function BrandLogo({
  className = 'h-7 w-7',
  variant = 'brand',
  title,
}: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d={UPPER_FOLD_PATH} fill="currentColor" />
      <path
        d={KEYSTONE_FOLD_PATH}
        fill={variant === 'mono' ? 'currentColor' : 'var(--accent-primary)'}
      />
    </svg>
  );
}
