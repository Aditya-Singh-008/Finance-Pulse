import { useEffect, useRef, useState } from 'react';
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

const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const getModalExitDelay = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260;

const ConfirmationModal = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDanger = false,
}: ConfirmationModalProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (document.activeElement instanceof HTMLElement) {
        previousFocusRef.current = document.activeElement;
      }
      let revealFrame: number | undefined;
      const mountFrame = window.requestAnimationFrame(() => {
        setIsMounted(true);
        revealFrame = window.requestAnimationFrame(() => setIsVisible(true));
      });
      return () => {
        window.cancelAnimationFrame(mountFrame);
        if (revealFrame !== undefined) window.cancelAnimationFrame(revealFrame);
      };
    }

    const closeFrame = window.requestAnimationFrame(() => setIsVisible(false));
    const timer = window.setTimeout(() => {
      setIsMounted(false);
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    }, getModalExitDelay());
    return () => {
      window.cancelAnimationFrame(closeFrame);
      window.clearTimeout(timer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isMounted) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const getFocusableElements = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
        .filter((element) => element.offsetParent !== null);

    const frame = window.requestAnimationFrame(() => getFocusableElements()[0]?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (isOpen) onCancel();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusableElements = getFocusableElements();
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (!first || !last) {
        event.preventDefault();
        panelRef.current?.focus();
      } else if (event.shiftKey && (document.activeElement === first || !panelRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panelRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isMounted, onCancel]);

  if (!isMounted) return null;

  const accentClasses = isDanger
    ? 'bg-[var(--fp-bg-sunken)] text-[var(--fp-expense)]'
    : 'bg-[var(--fp-bg-sunken)] text-[var(--fp-brand-primary)]';
  const confirmClasses = isDanger
    ? 'bg-[var(--fp-expense)] text-white hover:brightness-95'
    : 'bg-[var(--fp-brand-primary)] text-white hover:brightness-95 dark:text-slate-950 dark:hover:brightness-110';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-[260ms] ease-[var(--ease-entrance)] ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onCancel}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        aria-describedby="confirmation-modal-message"
        tabIndex={-1}
        className={`relative w-full max-w-md overflow-hidden rounded-[14px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] transition-[opacity,transform] duration-[260ms] ease-[var(--ease-entrance)] ${isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0'}`}
      >
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className={`flex size-10 items-center justify-center rounded-[6px] ${accentClasses}`}>
              <AlertCircle aria-hidden="true" className="size-5" />
            </div>
            <h2 id="confirmation-modal-title" className="font-serif text-2xl tracking-[-0.02em] text-slate-900 dark:text-slate-100">
              {title}
            </h2>
          </div>

          <p id="confirmation-modal-message" className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            {message}
          </p>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-11 flex-1 rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)] px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-[var(--fp-bg-sunken)] dark:text-slate-200"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`min-h-11 flex-1 rounded-[6px] px-4 text-sm font-semibold transition-[filter] ${confirmClasses}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
