import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { billingApi } from '../../services/api';

interface InvoiceRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: string;
}

interface AiLog {
  id: string;
  model: string;
  tokens: number;
  cost: number;
  leadId: string;
  createdAt: string;
}

export function InvoiceTable() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    billingApi.getAiLogs()
      .then((data: AiLog[]) => {
        if (cancelled) return;
        const rows: InvoiceRow[] = data.map((log) => ({
          id: log.id,
          date: log.createdAt.split('T')[0],
          description: `${log.model} — ${log.tokens.toLocaleString()} tokens`,
          amount: log.cost,
          status: 'paid',
        }));
        setInvoices(rows);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-zinc-500">Loading invoices...</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left text-[11px] uppercase tracking-wider text-zinc-500 font-semibold py-3 px-4">Date</th>
            <th className="text-left text-[11px] uppercase tracking-wider text-zinc-500 font-semibold py-3 px-4">Description</th>
            <th className="text-left text-[11px] uppercase tracking-wider text-zinc-500 font-semibold py-3 px-4">Amount</th>
            <th className="text-left text-[11px] uppercase tracking-wider text-zinc-500 font-semibold py-3 px-4">Status</th>
            <th className="text-right text-[11px] uppercase tracking-wider text-zinc-500 font-semibold py-3 px-4">Action</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b border-white/5 hover:bg-zinc-900/50 transition-colors">
              <td className="py-3 px-4 text-sm text-zinc-300">{invoice.date}</td>
              <td className="py-3 px-4 text-sm text-zinc-300">{invoice.description}</td>
              <td className="py-3 px-4 text-sm text-white font-medium">${invoice.amount.toFixed(2)}</td>
              <td className="py-3 px-4">
                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-green-500/10 text-green-400">
                  {invoice.status}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <button className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
