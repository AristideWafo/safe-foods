import React from 'react';
import { clsx } from 'clsx';
import { TriangleAlert, CircleHelp, ShieldCheck, FileQuestion } from 'lucide-react';
import { AnalysisStatus } from '../../types';

interface StatusBadgeProps {
  status: AnalysisStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isHero?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', className, isHero = false }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'AVOID': return {
        bg: 'bg-danger/10',
        text: 'text-danger',
        icon: <TriangleAlert />,
        label: isHero ? 'À ÉVITER' : 'À éviter'
      };
      case 'UNCERTAIN': return {
        bg: 'bg-warning/10',
        text: 'text-amber-800',
        icon: <CircleHelp />,
        label: isHero ? 'PRUDENCE' : 'Prudence'
      };
      case 'SAFE': return {
        bg: 'bg-verified/10',
        text: 'text-verified',
        icon: <ShieldCheck />,
        label: isHero ? 'AUCUN ALLERGÈNE DÉTECTÉ' : 'Aucun détecté'
      };
      default: return {
        bg: 'bg-text-tertiary/10',
        text: 'text-text-secondary',
        icon: <FileQuestion />,
        label: isHero ? 'ANALYSE IMPOSSIBLE' : 'Analyse impossible'
      };
    }
  };

  const style = getBadgeStyle();

  return (
    <div className={clsx(
      "inline-flex items-center rounded-pill font-semibold",
      style.bg, style.text,
      size === 'sm' && "h-[24px] px-2 text-[11px] gap-1",
      size === 'md' && "h-[32px] px-3 text-[12px] gap-1.5",
      size === 'lg' && "h-[40px] px-4 text-[14px] gap-2",
      className
    )}>
      <span className={clsx(
        "flex items-center justify-center",
        size === 'sm' && "[&>svg]:w-3 [&>svg]:h-3",
        size === 'md' && "[&>svg]:w-4 [&>svg]:h-4",
        size === 'lg' && "[&>svg]:w-5 [&>svg]:h-5"
      )}>
        {style.icon}
      </span>
      <span>{style.label}</span>
    </div>
  );
};
