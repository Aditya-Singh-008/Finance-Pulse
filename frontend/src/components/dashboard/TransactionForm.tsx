/**
 * TransactionForm.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * A self-contained "New Transaction" modal component for Finance Pulse.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
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
  transactionToEdit?: any;
}

export interface TransactionFormHandle {
  openModal: () => void;
}

type TransactionType = 'income' | 'expense';

interface FormState {
  amount: string;
  type: TransactionType;
  category_id: string;
  date: string;
  description: string;
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

  const baseCategories: Category[] =
    categories && categories.length > 0 ? categories : FALLBACK_CATEGORIES;

  const resolvedCategories: Category[] = baseCategories.some(c => c.type)
    ? baseCategories.filter(c => c.type === form.type)
    : baseCategories;

  const openModal = useCallback(() => {
    setIsMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
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
    if (isSubmitting) return;
    setIsVisible(false);
    setTimeout(() => {
      setIsMounted(false);
      setIsOpen(false);
      setForm(INITIAL_FORM_STATE);
      setSubmitError(null);
      setSubmitSuccess(false);
      if (onCancel) onCancel();
    }, 300);
  }, [isSubmitting, onCancel]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeModal]);

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

    const parsedAmount = parseFloat(form.amount);

    if (!form.amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setSubmitError('Please enter a valid positive amount.');
      return;
    }
    if (!form.category_id) {
      setSubmitError('Please select a category.');
      return;
    }
    if (!form.date) {
      setSubmitError('Please select a date.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode) {
        // Direct update via Supabase Client
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            amount: parsedAmount,
            type: form.type,
            category_id: form.category_id,
            date: form.date,
            description: form.description || null,
          })
          .eq('id', transactionToEdit.id);

        if (updateError) throw updateError;
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
    'w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3',
    'text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 font-medium',
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
    'transition-all duration-200',
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
            'inline-flex items-center gap-2 px-5 py-2.5',
            'bg-indigo-600 dark:bg-indigo-500 text-white font-bold rounded-2xl',
            'hover:bg-indigo-700 dark:hover:bg-indigo-600 active:scale-95',
            'transition-all duration-200 shadow-lg shadow-indigo-200 dark:shadow-indigo-950/50',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
          ].join(' ')}
        >
          <Plus className="w-4 h-4" />
          New Transaction
        </button>
      )}

      {isMounted && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="transaction-form-title"
          className={[
            'fixed inset-0 z-50 flex items-center justify-center p-4',
            'transition-opacity duration-300',
            isVisible ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
          onClick={closeModal}
        >
          <div
            className={[
              'absolute inset-0 bg-slate-900/60 backdrop-blur-sm',
              'transition-opacity duration-300',
              isVisible ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            aria-hidden="true"
          />

          <div
            ref={panelRef}
            onClick={e => e.stopPropagation()}
            className={[
              'relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem]',
              'shadow-2xl shadow-slate-900/30 dark:shadow-black/60 border dark:border-slate-800',
              'transition-all duration-300',
              isVisible
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-95 translate-y-4',
              'overflow-hidden',
            ].join(' ')}
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

            <div className="flex items-center justify-between px-8 pt-7 pb-2">
              <div>
                <h2
                  id="transaction-form-title"
                  className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight"
                >
                  {isEditMode ? 'Edit Transaction' : 'New Transaction'}
                </h2>
                <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                  {isEditMode ? 'Update this financial record' : 'Record your income or expense'}
                </p>
              </div>

              <button
                id="close-transaction-form-btn"
                onClick={closeModal}
                disabled={isSubmitting}
                aria-label="Close form"
                className={[
                  'p-2 rounded-xl text-slate-400',
                  'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200',
                  'transition-colors duration-150',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                ].join(' ')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              id="transaction-form"
              onSubmit={handleSubmit}
              noValidate
              className="px-8 pt-4 pb-8 space-y-5"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Type <span className="text-red-400">*</span>
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
                      'flex items-center justify-center gap-2 py-3 rounded-2xl font-bold',
                      'border-2 transition-all duration-200 focus:outline-none',
                      'focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500',
                      form.type === 'income'
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-lg shadow-emerald-100 dark:shadow-emerald-900/40'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-500 hover:border-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-400',
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
                      'flex items-center justify-center gap-2 py-3 rounded-2xl font-bold',
                      'border-2 transition-all duration-200 focus:outline-none',
                      'focus:ring-2 focus:ring-offset-2 focus:ring-red-500',
                      form.type === 'expense'
                        ? 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-400 shadow-lg shadow-red-100 dark:shadow-red-900/40'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-500 hover:border-red-300 hover:text-red-600 dark:hover:text-red-400',
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
                  Amount <span className="text-red-400">*</span>
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
                  Category <span className="text-red-400">*</span>
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
                  Date <span className="text-red-400">*</span>
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
                    'flex items-start gap-3 p-4 rounded-2xl',
                    'bg-red-50 border border-red-200 text-red-700',
                    'animate-shake',
                  ].join(' ')}
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm font-semibold leading-snug">{submitError}</p>
                </div>
              )}

              {submitSuccess && (
                <div
                  role="status"
                  aria-live="polite"
                  className={[
                    'flex items-center gap-3 p-4 rounded-2xl',
                    'bg-emerald-50 border border-emerald-200 text-emerald-700',
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
                    'flex-1 py-3 rounded-2xl font-bold text-slate-700',
                    'bg-slate-100 hover:bg-slate-200 active:scale-95',
                    'transition-all duration-200',
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
                    'py-3 rounded-2xl font-bold text-white',
                    'bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 active:scale-95',
                    'shadow-lg shadow-indigo-200 dark:shadow-indigo-950/50',
                    'transition-all duration-200',
                    'disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
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