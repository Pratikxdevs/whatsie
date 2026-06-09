import { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface LeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => void;
}

export function LeadImportModal({ isOpen, onClose, onImport }: LeadImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    // Simulate import
    await new Promise((r) => setTimeout(r, 1500));
    setResult({ success: 12, errors: 2 });
    setImporting(false);
    onImport(file);
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0f0f11] border border-white/10 rounded-xl z-50 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-[#EBEBF0]">Import Leads</h2>
          <button onClick={handleClose} className="text-[#7D7D8A] hover:text-[#EBEBF0] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          {!result ? (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-white/20 bg-white/5' : 'border-white/10 hover:border-white/15'
                }`}
              >
                <input ref={inputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-[#7D7D8A]" />
                    <div className="text-left">
                      <p className="text-sm text-[#EBEBF0]">{file.name}</p>
                      <p className="text-xs text-[#7D7D8A]">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-[#7D7D8A] mx-auto mb-3" />
                    <p className="text-sm text-[#CCCCD4]">Drop a CSV file here or click to browse</p>
                    <p className="text-xs text-[#7D7D8A] mt-1">Columns: name, phone, email, source, status</p>
                  </>
                )}
              </div>

              {/* Column mapping preview */}
              {file && (
                <div className="mt-4 bg-[#141415] rounded-lg p-3">
                  <p className="text-xs text-[#7D7D8A] font-medium mb-2">Expected columns:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['name', 'phone', 'email', 'source', 'status'].map((col) => (
                      <span key={col} className="bg-[#1f1f22] text-[#CCCCD4] text-[11px] px-2 py-0.5 rounded">{col}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Import result */
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-[#EBEBF0] mb-1">Import Complete</p>
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{result.success}</p>
                  <p className="text-xs text-[#7D7D8A]">Imported</p>
                </div>
                {result.errors > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-400">{result.errors}</p>
                    <p className="text-xs text-[#7D7D8A]">Errors</p>
                  </div>
                )}
              </div>
              {result.errors > 0 && (
                <div className="flex items-center gap-2 justify-center mt-4 text-xs text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Some rows had missing required fields</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5">
          <button onClick={handleClose} className="px-4 py-2 text-sm text-[#7D7D8A] hover:text-[#CCCCD4] transition-colors">
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="bg-white text-[#09090b] text-sm font-medium px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
