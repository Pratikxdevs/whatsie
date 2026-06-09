import { ReportTemplateCard } from "../components/reports/ReportTemplateCard";
import { GeneratedReportCard } from "../components/reports/GeneratedReportCard";
import heroBg from "../assets/ChatGPT Image Apr 6, 2026, 02_58_13 AM.png";

const reportTemplates = [
  { id: "t1", name: "Lead Summary", description: "Overview of all leads by status, source, and conversion funnel.", icon: "Users" },
  { id: "t2", name: "Messaging Performance", description: "Message volume, response times, and delivery rates across platforms.", icon: "MessageSquare" },
  { id: "t3", name: "Campaign Analytics", description: "Campaign reach, open rates, click-through rates, and ROI.", icon: "BarChart3" },
  { id: "t4", name: "Bot Performance", description: "Bot uptime, conversation handling, and AI accuracy metrics.", icon: "Bot" },
  { id: "t5", name: "Revenue Report", description: "Revenue attribution from leads, conversion values, and pipeline.", icon: "FileText" },
];

const generatedReports = [
  { id: "r1", name: "Lead Summary — May 2026", generatedAt: "May 15, 2026 at 9:30 AM", size: "2.4 MB" },
  { id: "r2", name: "Campaign Analytics — Q1 2026", generatedAt: "Apr 1, 2026 at 10:00 AM", size: "5.1 MB" },
  { id: "r3", name: "Messaging Performance — April 2026", generatedAt: "May 1, 2026 at 8:00 AM", size: "1.8 MB" },
];

export function ReportsPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 font-sans selection:bg-white/10 overflow-x-hidden">
      <div className="relative w-full h-[280px] md:h-[320px] overflow-hidden flex flex-col border-b border-white/5">
        <div className="absolute inset-0 w-full h-full bg-no-repeat bg-cover bg-center opacity-30 mix-blend-screen" style={{ backgroundImage: `url('${heroBg}')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent" />
        <div className="relative z-10 w-full px-6 md:px-12 lg:px-16 flex-1 flex flex-col justify-end pb-8">
          <h1 className="text-white font-semibold leading-[0.92] tracking-[-0.02em]" style={{ fontSize: "clamp(52px, 9vw, 108px)", lineHeight: 0.92 }}>REPORTS</h1>
          <p className="text-zinc-400 mt-4 text-lg md:text-xl max-w-2xl">Generate and download reports for your workspace.</p>
        </div>
      </div>

      <div className="w-full px-6 md:px-12 lg:px-16 py-6 md:py-8 space-y-8">
        {/* Report Templates */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Report Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {reportTemplates.map((t) => <ReportTemplateCard key={t.id} template={t} />)}
          </div>
        </section>

        {/* Generated Reports */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Generated Reports</h2>
          <div className="space-y-3">
            {generatedReports.map((r) => <GeneratedReportCard key={r.id} report={r} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
