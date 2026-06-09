import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Smile, Zap, Image, FileText, MapPin, Mic, X } from 'lucide-react';
import { QuickReplyPicker } from './QuickReplyPicker';

interface MessageInputProps {
  onSend: (text: string) => void;
  onSendMedia?: (file: File) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, onSendMedia, disabled }: MessageInputProps) {
  const [input, setInput] = useState('');
  const [showQuickReply, setShowQuickReply] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [autoReply, setAutoReply] = useState(true);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (disabled) return;

    // If a file is pending, send media
    if (pendingFile && onSendMedia) {
      onSendMedia(pendingFile);
      setPendingFile(null);
      return;
    }

    if (!text) return;
    onSend(text);
    setInput('');
  }, [input, disabled, pendingFile, onSend, onSendMedia]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setShowAttach(false);
    }
    // Reset the input so the same file can be re-selected
    e.target.value = '';
  };

  const removePendingFile = () => {
    setPendingFile(null);
  };

  const triggerFilePicker = (acceptFilter: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptFilter;
      fileInputRef.current.click();
    }
    setShowAttach(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.startsWith('audio/')) return Mic;
    return FileText;
  };

  return (
    <div className="px-3 py-2.5 border-t border-white/5 bg-[#0f0f11]">
      {/* Auto-reply toggle */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-[#25D366]" />
          <span className="text-[11px] text-[#7D7D8A]">Bot auto-reply</span>
        </div>
        <button
          onClick={() => setAutoReply(!autoReply)}
          className={`relative w-8 h-4 rounded-full transition-colors ${
            autoReply ? 'bg-[#25D366]' : 'bg-[#3a3a40]'
          }`}
        >
          <span
            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
              autoReply ? 'left-[18px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {/* Pending file preview strip */}
      {pendingFile && (
        <div className="mb-2 flex items-center gap-2 bg-[#1a1a1d] border border-white/10 rounded-lg px-3 py-2">
          {(() => {
            const Icon = getFileIcon(pendingFile);
            return <Icon className="w-4 h-4 text-[#25D366] flex-shrink-0" />;
          })()}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#EBEBF0] truncate">{pendingFile.name}</p>
            <p className="text-[10px] text-[#7D7D8A]">{formatFileSize(pendingFile.size)}</p>
          </div>
          <button
            onClick={removePendingFile}
            className="text-[#7D7D8A] hover:text-[#EBEBF0] transition-colors p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 bg-[#1f1f22] rounded-xl px-3 py-2">
        {/* Attach button */}
        <div className="relative">
          <button
            onClick={() => setShowAttach(!showAttach)}
            className="text-[#7D7D8A] hover:text-[#EBEBF0] transition-colors p-1"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          {showAttach && (
            <div className="absolute bottom-full left-0 mb-2 bg-[#1c1c20] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50 min-w-[140px]">
              {[
                { icon: Image, label: 'Image', accept: 'image/*' },
                { icon: Mic, label: 'Audio', accept: 'audio/*' },
                { icon: FileText, label: 'Document', accept: '.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx' },
                { icon: MapPin, label: 'Location' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.accept) {
                      triggerFilePicker(item.accept);
                    } else {
                      setShowAttach(false);
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#EBEBF0] hover:bg-[#141415] transition-colors"
                >
                  <item.icon className="w-3.5 h-3.5 text-[#7D7D8A]" />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick reply button */}
        <div className="relative">
          <button
            onClick={() => setShowQuickReply(!showQuickReply)}
            className="text-[#7D7D8A] hover:text-[#EBEBF0] transition-colors p-1"
          >
            <Zap className="w-4 h-4" />
          </button>
          {showQuickReply && (
            <QuickReplyPicker
              onSelect={(text) => setInput(text)}
              onClose={() => setShowQuickReply(false)}
            />
          )}
        </div>

        {/* Emoji button */}
        <button className="text-[#7D7D8A] hover:text-[#EBEBF0] transition-colors p-1">
          <Smile className="w-4 h-4" />
        </button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={pendingFile ? "Add a caption (optional)..." : "Type a message..."}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-sm text-[#EBEBF0] placeholder-[#7D7D8A] outline-none resize-none max-h-[120px] py-1"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!pendingFile && !input.trim() || disabled}
          className="text-[#25D366] hover:text-[#2ecc71] disabled:text-[#606068] disabled:cursor-not-allowed transition-colors p-1"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,audio/*,.pdf,.doc,.docx"
      />
    </div>
  );
}
