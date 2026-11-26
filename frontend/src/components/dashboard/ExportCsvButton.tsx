import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Download, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

type ExportStatus = 'idle' | 'success' | 'error';

const ExportCsvButton: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState<ExportStatus>('idle');

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('export-platform-csv', { method: 'POST' });
      if (error) throw error;
      const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finance-pulse-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setStatus('success');
      window.setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('Export action failed:', error);
      setStatus('error');
      window.setTimeout(() => setStatus('idle'), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const label = isExporting ? 'Preparing report…' : status === 'success' ? 'Download ready' : status === 'error' ? 'Export failed' : 'Export CSV';
  const Icon = isExporting ? Loader2 : status === 'success' ? CheckCircle2 : status === 'error' ? AlertCircle : Download;

  return (
    <button type="button" onClick={handleExport} disabled={isExporting} id="export-csv-btn" aria-label="Export transaction data to CSV" aria-live="polite" className={`motion-button inline-flex min-h-10 items-center gap-2 border px-3 text-[10px] font-medium transition-colors disabled:cursor-wait disabled:opacity-60 ${status === 'success' ? 'border-positive/30 bg-positive/10 text-positive' : status === 'error' ? 'border-negative/30 bg-negative/10 text-negative' : 'border-border bg-surface text-foreground hover:bg-secondary'}`}>
      <Icon aria-hidden="true" className={`size-3.5 ${isExporting ? 'animate-spin' : ''}`} />
      <span>{label}</span>
    </button>
  );
};

export default ExportCsvButton;
