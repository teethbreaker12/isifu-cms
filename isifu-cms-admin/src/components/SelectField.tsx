import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEventHandler } from 'react';
import { createPortal } from 'react-dom';

export type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  autoFocus?: boolean;
  onMouseUp?: MouseEventHandler<HTMLButtonElement>;
};

type PanelPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export function SelectField({
  value,
  options,
  onChange,
  placeholder = '',
  disabled = false,
  ariaLabel,
  className = '',
  buttonClassName = '',
  autoFocus = false,
  onMouseUp,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const selectedIndex = useMemo(() => options.findIndex((option) => option.value === value), [options, value]);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

  useEffect(() => {
    if (autoFocus) buttonRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePanelPosition = () => {
      const trigger = buttonRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 8;
      const gap = 6;
      const minWidth = 192;
      const desiredWidth = Math.max(rect.width, minWidth);
      const width = Math.min(desiredWidth, window.innerWidth - viewportPadding * 2);
      const left = Math.min(Math.max(rect.left, viewportPadding), window.innerWidth - width - viewportPadding);
      const below = window.innerHeight - rect.bottom - viewportPadding - gap;
      const above = rect.top - viewportPadding - gap;
      const openBelow = below >= 120 || below >= above;
      const availableHeight = Math.max(openBelow ? below : above, 120);
      const maxHeight = Math.min(288, availableHeight);
      const top = openBelow
        ? Math.min(rect.bottom + gap, window.innerHeight - maxHeight - viewportPadding)
        : Math.max(viewportPadding, rect.top - gap - maxHeight);

      setPanelPosition({ top, left, width, maxHeight });
    };

    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
    setActiveIndex(options.length ? nextIndex : -1);
    window.requestAnimationFrame(() => optionRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' }));
  }, [open, selectedIndex, options.length]);

  function choose(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      return;
    }

    if (!open) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => {
        const fallback = selectedIndex >= 0 ? selectedIndex : 0;
        const next = options.length ? (current < 0 ? fallback : (current + direction + options.length) % options.length) : -1;
        window.requestAnimationFrame(() => optionRefs.current[next]?.scrollIntoView({ block: 'nearest' }));
        return next;
      });
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) choose(option.value);
    }
  }

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          className="select-field__panel"
          role="listbox"
          aria-label={ariaLabel}
          style={
            {
              top: panelPosition?.top ?? 0,
              left: panelPosition?.left ?? 0,
              width: panelPosition?.width,
              maxHeight: panelPosition?.maxHeight,
              visibility: panelPosition ? 'visible' : 'hidden',
            } as CSSProperties
          }
        >
          {options.map((option, index) => {
            const selected = option.value === value;
            const active = index === activeIndex;
            return (
              <button
                key={`${option.value}-${index}`}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                type="button"
                className={`select-field__option ${selected ? 'select-field__option--selected' : ''} ${active ? 'select-field__option--active' : ''}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option.value)}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {selected && <Check size={15} aria-hidden="true" />}
              </button>
            );
          })}
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} className={`select-field ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        className={`select-field__trigger focus-ring ${buttonClassName}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onKeyDown}
        onMouseUp={onMouseUp}
      >
        <span className={`select-field__value ${selectedOption ? '' : 'select-field__value--placeholder'}`}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={`select-field__chevron ${open ? 'select-field__chevron--open' : ''}`} size={16} aria-hidden="true" />
      </button>
      {panel}
    </div>
  );
}
