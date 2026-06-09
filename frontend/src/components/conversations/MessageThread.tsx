import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface Message {
  id: string;
  direction: 'in' | 'out';
  content: string;
  createdAt: string;
}

interface MessageThreadProps {
  messages: Message[];
  onSend: (text: string) => void;
  loading: boolean;
}

export function MessageThread({ messages, onSend, loading }: MessageThreadProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[#7D7D8A]">
        <p className="text-sm">Select a conversation to start</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
        {messages.map((msg) => {
          const isInbound = msg.direction === 'in';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
            >
              <div
                className={`px-4 py-2.5 ${
                  isInbound
                    ? 'bg-[#1f1f22] rounded-2xl rounded-bl-sm max-w-[70%] self-start'
                    : 'bg-[#2563eb] rounded-2xl rounded-br-sm max-w-[70%] self-end'
                }`}
              >
                <p className="text-sm text-[#EBEBF0] whitespace-pre-wrap break-words">
                  {msg.content}
                </p>
              </div>
              <span className="text-xs text-[#7D7D8A] mt-1 px-1">
                {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-2 bg-[#1f1f22] rounded-xl px-4 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm text-[#EBEBF0] placeholder-[#7D7D8A] outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="text-[#2563eb] hover:text-[#3b82f6] disabled:text-[#606068] disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
