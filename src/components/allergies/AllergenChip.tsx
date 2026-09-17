import React, { ReactNode, useState } from 'react';
import { clsx } from 'clsx';
import { Ellipsis, Pencil, Trash2 } from 'lucide-react';
import { AllergenId } from '../../types';

export interface AllergenChipProps {
  id: AllergenId;
  label: string;
  icon: ReactNode;
  selected: boolean;
  onClick?: () => void;
  variant?: 'list' | 'grid';
  onEdit?: () => void;
  onDelete?: () => void;
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
const GRID_COLORS: Partial<Record<AllergenId, string>> = {
  gluten: '#e92125', eggs: '#df8000', milk: '#2563eb', peanuts: '#df8000',
  nuts: '#3f6212', soybeans: '#8b5cf6', fish: '#2563eb', crustaceans: '#e92125',
  celery: '#3f6212', mustard: '#df8000', sesame: '#8b5cf6', sulphites: '#2563eb',
  lupin: '#3f6212', molluscs: '#8b5cf6',
};

export const AllergenChip: React.FC<AllergenChipProps> = ({ id, label, icon, selected, onClick, variant = 'grid', onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
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

  return (
    <div className={clsx('stitch-allergen-tile relative border bg-white', selected && 'stitch-allergen-selected', onEdit && onDelete && 'stitch-allergen-managed')}
      style={{ '--allergen-accent': id.startsWith('custom:') ? '#000000' : GRID_COLORS[id] || '#2563eb' } as React.CSSProperties}>
      <button type="button" onClick={onClick} aria-pressed={selected}
        aria-label={`${label}, ${selected ? 'sélectionné' : 'non sélectionné'}`}
        className="stitch-allergen-select flex flex-col text-left rounded-[22px] focus-visible:outline-primary-600">
        <span className={clsx('stitch-allergen-icon rounded-full flex items-center justify-center transition-colors',
          selected ? 'bg-[var(--allergen-accent)] text-white' : 'bg-[#e7e8ec] text-[#434655]')}>
          {icon}
        </span>
        <span className="stitch-allergen-label font-bold leading-tight text-text-primary">{label}</span>
        <span className={clsx('stitch-allergen-status mt-1 font-bold', selected ? 'text-[var(--allergen-accent)]' : 'text-text-muted')}>{selected ? 'Actif' : 'Inactif'}</span>
      </button>
      {onEdit && onDelete && <div className="stitch-allergen-actions">
        {menuOpen ? <>
          <button type="button" aria-label={`Modifier ${label}`} onClick={() => { setMenuOpen(false); onEdit(); }}><Pencil aria-hidden="true" /></button>
          <button type="button" aria-label={`Supprimer ${label}`} onClick={() => { setMenuOpen(false); onDelete(); }}><Trash2 aria-hidden="true" /></button>
        </> : <button type="button" aria-label={`Options pour ${label}`} aria-expanded={false} onClick={() => setMenuOpen(true)}><Ellipsis aria-hidden="true" /></button>}
      </div>}
    </div>
  );
};
