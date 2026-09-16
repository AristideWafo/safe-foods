import React from 'react';
import { clsx } from 'clsx';
import { ArrowRight, Zap } from 'lucide-react';
import { ProductMascot } from './ProductMascot';

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
        "stitch-scan-hero relative w-full text-left overflow-hidden transition-all duration-[220ms] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-300 focus-visible:ring-offset-2 active:scale-[0.98] hover:-translate-y-0.5",
        className
      )}
    >
      <span className="stitch-hero-circle stitch-hero-circle-top" aria-hidden="true" />
      <span className="stitch-hero-circle stitch-hero-circle-bottom" aria-hidden="true" />
      <svg className="stitch-sparkle stitch-sparkle-top" aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M12 0L14 9L23 12L14 15L12 24L10 15L1 12L10 9Z" /></svg>
      <svg className="stitch-sparkle stitch-sparkle-middle" aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M12 0L14 9L23 12L14 15L12 24L10 15L1 12L10 9Z" /></svg>
      <svg className="stitch-sparkle stitch-sparkle-bottom" aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M12 0L14 9L23 12L14 15L12 24L10 15L1 12L10 9Z" /></svg>
      
      {!illustrationSrc && <div className="stitch-hero-mascot"><ProductMascot /></div>}
      {illustrationSrc && (
        <img 
          src={illustrationSrc} 
          alt="" 
          aria-hidden="true"
          className="stitch-hero-mascot object-contain"
        />
      )}

      <div className="stitch-hero-copy relative z-20">
        <span className="stitch-hero-badge"><Zap aria-hidden="true" />Instantané</span>
        <h2 className="stitch-hero-title font-display font-bold text-white">
          {title}
        </h2>
        <p className="stitch-hero-description">Vérifiez les allergènes et additifs en 1 seconde.</p>
      </div>

      <div className="stitch-hero-cta relative z-20">
        Ouvrir la caméra <span className="stitch-hero-arrow"><ArrowRight aria-hidden="true" /></span>
      </div>
    </button>
  );
};
