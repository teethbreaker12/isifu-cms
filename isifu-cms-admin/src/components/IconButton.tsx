import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  label: string;
  icon: ReactNode;
  tone?: 'default' | 'danger' | 'accent';
  className?: string;
};

export function IconButton({ label, icon, tone = 'default', className = '', type = 'button', ...props }: IconButtonProps) {
  return (
    <span className="tooltip-wrap">
      <button
        {...props}
        type={type}
        aria-label={label}
        title={label}
        className={`icon-button icon-button--${tone} focus-ring ${className}`}
      >
        {icon}
      </button>
      <span className="tooltip-bubble" role="tooltip">{label}</span>
    </span>
  );
}

export function InfoTooltip({ label }: { label: string }) {
  return (
    <span className="tooltip-wrap inline-flex">
      <button
        type="button"
        className="info-tooltip focus-ring"
        aria-label={label}
        title={label}
      >
        i
      </button>
      <span className="tooltip-bubble tooltip-bubble--wide" role="tooltip">{label}</span>
    </span>
  );
}
