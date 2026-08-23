import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  label: string;
  icon: ReactNode;
  tone?: 'default' | 'danger' | 'accent';
  className?: string;
};

type TooltipPosition = {
  left: number;
  top?: number;
  bottom?: number;
  maxWidth: number;
};

function TooltipWrap({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = ref.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const margin = 12;
    const maxWidth = Math.min(wide ? 320 : 288, window.innerWidth - margin * 2);
    const centeredLeft = rect.left + rect.width / 2;
    const left = Math.min(Math.max(centeredLeft, margin + maxWidth / 2), window.innerWidth - margin - maxWidth / 2);
    const hasRoomBelow = rect.bottom + 112 < window.innerHeight;

    setPosition({
      left,
      maxWidth,
      ...(hasRoomBelow ? { top: rect.bottom + 8 } : { bottom: window.innerHeight - rect.top + 8 }),
    });
  }, [wide]);

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  return (
    <span
      ref={ref}
      className="tooltip-wrap"
      onBlur={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && position && createPortal(
        <span
          className={`tooltip-bubble tooltip-bubble--floating ${wide ? 'tooltip-bubble--wide' : ''}`}
          role="tooltip"
          style={{
            left: position.left,
            top: position.top,
            bottom: position.bottom,
            maxWidth: position.maxWidth,
          }}
        >
          {label}
        </span>,
        document.body,
      )}
    </span>
  );
}

export function IconButton({ label, icon, tone = 'default', className = '', type = 'button', ...props }: IconButtonProps) {
  return (
    <TooltipWrap label={label}>
      <button
        {...props}
        type={type}
        aria-label={label}
        className={`icon-button icon-button--${tone} focus-ring ${className}`}
      >
        {icon}
      </button>
    </TooltipWrap>
  );
}

export function InfoTooltip({ label }: { label: string }) {
  return (
    <TooltipWrap label={label} wide>
      <button
        type="button"
        className="info-tooltip focus-ring"
        aria-label={label}
      >
        i
      </button>
    </TooltipWrap>
  );
}
