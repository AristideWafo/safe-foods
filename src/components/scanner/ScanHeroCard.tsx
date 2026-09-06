import React from 'react';
import { clsx } from 'clsx';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../primitives/Button';

interface ScanHeroCardProps {
  title?: string;
  illustrationSrc?: string;
  onActivate: () => void;
  className?: string;
}

export const ScanHeroCard: React.FC<ScanHeroCardProps> = ({ 
  title = "Scanner un produit", 
  illustrationSrc, 
  onActivate,
  className 
}) => {
  return (
    <button 
      onClick={onActivate}
      className={clsx(
        "relative w-full h-[180px] rounded-[22px] p-6 flex flex-col justify-between items-start text-left overflow-hidden transition-all duration-[220ms] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-300 focus-visible:ring-offset-2 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(23,105,255,0.24)]",
        className
      )}
      style={{ backgroundImage: 'var(--gradient-action)' }}
    >
      <div className="absolute top-4 right-4 z-0 opacity-20">
        <Sparkles className="w-24 h-24 text-white" />
      </div>
      
      {illustrationSrc && (
        <img 
          src={illustrationSrc} 
          alt="" 
          aria-hidden="true"
          className="absolute bottom-[-10px] right-[-10px] h-[140px] object-contain z-10"
        />
      )}

      <div className="relative z-20 w-[60%]">
        <h2 className="text-[28px] leading-[32px] font-display font-extrabold text-white mb-4">
          {title}
        </h2>
      </div>

      <div className="relative z-20 w-[46px] h-[46px] rounded-full bg-white flex items-center justify-center text-primary-500 shadow-md">
        <ArrowRight className="w-6 h-6" />
      </div>
    </button>
  );
};
