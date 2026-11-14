import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] border border-transparent shadow-token-xs',
  secondary:
    'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] shadow-token-xs',
  ghost:
    'bg-transparent text-[var(--text-secondary)] border border-transparent hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
  danger:
    'bg-[var(--error-bg)] text-[var(--error-text)] border border-red-200/60 dark:border-red-900/40 hover:opacity-90',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-xs rounded-lg gap-1.5',
  md: 'min-h-11 px-4 text-sm rounded-[10px] gap-2',
  lg: 'min-h-12 px-5 text-sm rounded-[10px] gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-semibold transition-crisp active:scale-[0.98] disabled:opacity-55 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" />
      ) : (
        leftIcon
      )}
      {children}
    </button>
  );
}
