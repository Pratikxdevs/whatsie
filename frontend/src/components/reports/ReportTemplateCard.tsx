import { FileText, BarChart3, Users, MessageSquare, Bot, Download } from "lucide-react";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const iconMap: Record<string, typeof FileText> = {
  FileText, BarChart3, Users, MessageSquare, Bot,
};

export function ReportTemplateCard({ template }: { template: ReportTemplate }) {
  const Icon = iconMap[template.icon] || FileText;

  return (
    <div className="p-5 bg-zinc-900 border border-white/5 rounded-xl hover:border-white/10 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-green-400" />
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">{template.name}</h3>
      <p className="text-xs text-zinc-500 mb-4">{template.description}</p>
      <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors">
        <Download className="w-3 h-3" />
        Generate
      </button>
    </div>
  );
}
