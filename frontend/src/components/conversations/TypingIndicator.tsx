export function TypingIndicator({ label = "AI is typing" }: { label?: string }) {
  return (
    <div className="flex items-start gap-2 px-4">
      <div className="bg-[#1f1f22] rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[70%]">
        <div className="flex items-center gap-1">
          <span className="text-xs text-[#7D7D8A] mr-1">{label}</span>
          <span className="w-1.5 h-1.5 bg-[#7D7D8A] rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 bg-[#7D7D8A] rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 bg-[#7D7D8A] rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
