import React from 'react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, UserRound } from 'lucide-react';
import { IconButton } from '../primitives/IconButton';

interface AppHeaderProps {
  variant?: 'home' | 'page' | 'overlay';
  title?: string;
  rightAction?: React.ReactNode;
  onBack?: () => void;
  className?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  variant = 'page',
  title,
  rightAction,
  onBack,
  className
}) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <header className={clsx(
      "w-full px-6 flex items-center justify-between z-40",
      variant === 'overlay' ? "absolute top-0 left-0 pt-[max(16px,env(safe-area-inset-top))] h-[calc(56px+max(16px,env(safe-area-inset-top)))]" : "pt-[max(16px,env(safe-area-inset-top))] h-[calc(56px+max(16px,env(safe-area-inset-top)))] bg-background",
      className
    )}>
      {variant === 'home' && (
        <>
          <h1 className="font-display font-bold text-title-xl">Accueil</h1>
          {rightAction || <button onClick={() => navigate('/profile')} aria-label="Mon profil" className="w-11 h-11 flex items-center justify-center bg-primary-500 text-white rounded-full"><UserRound className="w-5 h-5" /></button>}
        </>
      )}

      {variant === 'page' && (
        <>
          <div className="w-11">
            <IconButton
              icon={<ChevronLeft />}
              aria-label="Retour"
              onClick={handleBack}
            />
          </div>
          <h1 className="flex-1 ml-3 font-display font-bold text-title-xl text-text-primary">
            {title}
          </h1>
          <div className="w-11 flex justify-end">
            {rightAction}
          </div>
        </>
      )}

      {variant === 'overlay' && (
        <>
          <div className="w-11">
            <IconButton
              icon={<ChevronLeft />}
              aria-label="Retour"
              tone="dark"
              onClick={handleBack}
            />
          </div>
          <div className="flex-1" />
          <div className="w-11 flex justify-end">
            {rightAction}
          </div>
        </>
      )}
    </header>
  );
};
