import React, { ReactNode } from 'react';
import { clsx } from 'clsx';
import { Check, Plus } from 'lucide-react';
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
  eggs: 'bg-amber-600 text-white border-amber-600',
  peanuts: 'bg-amber-600 text-white border-amber-600',
  milk: 'bg-primary-500 text-white border-primary-500',
  nuts: 'bg-lime-800 text-white border-lime-800',
  soybeans: 'bg-violet-500 text-white border-violet-500',
  fish: 'bg-primary-600 text-white border-primary-600',
  crustaceans: 'bg-danger text-white border-danger',
  celery: 'bg-lime-800 text-white border-lime-800',
  mustard: 'bg-warning text-black border-warning',
  sesame: 'bg-amber-600 text-white border-amber-600',
  sulphites: 'bg-violet-500 text-white border-violet-500',
  lupin: 'bg-warning text-black border-warning',
  molluscs: 'bg-text-secondary text-white border-text-secondary',
};
const GRID_COLORS: Partial<Record<AllergenId, string>> = { gluten: '#e92125', eggs: '#df8000', milk: '#2563eb' };

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
        "stitch-allergen-tile relative flex flex-col border transition-all duration-[180ms] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-300 text-left",
        selected ? "bg-white" : "bg-[#fffdfd] hover:bg-white"
      )}
      style={{ '--allergen-accent': GRID_COLORS[id] || '#2563eb' } as React.CSSProperties}
    >
      <div className={clsx(
        "stitch-allergen-icon rounded-full flex items-center justify-center transition-colors",
        selected ? "bg-[var(--allergen-accent)] text-white" : "bg-[#e7e8ec] text-[#434655]"
      )}>
        <span className="[&>svg]:w-6 [&>svg]:h-6">{icon}</span>
      </div>
      
      <span className={clsx(
        "stitch-allergen-label font-bold leading-tight",
        selected ? "text-text-primary" : "text-text-secondary"
      )}>
        {label}
      </span>
      <span className={clsx('stitch-allergen-status mt-1 font-bold', selected ? 'text-[var(--allergen-accent)]' : 'text-text-muted')}>{selected ? 'Actif' : 'Inactif'}</span>

      <div className={clsx(
        "stitch-allergen-toggle absolute rounded-full flex items-center justify-center transition-all duration-[180ms]",
        selected ? "bg-[var(--allergen-accent)] text-white" : "bg-[#f2f3f5] text-[#434655]"
      )}>
        {selected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </div>
    </button>
  );
};
