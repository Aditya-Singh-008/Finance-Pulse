/**
 * TransactionForm.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * A self-contained "New Transaction" modal component for Finance Pulse.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { z } from 'zod';
import { supabase } from '../../lib/supabaseClient';
import {
  X,
  Plus,
  IndianRupee,
  Tag,
  Calendar,
  FileText,
  Loader2,
  AlertCircle,
  Lock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  type?: 'income' | 'expense';
}

interface TransactionFormProps {
  categories?: Category[];
  onSuccess: () => void;
  onCancel?: () => void;
  targetUserId?: string | null;
  transactionToEdit?: EditableTransaction | null;
}

export interface TransactionFormHandle {
  openModal: () => void;
}

type TransactionType = 'income' | 'expense';

const getModalExitDelay = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260;

interface FormState {
  amount: string;
  type: TransactionType;
  category_id: string;
  date: string;
  description: string;
}

interface EditableTransaction {
  id: string;
  amount: number;
  type: TransactionType;
  category_id?: string | null;
  date: string;
  description: string | null;
}

const getTodayISO = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const INITIAL_FORM_STATE: FormState = {
  amount: '',
  type: 'expense',
  category_id: '',
  date: getTodayISO(),
  description: '',
};

// ── Zod Validation Schema (Zod v4 compatible) ───────────────────────────────
const transactionSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required.')
    .refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
      message: 'Amount must be a positive number.',
    })
    .refine(v => {
      const parts = v.split('.');
      return !parts[1] || parts[1].length <= 2;
    }, { message: 'Amount can have at most 2 decimal places.' }),
  type: z.enum(['income' as const, 'expense' as const]),
  category_id: z.string().min(1, 'Please select a category.'),
  date: z
    .string()
    .min(1, 'Date is required.')
    .refine(v => {
      const d = new Date(v);
      return !isNaN(d.getTime()) && d <= new Date();
    }, { message: 'Date must be today or in the past.' }),
  description: z.string().max(500, 'Description must be 500 characters or fewer.').optional(),
});

const FALLBACK_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Dining' },
  { id: 'transport', name: 'Transport' },
  { id: 'utilities', name: 'Utilities' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'healthcare', name: 'Healthcare' },
  { id: 'shopping', name: 'Shopping' },
  { id: 'salary', name: 'Salary' },
  { id: 'freelance', name: 'Freelance' },
  { id: 'investment', name: 'Investment' },
  { id: 'other', name: 'Other' },
];

const TransactionForm = forwardRef<TransactionFormHandle, TransactionFormProps>(({
  categories,
  onSuccess,
  onCancel,
  targetUserId = null,
  transactionToEdit = null,
}, ref) => {
  const isEditMode = !!transactionToEdit;
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const baseCategories: Category[] =
    categories && categories.length > 0 ? categories : FALLBACK_CATEGORIES;

  const resolvedCategories: Category[] = baseCategories.some(c => c.type)
    ? baseCategories.filter(c => c.type === form.type)
    : baseCategories;

  const openModal = useCallback(() => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    if (document.activeElement instanceof HTMLElement) {
      returnFocusRef.current = document.activeElement;
    }
    setIsMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsVisible(true));
    });
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (transactionToEdit) {
      setForm({
        amount: String(transactionToEdit.amount),
        type: transactionToEdit.type,
        category_id: transactionToEdit.category_id || '',
        date: transactionToEdit.date ? transactionToEdit.date.split('T')[0] : getTodayISO(),
        description: transactionToEdit.description || '',
      });
      openModal();
    }
  }, [transactionToEdit, openModal]);

  const closeModal = useCallback(() => {
    if (isSubmitting || closeTimerRef.current) return;
    setIsVisible(false);
    closeTimerRef.current = window.setTimeout(() => {
      setIsMounted(false);
      setIsOpen(false);
      setForm(INITIAL_FORM_STATE);
      setSubmitError(null);
      setSubmitSuccess(false);
      onCancel?.();
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
      returnFocusRef.current = null;
      closeTimerRef.current = null;
    }, getModalExitDelay());
  }, [isSubmitting, onCancel]);

  useEffect(() => {
    if (!isOpen || !isMounted) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusableElements = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
        .filter(element => element.getClientRects().length > 0);
    const frame = window.requestAnimationFrame(() => getFocusableElements()[0]?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
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
  }, [isOpen, isMounted, closeModal]);

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (submitError) setSubmitError(null);
  };

  const handleTypeChange = (type: TransactionType) => {
    setForm(prev => ({ ...prev, type, category_id: '' }));
    if (submitError) setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    // ── Zod Validation ────────────────────────────────────────────────────────
    const result = transactionSchema.safeParse(form);
    if (!result.success) {
      // Surface the first field error in the UI
      const firstError = result.error.issues[0];
      setSubmitError(firstError?.message ?? 'Please check all fields and try again.');
      return;
    }

    const parsedAmount = parseFloat(form.amount);
    setIsSubmitting(true);


    try {
      if (isEditMode) {
        // Use the new Edge Function for updates to ensure consistent validation
        const { data: responseBody, error: invokeError } = await supabase.functions.invoke(
          'update-transaction',
          {
            method: 'PATCH',
            body: {
              id: transactionToEdit.id,
              amount: parsedAmount,
              type: form.type,
              category_id: form.category_id,
              date: form.date,
              description: form.description || null,
            },
          }
        );

        if (invokeError) {
          const serverMessage =
            responseBody?.error ?? invokeError.message ?? 'Failed to update transaction.';
          throw new Error(serverMessage);
        }

        if (responseBody?.error) {
          throw new Error(responseBody.error);
        }
      } else {
        // Create via Edge Function
        const { data: responseBody, error: invokeError } = await supabase.functions.invoke(
          'create-transaction',
          {
            method: 'POST',
            body: {
              amount: parsedAmount,
              type: form.type,
              category_id: form.category_id,
              date: form.date,
              description: form.description || undefined,
              target_user_id: targetUserId,
            },
          }
        );

        if (invokeError) {
          const serverMessage =
            responseBody?.error ?? invokeError.message ?? 'Failed to create transaction.';
          throw new Error(serverMessage);
        }

        if (responseBody?.error) {
          throw new Error(responseBody.error);
        }
      }

      setSubmitSuccess(true);

      setTimeout(() => {
        closeModal();
        onSuccess();
      }, 1200);

    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'An unexpected error occurred. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    openModal
  }));

  const inputClass = [
    'w-full rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-4 py-3',
    'font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--fp-brand-primary)] dark:text-slate-100 dark:placeholder-slate-500',
    'transition-colors duration-200',
  ].join(' ');

  return (
    <>
      {!isEditMode && (
        <button
          id="open-transaction-form-btn"
          onClick={openModal}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className={[
            'inline-flex min-h-11 items-center gap-2 rounded-[6px] bg-[var(--fp-brand-primary)] px-4',
            'font-semibold text-white transition-[filter] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[var(--fp-brand-primary)] focus:ring-offset-2 dark:text-slate-950 dark:hover:brightness-110',
          ].join(' ')}
        >
          <Plus className="w-4 h-4" />
          New Transaction
        </button>
      )}

      {isMounted && (
        <div
          className={[
            'fixed inset-0 z-50 flex items-center justify-center p-4',
            'transition-opacity duration-[260ms] ease-[var(--ease-entrance)]',
            isVisible ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
          onClick={closeModal}
        >
          <div
            className={[
              'absolute inset-0 bg-black/55 backdrop-blur-sm',
              'transition-opacity duration-[260ms] ease-[var(--ease-entrance)]',
              isVisible ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            aria-hidden="true"
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-form-title"
            aria-describedby="transaction-form-description"
            tabIndex={-1}
            onClick={e => e.stopPropagation()}
            className={[
              'relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-[14px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)]',
              'transition-[opacity,transform] duration-[260ms] ease-[var(--ease-entrance)]',
              isVisible
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-[0.98] translate-y-3',
            ].join(' ')}
          >
            <div aria-hidden="true" className="h-1 w-full bg-[var(--fp-brand-primary)]" />

            <div className="flex items-center justify-between gap-4 px-5 pb-2 pt-6 sm:px-7">
              <div>
                <h2
                  id="transaction-form-title"
                  className="font-serif text-2xl tracking-[-0.02em] text-slate-900 dark:text-slate-100"
                >
                  {isEditMode ? 'Edit Transaction' : 'New Transaction'}
                </h2>
                <p id="transaction-form-description" className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {isEditMode ? 'Update this financial record' : 'Record your income or expense'}
                </p>
              </div>

              <button
                id="close-transaction-form-btn"
                onClick={closeModal}
                disabled={isSubmitting}
                aria-label="Close form"
                className={[
                  'flex size-11 items-center justify-center rounded-[6px] text-slate-500',
                  'hover:bg-[var(--fp-bg-sunken)] hover:text-slate-900 dark:text-slate-300 dark:hover:text-white',
                  'transition-colors duration-150',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--fp-brand-primary)]',
                ].join(' ')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              id="transaction-form"
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col gap-5 px-5 pb-6 pt-4 sm:px-7 sm:pb-7"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Type <span className="text-[var(--fp-expense)]">*</span>
                </label>
                <div
                  role="radiogroup"
                  aria-label="Transaction type"
                  className="grid grid-cols-2 gap-3"
                >
                  <button
                    id="type-income-btn"
                    type="button"
                    role="radio"
                    aria-checked={form.type === 'income'}
                    onClick={() => handleTypeChange('income')}
                    className={[
                      'flex min-h-11 items-center justify-center gap-2 rounded-[6px] border px-3 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--fp-income)]',
                      form.type === 'income'
                        ? 'bg-[var(--fp-bg-sunken)] border-[var(--fp-income)] text-[var(--fp-income)]'
                        : 'bg-[var(--fp-bg-surface)] border-[var(--fp-border-default)] text-slate-600 hover:border-[var(--fp-income)] dark:text-slate-300',
                    ].join(' ')}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Income
                  </button>

                  <button
                    id="type-expense-btn"
                    type="button"
                    role="radio"
                    aria-checked={form.type === 'expense'}
                    onClick={() => handleTypeChange('expense')}
                    className={[
                      'flex min-h-11 items-center justify-center gap-2 rounded-[6px] border px-3 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--fp-expense)]',
                      form.type === 'expense'
                        ? 'bg-[var(--fp-bg-sunken)] border-[var(--fp-expense)] text-[var(--fp-expense)]'
                        : 'bg-[var(--fp-bg-surface)] border-[var(--fp-border-default)] text-slate-600 hover:border-[var(--fp-expense)] dark:text-slate-300',
                    ].join(' ')}
                  >
                    <TrendingDown className="w-4 h-4" />
                    Expense
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="amount"
                  className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2"
                >
                  Amount <span className="text-[var(--fp-expense)]">*</span>
                </label>
                <div className="relative">
                  <IndianRupee
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    required
                    value={form.amount}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={`${inputClass} pl-10 disabled:opacity-60 disabled:cursor-not-allowed`}
                    aria-describedby={submitError ? 'form-error' : undefined}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="category_id"
                  className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2"
                >
                  Category <span className="text-[var(--fp-expense)]">*</span>
                </label>
                <div className="relative">
                  <Tag
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                    aria-hidden="true"
                  />
                  <select
                    id="category_id"
                    name="category_id"
                    required
                    value={form.category_id}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={`${inputClass} pl-10 appearance-none disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <option value="" disabled>
                      — Select a category —
                    </option>
                    {resolvedCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <div
                    className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                    aria-hidden="true"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 
                           111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 
                           010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="date"
                  className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2"
                >
                  Date <span className="text-[var(--fp-expense)]">*</span>
                </label>
                <div className="relative">
                  <Calendar
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="date"
                    name="date"
                    type="date"
                    required
                    value={form.date}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    max={getTodayISO()}
                    className={`${inputClass} pl-10 disabled:opacity-60 disabled:cursor-not-allowed`}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2"
                >
                  Description
                  <span className="ml-2 text-slate-400 normal-case tracking-normal font-medium">
                    (optional)
                  </span>
                </label>
                <div className="relative">
                  <FileText
                    className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 pointer-events-none"
                    aria-hidden="true"
                  />
                  <textarea
                    id="description"
                    name="description"
                    rows={2}
                    placeholder="e.g. Monthly Netflix subscription…"
                    value={form.description}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={`${inputClass} pl-10 resize-none disabled:opacity-60 disabled:cursor-not-allowed`}
                  />
                </div>
              </div>

              {submitError && (
                <div
                  id="form-error"
                  role="alert"
                  aria-live="assertive"
                  className={[
                    'flex items-start gap-3 p-4 rounded-[6px] animate-shake',
                    submitError.toLowerCase().includes('inactive')
                      ? 'border border-[var(--fp-border-default)] bg-[var(--fp-bg-sunken)] text-amber-800 dark:text-amber-300'
                      : 'border border-[var(--fp-expense)] bg-[var(--fp-bg-sunken)] text-[var(--fp-expense)]',
                  ].join(' ')}
                >
                  {submitError.toLowerCase().includes('inactive') ? (
                    <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <p className="text-sm font-semibold leading-snug">{submitError}</p>
                </div>
              )}

              {submitSuccess && (
                <div
                  role="status"
                  aria-live="polite"
                  className={[
                    'flex items-center gap-3 p-4 rounded-[6px]',
                    'border border-[var(--fp-income)] bg-[var(--fp-bg-sunken)] text-[var(--fp-income)]',
                  ].join(' ')}
                >
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm font-semibold">Transaction recorded successfully!</p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  id="cancel-transaction-btn"
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className={[
                    'min-h-11 flex-1 rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-sunken)] px-4 font-semibold text-slate-700',
                    'transition-colors duration-200 hover:bg-[var(--fp-bg-canvas)] dark:text-slate-200',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    'focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2',
                  ].join(' ')}
                >
                  Cancel
                </button>

                <button
                  id="submit-transaction-btn"
                  type="submit"
                  disabled={isSubmitting || submitSuccess}
                  className={[
                    'flex-[2] flex items-center justify-center gap-2',
                    'min-h-11 rounded-[6px] bg-[var(--fp-brand-primary)] px-4 font-semibold text-white dark:text-slate-950',
                    'transition-[filter] duration-200 hover:brightness-95 dark:hover:brightness-110',
                    'disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100',
                    'focus:outline-none focus:ring-2 focus:ring-[var(--fp-brand-primary)] focus:ring-offset-2',
                  ].join(' ')}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Saving…
                    </>
                  ) : submitSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" aria-hidden="true" />
                      Save Transaction
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
});

export default TransactionForm;
