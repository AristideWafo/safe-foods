import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../primitives/Button';
import { BottomSheet } from '../layout/BottomSheet';
import { isValidBarcode } from '../../services/Barcode';
interface ManualBarcodeSheetProps { onClose: () => void; onSubmit: (barcode: string) => void; }
export const ManualBarcodeSheet = ({ onClose, onSubmit }: ManualBarcodeSheetProps) => {
  return <BottomSheet isOpen onClose={onClose} title="Saisir le code-barres"><ManualBarcodeForm onSubmit={onSubmit} /></BottomSheet>;
};
export const ManualBarcodeForm = ({ onSubmit, value: controlledValue, onValueChange, disabled = false }: { onSubmit: (barcode: string) => void; value?: string; onValueChange?: (value: string) => void; disabled?: boolean }) => {
  const [localValue, setLocalValue] = useState('');
  const value = controlledValue ?? localValue;
  const setValue = onValueChange ?? setLocalValue;
  const id = useId();
  const valid = isValidBarcode(value);
  const submit = (event: FormEvent) => { event.preventDefault(); if (valid && !disabled) onSubmit(value); };
  return <form onSubmit={submit}>
    <label htmlFor={id} className="block font-bold mb-2">Chiffres sous le code-barres</label>
    <input id={id} type="text" inputMode="numeric" autoComplete="off" disabled={disabled} value={value} onChange={event => setValue(event.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="Ex: 3017620422003" aria-describedby={`${id}-help`} aria-invalid={value.length > 0 && !valid} className="w-full h-12 rounded-xl border border-border-subtle bg-background px-4 text-[16px] tracking-wider focus:ring-2 focus:ring-primary-500 mb-3" />
    <p id={`${id}-help`} className="text-[13px] text-text-secondary mb-5">{value && !valid ? 'Vérifiez le code : 8, 12, 13 ou 14 chiffres avec une clé de contrôle valide.' : 'Recopiez tous les chiffres, y compris les zéros au début.'}</p>
    <Button type="submit" fullWidth disabled={!valid || disabled} loading={disabled}>Rechercher</Button>
  </form>;
};
