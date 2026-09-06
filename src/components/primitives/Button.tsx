import React, { ReactNode } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, AppButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  loading = false,
  className,
  disabled,
  ...props
}, ref) => {
  const isPrimary = variant === 'primary';
  const isDark = variant === 'dark';
  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        "rounded-pill font-bold font-display inline-flex items-center justify-center transition-all duration-[120ms] active:scale-[0.98] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-300 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
        fullWidth && "w-full",
        
        // Sizes
        size === 'sm' && "h-[40px] px-4 text-[16px] leading-[22px]",
        size === 'md' && "h-[48px] px-5 text-[16px] leading-[22px]",
        size === 'lg' && "h-[56px] px-6 text-[16px] leading-[22px]",
        
        // Variants
        isPrimary && "text-white shadow-[0_18px_36px_rgba(23,105,255,0.24)]",
        isDark && "bg-text-primary text-white border-2 border-white",
        isDanger && "text-white shadow-[0_18px_36px_rgba(255,93,82,0.24)]",
        isSecondary && "bg-background border border-border-subtle text-text-primary hover:bg-black/5",
        isGhost && "bg-transparent text-text-primary hover:bg-black/5",
        className
      )}
      style={{
        backgroundImage: isPrimary ? 'var(--gradient-action)' : isDanger ? 'var(--gradient-danger)' : undefined,
      }}
      {...props}
    >
      {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
      {!loading && leadingIcon && <span className="mr-2">{leadingIcon}</span>}
      {children}
      {!loading && trailingIcon && <span className="ml-2">{trailingIcon}</span>}
    </button>
  );
});
Button.displayName = 'Button';
