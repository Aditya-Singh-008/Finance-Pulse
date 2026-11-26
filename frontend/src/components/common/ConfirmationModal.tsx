import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDanger = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
      <button type="button" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} aria-label="Close confirmation dialog" />
      <section role="dialog" aria-modal="true" aria-labelledby="confirmation-modal-title" aria-describedby="confirmation-modal-message" className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-elevated shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <span className={`flex size-10 items-center justify-center rounded-full ${isDanger ? 'bg-negative/10 text-negative' : 'bg-secondary text-primary'}`}><AlertCircle aria-hidden="true" className="size-5" /></span>
            <h2 id="confirmation-modal-title" className="text-2xl">{title}</h2>
          </div>
          <p id="confirmation-modal-message" className="mb-7 text-[12px] leading-6 text-muted">{message}</p>
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} className="min-h-11 flex-1 border border-border bg-surface px-4 text-[11px] font-medium text-foreground transition-colors hover:bg-secondary">{cancelLabel}</button>
            <button type="button" onClick={onConfirm} className={`motion-button min-h-11 flex-1 px-4 text-[11px] font-medium text-white transition-colors dark:text-slate-950 ${isDanger ? 'bg-negative hover:bg-negative/90' : 'bg-primary hover:bg-primary/90'}`}>{confirmLabel}</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ConfirmationModal;
