import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '../primitives/IconButton';
interface BottomSheetProps { isOpen: boolean; onClose: () => void; children: ReactNode; title?: string; }
export const BottomSheet = ({ isOpen, onClose, children, title = 'Options' }: BottomSheetProps) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (isOpen && dialog && !dialog.open) dialog.showModal();
    const dismiss = (event: MouseEvent) => {
      if (dialog && event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientY < r.top || event.clientX < r.left || event.clientX > r.right) { dialog.dispatchEvent(new Event('cancel', { cancelable: true })); } }
    };
    dialog?.addEventListener('click', dismiss);
    return () => { dialog?.removeEventListener('click', dismiss); if (dialog?.open) dialog.close(); };
  }, [isOpen]);
  if (!isOpen) return null;
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} className="fixed bottom-0 top-auto mx-auto w-full max-w-[480px] max-h-[90dvh] overflow-y-auto rounded-t-[30px] border-0 p-6 bg-surface text-text-primary shadow-2xl backdrop:bg-black/60">
    <div className="flex justify-between items-center mb-5"><h2 id={titleId} className="font-display font-bold text-[20px]">{title}</h2><IconButton icon={<X />} onClick={onClose} aria-label="Fermer le dialogue" /></div>
    {children}
  </dialog>;
};
