import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../primitives/Button';
import { IconButton } from '../primitives/IconButton';

interface ManualBarcodeSheetProps {
  onClose: () => void;
  onSubmit: (barcode: string) => void;
}

export const ManualBarcodeSheet: React.FC<ManualBarcodeSheetProps> = ({ onClose, onSubmit }) => {
  const [value, setValue] = useState('');
  
  const isValid = [8, 12, 13].includes(value.length) && /^\d+$/.test(value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) onSubmit(value);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end pointer-events-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-surface w-full rounded-t-[30px] p-6 shadow-2xl animate-in slide-in-from-bottom duration-[220ms] ease-out">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[20px] font-display font-bold text-text-primary">Saisir le code-barres</h2>
          <IconButton icon={<X />} onClick={onClose} aria-label="Fermer" />
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ex: 3017620422003"
            className="w-full h-14 bg-background border border-border-subtle rounded-[16px] px-5 text-[18px] font-bold text-text-primary text-center tracking-widest focus:outline-none focus:ring-[3px] focus:ring-primary-300 transition-all mb-4"
            autoFocus
          />
          
          <div className="h-6 mb-6 flex justify-center">
            {value.length > 0 && !isValid && (
              <p className="text-danger text-[13px] font-medium">
                Ce code doit contenir 8, 12 ou 13 chiffres.
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            fullWidth 
            size="lg" 
            disabled={!isValid}
          >
            Rechercher
          </Button>
        </form>
      </div>
    </div>
  );
};
