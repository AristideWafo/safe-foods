import React, { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface SurfaceCardProps {
  children: ReactNode;
  variant?: 'plain' | 'tinted' | 'interactive';
  className?: string;
  onClick?: () => void;
}

export const SurfaceCard: React.FC<SurfaceCardProps> = ({ children, variant = 'plain', className, onClick }) => {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      onClick={onClick}
      className={clsx(
        "rounded-[22px] border border-border-subtle p-6 w-full text-left",
        variant === 'plain' && "bg-white shadow-[0_8px_24px_rgba(13,27,54,0.08)]",
        variant === 'tinted' && "bg-background",
        variant === 'interactive' && "bg-white shadow-[0_8px_24px_rgba(13,27,54,0.08)] transition-transform duration-[220ms] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(23,105,255,0.24)] active:scale-[0.99]",
        onClick && "cursor-pointer focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-300 focus-visible:ring-offset-2",
        className
      )}
    >
      {children}
    </Component>
  );
};
