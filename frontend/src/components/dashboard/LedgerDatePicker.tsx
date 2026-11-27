import { useEffect, useRef, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';

interface LedgerDatePickerProps {
  startDate: string;
  endDate: string;
  onApply: (startDate: string, endDate: string) => void;
  onClose: () => void;
}

const focusableSelector = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const LedgerDatePicker = ({ startDate, endDate, onApply, onClose }: LedgerDatePickerProps) => {
  const [draftStartDate, setDraftStartDate] = useState(startDate);
  const [draftEndDate, setDraftEndDate] = useState(endDate);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 639px)').matches);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const previousBodyOverflowRef = useRef('');
  const hasInvalidRange = Boolean(draftStartDate && draftEndDate && draftStartDate > draftEndDate);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const updateViewport = () => setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', updateViewport);

    if (isMobile) {
      previousBodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('input')?.focus();
    });

    const getFocusableElements = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
        .filter((element) => element.getClientRects().length > 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !isMobile) return;

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

    const handleOutsidePointer = (event: PointerEvent) => {
      if (!isMobile && event.target instanceof Node && !panelRef.current?.contains(event.target)) onCloseRef.current();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handleOutsidePointer);

    return () => {
      window.cancelAnimationFrame(frame);
      mediaQuery.removeEventListener('change', updateViewport);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handleOutsidePointer);
      if (isMobile) document.body.style.overflow = previousBodyOverflowRef.current;
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    };
  }, [isMobile]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasInvalidRange) onApply(draftStartDate, draftEndDate);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:block sm:w-[22rem] sm:bg-transparent sm:p-0"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && isMobile) onClose();
      }}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal={isMobile}
        aria-labelledby="ledger-date-picker-title"
        tabIndex={-1}
        className="w-full max-w-sm rounded-[14px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] p-4 shadow-xl sm:max-w-none sm:rounded-[10px] sm:p-4"
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[6px] bg-[var(--fp-bg-sunken)] text-[var(--fp-brand-primary)]">
              <CalendarDays aria-hidden="true" className="size-4" />
            </span>
            <div>
              <h2 id="ledger-date-picker-title" className="font-serif text-lg tracking-[-0.02em] text-slate-900 dark:text-slate-100">Custom date range</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Choose the dates to include in your ledger.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close custom date range" className="flex size-9 shrink-0 items-center justify-center rounded-[6px] text-slate-500 transition-colors hover:bg-[var(--fp-bg-sunken)] dark:text-slate-300">
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
            Start Date
            <input
              type="date"
              value={draftStartDate}
              max={draftEndDate || undefined}
              onChange={(event) => setDraftStartDate(event.target.value)}
              className="fp-num mt-1.5 min-h-11 w-full rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)] px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-[var(--fp-brand-primary)] focus:ring-2 focus:ring-[var(--fp-brand-primary)]/20 dark:text-slate-100"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
            End Date
            <input
              type="date"
              value={draftEndDate}
              min={draftStartDate || undefined}
              onChange={(event) => setDraftEndDate(event.target.value)}
              className="fp-num mt-1.5 min-h-11 w-full rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)] px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-[var(--fp-brand-primary)] focus:ring-2 focus:ring-[var(--fp-brand-primary)]/20 dark:text-slate-100"
            />
          </label>
          {hasInvalidRange && <p role="alert" className="text-xs font-medium text-[var(--fp-expense)]">Start date must be before the end date.</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="min-h-11 flex-1 rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)] px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-[var(--fp-bg-sunken)] dark:text-slate-200">Cancel</button>
            <button type="submit" disabled={hasInvalidRange} className="min-h-11 flex-1 rounded-[6px] bg-[var(--fp-brand-primary)] px-3 text-sm font-semibold text-white transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-950">Apply</button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default LedgerDatePicker;
