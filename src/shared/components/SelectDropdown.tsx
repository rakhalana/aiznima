import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface SelectDropdownProps<T extends string = string> {
  value: T;
  options: ReadonlyArray<SelectOption<T>>;
  onChange: (value: T) => void;
  label?: string;
  ariaLabel?: string;
  placeholder?: string;
  size?: 'sm' | 'md';
  surface?: 'canvas' | 'surface';
  disabled?: boolean;
  className?: string;
  menuMinWidth?: number;
}

interface MenuCoords {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  openUpward: boolean;
}

const MAX_MENU_HEIGHT = 272;
const VIEWPORT_PADDING = 8;
const MENU_OFFSET = 6;

export function SelectDropdown<T extends string = string>({
  value,
  options,
  onChange,
  label,
  ariaLabel,
  placeholder = 'Select...',
  size = 'md',
  surface = 'canvas',
  disabled = false,
  className = '',
  menuMinWidth = 0,
}: SelectDropdownProps<T>) {
  const triggerId = useId();
  const labelId = useId();
  const listboxId = useId();

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [coords, setCoords] = useState<MenuCoords>({
    top: 0,
    left: VIEWPORT_PADDING,
    width: 180,
    maxHeight: MAX_MENU_HEIGHT,
    openUpward: false,
  });

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const viewportW = window.innerWidth || 360;
    const viewportH = window.innerHeight || 768;

    const desiredWidth = Math.max(rect.width, menuMinWidth, 160);
    const width = Math.min(desiredWidth, viewportW - VIEWPORT_PADDING * 2);
    const left = Math.max(
      VIEWPORT_PADDING,
      Math.min(rect.left, viewportW - width - VIEWPORT_PADDING),
    );

    const spaceBelow = viewportH - rect.bottom - MENU_OFFSET - VIEWPORT_PADDING;
    const spaceAbove = rect.top - MENU_OFFSET - VIEWPORT_PADDING;
    const openUpward = spaceBelow < 200 && spaceAbove > spaceBelow;
    const availableSpace = Math.max(120, openUpward ? spaceAbove : spaceBelow);
    const maxHeight = Math.min(MAX_MENU_HEIGHT, availableSpace);

    setCoords(
      openUpward
        ? {
            bottom: viewportH - rect.top + MENU_OFFSET,
            left,
            width,
            maxHeight,
            openUpward: true,
          }
        : {
            top: rect.bottom + MENU_OFFSET,
            left,
            width,
            maxHeight,
            openUpward: false,
          },
    );
  }, [menuMinWidth]);

  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }

    updatePosition();
    const handleScroll = (event: Event) => {
      if (menuRef.current && event.target === menuRef.current) {
        return;
      }
      updatePosition();
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        (triggerRef.current && triggerRef.current.contains(target)) ||
        (menuRef.current && menuRef.current.contains(target))
      ) {
        return;
      }
      setOpen(false);
    };

    const handleCaptureKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      } else if (event.key === 'Tab') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleCaptureKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleCaptureKeyDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const activeEl = menuRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${highlightedIndex}"]`,
    );
    activeEl?.scrollIntoView?.({ block: 'nearest' });
  }, [open, highlightedIndex]);

  const openMenu = () => {
    if (disabled || options.length === 0) {
      return;
    }
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const selectOption = (nextValue: T) => {
    onChange(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled || options.length === 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        if (!open) {
          openMenu();
        } else {
          setHighlightedIndex((prev) => Math.min(options.length - 1, prev + 1));
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        if (!open) {
          openMenu();
        } else {
          setHighlightedIndex((prev) => Math.max(0, prev - 1));
        }
        break;
      }
      case 'Home': {
        if (open) {
          event.preventDefault();
          setHighlightedIndex(0);
        }
        break;
      }
      case 'End': {
        if (open) {
          event.preventDefault();
          setHighlightedIndex(options.length - 1);
        }
        break;
      }
      case 'Enter':
      case ' ': {
        if (open) {
          event.preventDefault();
          const chosen = options[highlightedIndex];
          if (chosen) {
            selectOption(chosen.value);
          }
        }
        break;
      }
      default:
        break;
    }
  };

  const isSmall = size === 'sm';
  const baseSurface =
    surface === 'surface' ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-canvas)]';

  const menuPortal =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={label ? labelId : undefined}
            aria-label={!label ? ariaLabel : undefined}
            style={{
              position: 'fixed',
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
              zIndex: 70,
            }}
            className={`animate-dropdown-in glass-floating overflow-y-auto rounded-xl p-1.5 ${
              coords.openUpward ? 'origin-bottom' : 'origin-top'
            }`}
          >
            <div className="space-y-0.5">
              {options.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-option-index={index}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => selectOption(option.value)}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left transition-crisp focus-visible:outline-none ${
                      isSmall ? 'text-xs' : 'text-sm'
                    } ${
                      isSelected
                        ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent-ink)]'
                        : isHighlighted
                          ? 'bg-[var(--bg-subtle)] font-medium text-[var(--text-primary)]'
                          : 'font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {isSelected ? (
                      <Check
                        className="h-4 w-4 shrink-0 text-[var(--accent-primary)]"
                        strokeWidth={2.25}
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label ? (
        <label
          id={labelId}
          htmlFor={triggerId}
          className="block text-xs font-semibold text-[var(--text-secondary)]"
        >
          {label}
        </label>
      ) : null}

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-labelledby={label ? labelId : undefined}
        aria-label={!label ? ariaLabel : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-[10px] border text-left transition-crisp disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:border-[var(--accent-primary)] focus-visible:ring-2 focus-visible:ring-blue-500/20 ${
          isSmall ? 'h-9 px-3 text-xs font-semibold' : 'h-10 px-3 text-sm font-medium'
        } ${
          open
            ? 'border-[var(--accent-primary)] bg-[var(--bg-surface)] shadow-token-sm ring-2 ring-blue-500/20'
            : `${baseSurface} border-[var(--border-hairline)] shadow-token-xs hover:border-[var(--border-strong)]`
        }`}
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            selectedOption ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
          }`}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-150 ${
            open
              ? 'rotate-180 text-[var(--accent-primary)]'
              : 'text-[var(--text-muted)]'
          }`}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>

      {menuPortal}
    </div>
  );
}
