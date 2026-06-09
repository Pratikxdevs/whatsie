import { Check, CheckCheck, FileText, MapPin, Play, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface MessageData {
  id: string;
  direction: 'in' | 'out';
  content: string;
  messageType?: string;
  createdAt: string;
  read?: boolean;
  metadata?: Record<string, unknown>;
}

interface MessageBubbleProps {
  message: MessageData;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'out';

  const renderContent = () => {
    const mediaUrl = (message.metadata?.mediaUrl as string) || undefined;

    switch (message.messageType) {
      case 'image':
        return (
          <div className="rounded-lg overflow-hidden bg-[#1a1a1d] max-w-[280px]">
            {mediaUrl ? (
              <img src={mediaUrl} alt="Image" className="max-w-xs rounded-lg w-full" />
            ) : (
              <div className="w-full h-40 bg-[#2a2a2d] flex items-center justify-center text-[#7D7D8A] text-xs">
                Image Preview
              </div>
            )}
            {message.content && message.content !== '[Image]' && (
              <p className="text-sm text-[#EBEBF0] mt-1 px-1">{message.content}</p>
            )}
          </div>
        );
      case 'video':
        return (
          <div className="rounded-lg overflow-hidden bg-[#1a1a1d] max-w-[320px]">
            {mediaUrl ? (
              <video src={mediaUrl} controls className="w-full rounded-lg" />
            ) : (
              <div className="w-full h-40 bg-[#2a2a2d] flex items-center justify-center text-[#7D7D8A] text-xs">
                Video
              </div>
            )}
            {message.content && message.content !== '[Video]' && (
              <p className="text-sm text-[#EBEBF0] mt-1 px-1">{message.content}</p>
            )}
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-2 bg-[#1a1a1d] rounded-lg px-3 py-2 min-w-[200px]">
            {mediaUrl ? (
              <audio controls src={mediaUrl} className="w-full" />
            ) : (
              <>
                <button className="w-8 h-8 rounded-full bg-[#2563eb] flex items-center justify-center flex-shrink-0">
                  <Play className="w-3.5 h-3.5 text-white ml-0.5" />
                </button>
                <div className="flex-1">
                  <div className="w-full h-1.5 bg-[#2a2a2d] rounded-full overflow-hidden">
                    <div className="w-0 h-full bg-[#2563eb] rounded-full" />
                  </div>
                  <span className="text-[10px] text-[#7D7D8A] mt-0.5">0:00</span>
                </div>
              </>
            )}
          </div>
        );
      case 'document':
        return (
          <div className="flex items-center gap-2 bg-[#1a1a1d] rounded-lg px-3 py-2">
            <FileText className="w-5 h-5 text-[#2563eb]" />
            <span className="text-sm text-[#EBEBF0]">{message.content}</span>
            {mediaUrl && (
              <a
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="text-[#2563eb] underline text-sm ml-1"
              >
                <Download className="w-4 h-4 inline" />
              </a>
            )}
          </div>
        );
      case 'location':
        return (
          <div className="flex items-center gap-2 bg-[#1a1a1d] rounded-lg px-3 py-2">
            <MapPin className="w-5 h-5 text-[#25D366]" />
            {message.metadata?.latitude != null && message.metadata?.longitude != null ? (
              <a
                href={`https://maps.google.com/?q=${message.metadata.latitude},${message.metadata.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#2563eb] underline cursor-pointer"
              >
                View on Map
              </a>
            ) : (
              <span className="text-sm text-[#2563eb] underline cursor-pointer">View Location</span>
            )}
          </div>
        );
      default:
        return (
          <p className="text-sm text-[#EBEBF0] whitespace-pre-wrap break-words">
            {message.content}
          </p>
        );
    }
  };

  return (
    <div className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}>
      <div
        className={`px-3 py-2 ${
          isOutbound
            ? 'bg-[#005c4b] rounded-2xl rounded-br-sm max-w-[70%]'
            : 'bg-[#1f1f22] rounded-2xl rounded-bl-sm max-w-[70%]'
        }`}
      >
        {renderContent()}
      </div>
      <span className="text-[10px] text-[#7D7D8A] mt-0.5 px-1 flex items-center gap-1">
        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
        {isOutbound && (
          message.read ? (
            <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
          ) : (
            <Check className="w-3 h-3 text-[#7D7D8A]" />
          )
        )}
      </span>
    </div>
  );
}
