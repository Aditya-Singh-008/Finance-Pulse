import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight, Clock, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useTransactions } from '../../hooks/useTransactions';
import type { Transaction } from '../../hooks/useTransactions';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import ConfirmationModal from '../common/ConfirmationModal';
import TransactionForm from './TransactionForm';
import type { Category } from './TransactionForm';

interface TransactionListProps {
  selectedUserId?: string | null;
  onTransactionChange?: () => void;
  userRole?: string | null;
  categories?: Category[];
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const TransactionList = ({
  selectedUserId = null,
  onTransactionChange,
  userRole = null,
  categories = [],
}: TransactionListProps) => {
  const { transactions, loading, error, refetch } = useTransactions(5, selectedUserId);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const handleDelete = async () => {
    if (!idToDelete) return;

    const transactionId = idToDelete;
    setIdToDelete(null);
    setIsDeleting(transactionId);

    try {
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (deleteError) throw deleteError;

      await refetch();
      toast.success('Transaction deleted successfully');
      onTransactionChange?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete transaction';
      toast.error(message);
      console.error('Delete Error:', err);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <section aria-labelledby="recent-activity-title" className="rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] p-4 sm:p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[6px] bg-[var(--fp-bg-sunken)] text-[var(--fp-brand-primary)]">
            <Clock aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0">
            <h2 id="recent-activity-title" className="font-serif text-xl tracking-[-0.02em] text-slate-900 dark:text-slate-100">
              Recent Activity
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Your five latest transactions</p>
          </div>
        </div>
        <Link
          to="/transactions"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[6px] px-2 text-xs font-semibold text-[var(--fp-brand-primary)] transition-colors hover:bg-[var(--fp-bg-sunken)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fp-brand-primary)] dark:text-[#b7c7ad] sm:px-3"
        >
          <span className="hidden sm:inline">View all in Ledger</span>
          <span className="sm:hidden">Ledger</span>
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </header>

      {error ? (
        <div role="alert" className="flex min-h-36 flex-col items-center justify-center rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)] px-4 text-center">
          <AlertCircle aria-hidden="true" className="mb-2 size-5 text-[var(--fp-expense)]" />
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Couldn’t load recent activity</p>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{error}</p>
          <button type="button" onClick={refetch} className="mt-3 min-h-11 rounded-[6px] px-3 text-sm font-semibold text-[var(--fp-brand-primary)] hover:bg-[var(--fp-bg-sunken)] dark:text-[#b7c7ad]">
            Try again
          </button>
        </div>
      ) : loading ? (
        <ul aria-label="Loading recent transactions" className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((item) => (
            <li key={item} aria-hidden="true" className="h-[68px] animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
          ))}
        </ul>
      ) : transactions.length === 0 ? (
        <div className="flex min-h-36 flex-col items-center justify-center rounded-[6px] border border-dashed border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)] px-4 text-center">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">No transactions yet</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Your recent income and spending will appear here.</p>
        </div>
      ) : (
        <ul aria-label="Recent transactions" className="flex flex-col gap-2">
          {transactions.map((transaction: Transaction) => {
            const isIncome = transaction.type === 'income';
            const ActionIcon = isIncome ? ArrowUpRight : ArrowDownRight;

            return (
              <li
                key={transaction.id}
                className="fp-activity-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[6px] border border-[var(--fp-border-default)] px-2 py-2 sm:gap-3 sm:px-3"
              >
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-[6px] ${isIncome ? 'bg-[var(--fp-bg-sunken)] text-[var(--fp-income)]' : 'bg-[var(--fp-bg-sunken)] text-[var(--fp-expense)]'}`}>
                    <ActionIcon aria-hidden="true" className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {transaction.description || (isIncome ? 'Received Funds' : 'Shared Payment')}
                    </p>
                    <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="max-w-28 truncate rounded-[6px] bg-[var(--fp-bg-sunken)] px-1.5 py-0.5 font-medium text-slate-700 dark:text-slate-200">
                        {transaction.category?.name || 'General'}
                      </span>
                      <time className="fp-num shrink-0" dateTime={transaction.date}>
                        {formatDate(transaction.date)}
                      </time>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                  <span className={`fp-num whitespace-nowrap text-xs font-semibold sm:text-sm ${isIncome ? 'text-[var(--fp-income)]' : 'text-[var(--fp-expense)]'}`}>
                    {isIncome ? '+' : '−'}{currencyFormatter.format(transaction.amount)}
                  </span>
                  <div className="fp-row-actions flex items-center gap-0.5">
                    {isDeleting === transaction.id ? (
                      <span aria-label="Deleting transaction" role="status" className="flex size-11 items-center justify-center">
                        <Loader2 aria-hidden="true" className="size-4 animate-spin text-[var(--fp-expense)]" />
                      </span>
                    ) : (
                      <>
                        {userRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => setEditingTx(transaction)}
                            className="flex size-11 items-center justify-center rounded-[6px] text-slate-500 transition-colors hover:bg-[var(--fp-bg-sunken)] hover:text-[var(--fp-brand-primary)] focus-visible:outline-2 focus-visible:outline-[var(--fp-brand-primary)] dark:text-slate-300"
                            aria-label={`Edit ${transaction.description || 'transaction'}`}
                            title="Edit transaction"
                          >
                            <Pencil aria-hidden="true" className="size-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIdToDelete(transaction.id)}
                          disabled={isDeleting === transaction.id}
                          className="flex size-11 items-center justify-center rounded-[6px] text-slate-500 transition-colors hover:bg-[var(--fp-bg-sunken)] hover:text-[var(--fp-expense)] focus-visible:outline-2 focus-visible:outline-[var(--fp-expense)] disabled:opacity-50 dark:text-slate-300"
                          aria-label={`Delete ${transaction.description || 'transaction'}`}
                          title="Delete transaction"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmationModal
        isOpen={!!idToDelete}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone and will update your dashboard metrics."
        confirmLabel="Delete"
        isDanger
        onConfirm={handleDelete}
        onCancel={() => setIdToDelete(null)}
      />

      {editingTx && (
        <TransactionForm
          transactionToEdit={editingTx}
          categories={categories}
          onSuccess={() => {
            setEditingTx(null);
            void refetch();
            onTransactionChange?.();
          }}
          onCancel={() => setEditingTx(null)}
        />
      )}
    </section>
  );
};

export default TransactionList;
