/**
 * ExportCsvButton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * A specialized action button for Admins and Analysts to download a full CSV 
 * report of all transactions from the platform.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const ExportCsvButton: React.FC = () => {
    const [isExporting, setIsExporting] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleExport = async () => {
        if (isExporting) return;
        
        setIsExporting(true);
        setStatus('idle');
        
        try {
            // 1. Invoke the CSV generator Edge Function
            // This function handles authentication and role verification internally.
            const { data, error } = await supabase.functions.invoke('export-platform-csv', {
                method: 'POST', 
            });

            if (error) throw error;

            // 2. Convert raw string data to a Blob for download
            // data will contain the raw text content of the CSV returned by Deno
            const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            
            // 3. Create an ephemeral link and trigger browser behavior
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `finance-pulse-export-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            
            link.click();
            
            // 4. Teardown and Cleanup
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

    return (
        <button
            onClick={handleExport}
            disabled={isExporting}
            id="export-csv-btn"
            aria-label="Export transaction data to CSV"
            className={[
                'inline-flex items-center gap-2.5 px-6 py-2.5 rounded-2xl font-bold',
                'transition-all duration-300 active:scale-95 border-2',
                'disabled:opacity-70 disabled:cursor-wait',
                status === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-lg shadow-emerald-200' 
                    : status === 'error'
                    ? 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-400 animate-shake'
                    : 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 hover:border-indigo-500'
            ].join(' ')}
        >
            {isExporting ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Drafting report...</span>
                </>
            ) : status === 'success' ? (
                <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Download Ready!</span>
                </>
            ) : status === 'error' ? (
                <>
                    <AlertCircle className="w-4 h-4" />
                    <span>Export Failed</span>
                </>
            ) : (
                <>
                    <Download className="w-4 h-4 animate-bounce hover:animate-none" />
                    <span>Export CSV</span>
                </>
            )}
        </button>
    );
};

export default ExportCsvButton;
