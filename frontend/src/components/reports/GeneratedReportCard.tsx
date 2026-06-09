import { FileText, Download, Trash2, Clock } from "lucide-react";

interface GeneratedReport {
  id: string;
  name: string;
  generatedAt: string;
  size: string;
}

export function GeneratedReportCard({ report }: { report: GeneratedReport }) {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-900 border border-white/5 rounded-xl">
      <div className="flex items-center gap-3">
        <FileText className="w-5 h-5 text-zinc-500" />
        <div>
          <p className="text-sm font-medium text-white">{report.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Clock className="w-3 h-3 text-zinc-600" />
            <span className="text-xs text-zinc-500">{report.generatedAt}</span>
            <span className="text-xs text-zinc-600">{report.size}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-1.5 text-zinc-500 hover:text-green-400 transition-colors">
          <Download className="w-4 h-4" />
        </button>
        <button className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
