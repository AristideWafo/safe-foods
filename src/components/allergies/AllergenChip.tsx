import React, { ReactNode } from 'react';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';
import { AllergenId } from '../../types';

export interface AllergenChipProps {
  id: AllergenId;
  label: string;
  icon: ReactNode;
  selected: boolean;
  onClick?: () => void;
  variant?: 'list' | 'grid';
}

const ALLERGEN_COLORS: Record<string, string> = {
  gluten: 'bg-danger text-white border-danger',
  eggs: 'bg-warning text-black border-warning',
  peanuts: 'bg-amber-600 text-white border-amber-600',
  milk: 'bg-primary-500 text-white border-primary-500',
  nuts: 'bg-lime-600 text-white border-lime-600',
  soybeans: 'bg-violet-500 text-white border-violet-500',
  fish: 'bg-primary-600 text-white border-primary-600',
  crustaceans: 'bg-danger text-white border-danger',
  celery: 'bg-lime-600 text-white border-lime-600',
  mustard: 'bg-warning text-black border-warning',
  sesame: 'bg-amber-600 text-white border-amber-600',
  sulphites: 'bg-violet-500 text-white border-violet-500',
  lupin: 'bg-warning text-black border-warning',
  molluscs: 'bg-text-secondary text-white border-text-secondary',
};

export const AllergenChip: React.FC<AllergenChipProps> = ({ id, label, icon, selected, onClick, variant = 'grid' }) => {
  if (variant === 'list') {
    const colorClass = ALLERGEN_COLORS[id] || 'bg-text-primary text-white border-text-primary';
    return (
      <button
        onClick={onClick}
        aria-pressed={selected}
        aria-label={`${label}, ${selected ? "sélectionné" : "non sélectionné"}`}
        className={clsx(
          "h-[42px] px-4 rounded-[21px] flex items-center gap-2 border transition-all duration-[180ms] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-300",
          selected ? `${colorClass} shadow-md` : "bg-white border-border-subtle hover:bg-black/5"
        )}
      >
        <span className={clsx("flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px]", selected ? "text-inherit" : "text-text-muted")}>
          {icon}
        </span>
        <span className={clsx("font-bold text-[14px]", selected ? "text-inherit" : "text-text-secondary")}>
          {label}
        </span>
      </button>
    );
  }

  // Grid variant for Profile
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${label}, ${selected ? "sélectionné" : "non sélectionné"}`}
      className={clsx(
        "relative h-[104px] flex flex-col p-4 rounded-[20px] border transition-all duration-[180ms] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-300 overflow-hidden text-left",
        selected 
          ? "bg-white border-primary-500 shadow-[0_4px_12px_rgba(22,131,247,0.12)]" 
          : "bg-white border-border-subtle hover:bg-black/5"
      )}
    >
      <div className={clsx(
        "w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors",
        selected ? "bg-primary-50 text-primary-600" : "bg-background text-text-muted"
      )}>
        <span className="[&>svg]:w-5 [&>svg]:h-5">{icon}</span>
      </div>
      
      <span className={clsx(
        "font-semibold text-[14px] leading-tight",
        selected ? "text-text-primary" : "text-text-secondary"
      )}>
        {label}
      </span>

      <div className={clsx(
        "absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-[180ms]",
        selected ? "bg-primary-500 scale-100 opacity-100" : "scale-50 opacity-0"
      )}>
        <Check className="w-3.5 h-3.5 text-white" />
      </div>
    </button>
  );
};
