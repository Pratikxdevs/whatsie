import { useState, useRef } from "react";
import { X, Upload, FileText, Check, Loader2 } from "lucide-react";

interface ContactImportModalProps {
  onClose: () => void;
  onImport: (data: any[]) => void;
}

export function ContactImportModal({ onClose, onImport }: ContactImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [step, setStep] = useState<"upload" | "mapping" | "importing" | "done">("upload");
  const [importCount, setImportCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === "text/csv") {
      setFile(selected);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter(Boolean).map((line) => line.split(","));
        if (lines.length > 0) {
          setHeaders(lines[0]);
          setPreview(lines.slice(1, 6));
          setStep("mapping");
        }
      };
      reader.readAsText(selected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const selected = e.dataTransfer.files[0];
    if (selected?.type === "text/csv") {
      const fakeEvent = { target: { files: [selected] } } as any;
      handleFileSelect(fakeEvent);
    }
  };

  const handleImport = async () => {
    setStep("importing");
    await new Promise((r) => setTimeout(r, 1500));
    setImportCount(preview.length);
    setStep("done");
    onImport(preview);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f0f11] border border-white/10 rounded-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-base font-semibold text-white">Import Contacts</h3>
          <button onClick={onClose} className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center hover:border-green-500/30 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-300 mb-1">Drop your CSV file here</p>
              <p className="text-xs text-zinc-500">or click to browse</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Step 2: Mapping Preview */}
          {step === "mapping" && file && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg">
                <FileText className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm text-white font-medium">{file.name}</p>
                  <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">
                  Detected Columns
                </p>
                <div className="flex flex-wrap gap-2">
                  {headers.map((h, i) => (
                    <span key={i} className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300 font-mono">
                      {h.trim()}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">
                  Preview (first {preview.length} rows)
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5">
                        {headers.map((h, i) => (
                          <th key={i} className="text-left py-2 px-2 text-zinc-500 font-mono">{h.trim()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, ri) => (
                        <tr key={ri} className="border-b border-white/5">
                          {row.map((cell, ci) => (
                            <td key={ci} className="py-2 px-2 text-zinc-300">{cell.trim()}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                onClick={handleImport}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm rounded-lg transition-colors"
              >
                Import {preview.length} Contacts
              </button>
            </div>
          )}

          {/* Step 3: Importing */}
          {step === "importing" && (
            <div className="py-8 text-center">
              <Loader2 className="w-10 h-10 text-green-400 mx-auto mb-3 animate-spin" />
              <p className="text-sm text-zinc-300">Importing contacts...</p>
            </div>
          )}

          {/* Step 4: Done */}
          {step === "done" && (
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-sm text-white font-medium mb-1">Import Complete</p>
              <p className="text-xs text-zinc-500">{importCount} contacts imported successfully</p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
