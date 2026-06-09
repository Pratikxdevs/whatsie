export interface NormalizedMessage {
  tenantId: string;
  platform: 'whatsapp';
  userId: string;
  conversationId?: string;
  message: {
    text: string | null;
    attachments: Array<{
      type: 'image' | 'video' | 'audio' | 'file' | 'document' | 'sticker' | 'location';
      url: string;
      mimeType: string;
      size: number;
      fileName?: string;
      latitude?: number;
      longitude?: number;
    }>;
    quickReplies: Array<{ label: string; payload: string }> | null;
  };
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'contact' | 'sticker' | 'button_click';
  timestamp: string;
  metadata: {
    raw: any;
    replyTo: string | null;
    isForwarded: boolean;
    mentions: string[];
    [key: string]: any;
  };
}
