import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Download, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const ExportCsvButton: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    setStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('export-platform-csv', {
        method: 'POST',
      });

      if (error) throw error;

      const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `finance-pulse-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('Export Action failed:', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const statusLabel = status === 'success' ? 'Download ready' : status === 'error' ? 'Export failed' : 'Export CSV';
  const StatusIcon = status === 'success' ? CheckCircle2 : status === 'error' ? AlertCircle : Download;

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      id="export-csv-btn"
      aria-label="Export transaction data to CSV"
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-[6px] border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fp-income)] disabled:cursor-wait disabled:opacity-60 ${status === 'success' ? 'border-[var(--fp-income)] bg-[var(--fp-bg-surface)] text-[var(--fp-income)]' : status === 'error' ? 'border-[var(--fp-expense)] bg-[var(--fp-bg-surface)] text-[var(--fp-expense)]' : 'border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] text-slate-700 hover:bg-[var(--fp-bg-canvas)] dark:text-slate-200'}`}
    >
      {isExporting ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <StatusIcon aria-hidden="true" className="size-4" />}
      <span aria-live="polite">{isExporting ? 'Preparing CSV…' : statusLabel}</span>
    </button>
  );
};

export default ExportCsvButton;
