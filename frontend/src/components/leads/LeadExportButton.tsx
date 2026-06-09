import { useState, useRef, useEffect } from 'react';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import type { Lead } from './KanbanCard';

interface LeadExportButtonProps {
  leads: Lead[];
}

export function LeadExportButton({ leads }: LeadExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const exportCSV = () => {
    const headers = ['name', 'phone', 'email', 'source', 'status', 'createdAt', 'updatedAt'];
    const rows = leads.map((l) =>
      headers.map((h) => {
        const val = (l as Record<string, unknown>)[h];
        return val ? `"${String(val).replace(/"/g, '""')}"` : '';
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    download(csv, 'leads.csv', 'text/csv');
    setOpen(false);
  };

  const exportJSON = () => {
    const json = JSON.stringify(leads, null, 2);
    download(json, 'leads.json', 'application/json');
    setOpen(false);
  };

  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#7D7D8A] hover:text-[#CCCCD4] border border-white/5 hover:border-white/10 transition-colors"
      >
        <Download className="w-4 h-4" />
        Export
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#1c1c20] border border-white/10 rounded-lg shadow-xl z-10 min-w-[160px]">
          <button onClick={exportCSV} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#CCCCD4] hover:bg-[#27272a] transition-colors rounded-t-lg">
            <FileSpreadsheet className="w-4 h-4 text-[#7D7D8A]" />
            Export CSV
          </button>
          <button onClick={exportJSON} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#CCCCD4] hover:bg-[#27272a] transition-colors rounded-b-lg">
            <FileJson className="w-4 h-4 text-[#7D7D8A]" />
            Export JSON
          </button>
        </div>
      )}
    </div>
  );
}
