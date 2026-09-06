import React, { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  'aria-label': string; // Required for accessibility
  tone?: 'light' | 'dark' | 'neutral' | 'danger';
  size?: 'md' | 'lg';
  selected?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon,
  'aria-label': ariaLabel,
  tone = 'neutral',
  size = 'md',
  selected,
  className,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      aria-label={ariaLabel}
      aria-pressed={selected}
      className={clsx(
        "rounded-pill flex items-center justify-center transition-all duration-[120ms] active:scale-[0.98] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-300",
        // Sizes
        size === 'md' && "w-[44px] h-[44px]",
        size === 'lg' && "w-[56px] h-[56px]",
        // Tones
        tone === 'neutral' && "bg-transparent text-text-primary hover:bg-black/5",
        tone === 'light' && "bg-white/20 backdrop-blur-md text-white hover:bg-white/30",
        tone === 'dark' && "bg-black/40 backdrop-blur-md text-white hover:bg-black/50",
        tone === 'danger' && "bg-danger/10 text-danger hover:bg-danger/20",
        selected && tone === 'neutral' && "bg-primary-50 text-primary-600",
        className
      )}
      {...props}
    >
      <span className={clsx(
        "flex items-center justify-center",
        size === 'md' ? "[&>svg]:w-5 [&>svg]:h-5" : "[&>svg]:w-6 [&>svg]:h-6"
      )}>
        {icon}
      </span>
    </button>
  );
});
IconButton.displayName = 'IconButton';
