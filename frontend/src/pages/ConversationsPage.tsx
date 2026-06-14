import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { MessageBubble } from "../components/conversations/MessageBubble";
import { MessageInput } from "../components/conversations/MessageInput";
import { ContactSidebar } from "../components/conversations/ContactSidebar";
import { TypingIndicator } from "../components/conversations/TypingIndicator";
import { Search, MessageSquare, Eye, Loader2 } from "lucide-react";
import heroBg from "../assets/ChatGPT Image Apr 6, 2026, 02_58_13 AM.png";
import { conversationApi, botApi } from "../services/api";
import { socketManager } from "../services/socketManager";
import { NoBotGate } from "../components/ui/NoBotGate";
import { useAuth } from "../contexts/AuthContext";
import { format, isToday, isYesterday } from "date-fns";

// ---------------------------------------------------------------------------
// Types — Evolution API shapes
// ---------------------------------------------------------------------------
interface ChatItem {
  id: string;
  name: string;
  jid: string;
  pushName?: string;
  lastMessage?: string;
  lastMessageTimestamp?: string;
  unreadCount?: number;
  profilePicture?: string;
  archived?: boolean;
  pinned?: boolean;
  isGroup?: boolean;
  sessionName?: string;
  botName?: string;
}

interface ChatMessage {
  id: string;
  key: { remoteJid: string; fromMe: boolean; id: string };
  pushName?: string;
  message?: any;
  messageTimestamp: number;
  fromMe: boolean;
  status?: string;
  update?: number;
}


const filterTabs = ["All", "Unread", "Archived"] as const;
type FilterTab = typeof filterTabs[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatChatTime(ts?: string | number): string {
  if (!ts) return "";
  const date = typeof ts === "number" ? new Date(ts * 1000) : new Date(ts);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

function extractTextFromMessage(msg: ChatMessage): string {
  if (!msg.message) return "";
  const m = msg.message;
  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
  if (m.imageMessage?.caption) return `[Image] ${m.imageMessage.caption}`;
  if (m.videoMessage?.caption) return `[Video] ${m.videoMessage.caption}`;
  if (m.imageMessage) return "[Image]";
  if (m.videoMessage) return "[Video]";
  if (m.audioMessage) return "[Audio]";
  if (m.documentMessage) return `[Document] ${m.documentMessage.fileName || ""}`;
  if (m.locationMessage) return "[Location]";
  if (m.contactMessage) return "[Contact]";
  if (m.stickerMessage) return "[Sticker]";
  return "[Message]";
}

function getMediaType(msg: ChatMessage): string | null {
  if (!msg.message) return null;
  if (msg.message.imageMessage) return "image";
  if (msg.message.videoMessage) return "video";
  if (msg.message.audioMessage) return "audio";
  if (msg.message.documentMessage) return "document";
  if (msg.message.stickerMessage) return "sticker";
  if (msg.message.locationMessage) return "location";
  return null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function SkeletonChatItem() {
  return (
    <div className="px-4 py-3 border-b border-zinc-800 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-zinc-800" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-zinc-800 rounded w-24" />
          <div className="h-3 bg-zinc-800 rounded w-40" />
        </div>
        <div className="h-3 bg-zinc-800 rounded w-10" />
      </div>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3 p-8">
      <div className="text-zinc-700">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-zinc-600">{subtitle}</p>
    </div>
  );
}

function ChatListItem({
  chat,
  isSelected,
  onClick,
  profilePic,
}: {
  chat: ChatItem;
  isSelected: boolean;
  onClick: () => void;
  profilePic: string | null;
}) {
  const initials = (chat.name || chat.jid || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 border-b border-zinc-800 text-left transition-colors hover:bg-zinc-900 ${
        isSelected ? "bg-zinc-900" : "bg-transparent"
      }`}
    >
      <div className="flex items-center gap-3">
        {profilePic ? (
          <img
            src={profilePic}
            alt={chat.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-300 shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-100 truncate flex items-center gap-2">
              {chat.name || chat.pushName || chat.jid}
              {chat.botName && (
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[9px] uppercase tracking-wider font-semibold">
                  {chat.botName}
                </span>
              )}
            </span>
            <span className="text-[10px] text-zinc-500 shrink-0 ml-2">
              {formatChatTime(chat.lastMessageTimestamp)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs text-zinc-500 truncate max-w-[200px]">
              {typeof chat.lastMessage === 'object' 
                ? extractTextFromMessage(chat.lastMessage as any) || "No messages yet"
                : (chat.lastMessage || "No messages yet")}
            </span>
            {(chat.unreadCount ?? 0) > 0 && (
              <span className="ml-2 shrink-0 min-w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white px-1">
                {chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function ConversationsPage() {
  const { user } = useAuth();

  // Bot gate check
  const [hasBots, setHasBots] = useState<boolean | null>(null); // null = loading

  // Chat list state
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [chatsError, setChatsError] = useState<string | null>(null);

  // Selection state
  const [selectedJid, setSelectedJid] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("All");
  const [showSidebar, setShowSidebar] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);

  // Profile pictures cache
  const [profilePics, setProfilePics] = useState<Record<string, string | null>>({});

  // Typing indicator
  // @ts-ignore — setter will be wired to socket typing events
  const [contactTyping, setContactTyping] = useState(false);

  // Read receipts
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  // Socket.IO
  const selectedJidRef = useRef(selectedJid);
  useEffect(() => { selectedJidRef.current = selectedJid; }, [selectedJid]);

  // -----------------------------------------------------------------------
  // Bot gate check — load bots to decide if we show the conversation UI
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bots = await botApi.getWorkspaces();
        if (!cancelled) setHasBots(Array.isArray(bots) && bots.length > 0);
      } catch {
        if (!cancelled) setHasBots(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // -----------------------------------------------------------------------
  // Socket.IO connection (singleton)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!user?.tenantId) return;

    socketManager.connect(user.tenantId);

    const handleNewMessage = (payload: { chat?: any; message?: any }) => {
      const { chat, message } = payload;
      if (!chat || !message) return;

      const msgJid = message.key?.remoteJid || chat.jid;
      if (!msgJid) return;

      // Update chat list: move chat to top, update preview
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.jid === msgJid);
        const text = extractTextFromMessage(message);
        const ts = message.messageTimestamp
          ? new Date(message.messageTimestamp * 1000).toISOString()
          : new Date().toISOString();

        const updatedChat: ChatItem = {
          ...(idx >= 0 ? prev[idx] : chat),
          jid: msgJid,
          name: chat.name || chat.pushName || msgJid,
          lastMessage: text,
          lastMessageTimestamp: ts,
          unreadCount: selectedJidRef.current === msgJid
            ? 0
            : (idx >= 0 ? (prev[idx].unreadCount ?? 0) + 1 : 1),
        };

        const rest = idx >= 0 ? prev.filter((_, i) => i !== idx) : prev;
        return [updatedChat, ...rest];
      });

      // If the message belongs to the currently open chat, append it
      if (msgJid === selectedJidRef.current) {
        setMessages((prev) => {
          if (message.id && prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    };

    socketManager.on('new_message', handleNewMessage);
    return () => { socketManager.off('new_message', handleNewMessage); };
  }, [user?.tenantId]);

  // -----------------------------------------------------------------------
  // Load chats
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setChatsLoading(true);
        setChatsError(null);
        const data = await conversationApi.getChats();
        if (!cancelled) {
          const normalizedChats = (Array.isArray(data) ? data : []).map(c => ({
            ...c,
            jid: c.jid || c.id || c.remoteJid
          }));
          setChats(normalizedChats);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setChatsError(err instanceof Error ? err.message : "Failed to load chats");
        }
      } finally {
        if (!cancelled) setChatsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // -----------------------------------------------------------------------
  // Load messages when a chat is selected
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!selectedJid) {
      setMessages([]);
      setSelectedChat(null);
      return;
    }

    const chat = chats.find((c) => c.jid === selectedJid);
    setSelectedChat(chat || null);

    let cancelled = false;
    (async () => {
      if (!chat?.sessionName) return;
      try {
        setMessagesLoading(true);
        const data = await conversationApi.getChatMessages(selectedJid, chat.sessionName);
        if (!cancelled) setMessages(Array.isArray(data) ? data : []);
      } catch (err: unknown) {
        if (!cancelled) {
          console.error("Failed to load messages:", err);
          setMessages([]);
        }
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedJid, chats]);

  // -----------------------------------------------------------------------
  // Mark messages as read when opening a conversation
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!selectedJid || !selectedChat?.sessionName) return;
    const unread = messages.filter(
      (m) => !m.fromMe && m.status !== "read" && m.status !== "played"
    );
    if (unread.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        setIsMarkingRead(true);
        await conversationApi.markAsRead(
          selectedChat.sessionName!,
          unread.map((m) => ({
            remoteJid: m.key.remoteJid,
            fromMe: m.key.fromMe,
            id: m.key.id,
          }))
        );
        // Zero out unread count on the chat
        setChats((prev) =>
          prev.map((c) =>
            c.jid === selectedJid ? { ...c, unreadCount: 0 } : c
          )
        );
      } catch {
        // Non-critical — swallow
      } finally {
        if (!cancelled) setIsMarkingRead(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedJid, messages]);

  // -----------------------------------------------------------------------
  // Fetch profile pictures for visible chats
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (chats.length === 0) return;
    let cancelled = false;
    const fetchPics = async () => {
      const toFetch = chats.filter(
        (c) => !(c.jid in profilePics) && !c.jid.includes("g.us")
      );
      const results: Record<string, string | null> = {};
      await Promise.allSettled(
        toFetch.slice(0, 20).map(async (c) => {
          if (!c.sessionName) return;
          try {
            const url = await conversationApi.getProfilePicture(c.jid, c.sessionName);
            results[c.jid] = url;
          } catch {
            results[c.jid] = null;
          }
        })
      );
      if (!cancelled && Object.keys(results).length > 0) {
        setProfilePics((prev) => ({ ...prev, ...results }));
      }
    };
    fetchPics();
    return () => { cancelled = true; };
  }, [chats]);

  // -----------------------------------------------------------------------
  // Send message via Evolution API
  // -----------------------------------------------------------------------
  const handleSend = useCallback(async (text: string) => {
    if (!selectedJid || !selectedChat?.sessionName) return;
    setSendError(null);
    try {
      await conversationApi.sendWhatsAppMessage(selectedJid, selectedChat.sessionName, text);

      // Append optimistic message to thread
      const optimistic: ChatMessage = {
        id: `opt-${Date.now()}`,
        key: { remoteJid: selectedJid, fromMe: true, id: `opt-${Date.now()}` },
        pushName: "Me",
        message: { conversation: text },
        messageTimestamp: Math.floor(Date.now() / 1000),
        fromMe: true,
        status: "pending",
      };
      setMessages((prev) => [...prev, optimistic]);

      // Update chat preview
      setChats((prev) =>
        prev.map((c) =>
          c.jid === selectedJid
            ? {
                ...c,
                lastMessage: text,
                lastMessageTimestamp: new Date().toISOString(),
              }
            : c
        )
      );

      // Send typing stopped
      conversationApi.sendTyping(selectedChat.sessionName, selectedJid, "paused").catch(() => {});
    } catch (err: unknown) {
      const axiosErr = err as any;
      const upstreamMsg = axiosErr?.response?.data?.details?.response?.message;
      const detailsMsg = axiosErr?.response?.data?.details?.message || axiosErr?.response?.data?.details;
      const topMsg = axiosErr?.response?.data?.error;
      // Check for "number not on WhatsApp" scenario
      if (Array.isArray(upstreamMsg) && upstreamMsg.some((m: any) => m.exists === false)) {
        setSendError("This number is not registered on WhatsApp.");
      } else if (typeof detailsMsg === 'string') {
        setSendError(detailsMsg);
      } else if (typeof topMsg === 'string') {
        setSendError(topMsg);
      } else if (err instanceof Error) {
        setSendError(err.message);
      } else {
        setSendError("Failed to send message — please try again.");
      }
    }
  }, [selectedJid, selectedChat]);

  // -----------------------------------------------------------------------
  // Send media via Evolution API
  // -----------------------------------------------------------------------
  const handleSendMedia = useCallback(async (file: File) => {
    if (!selectedJid || !selectedChat?.sessionName) return;
    setSendError(null);
    try {
      let mediaType = "document";
      if (file.type.startsWith("image/")) mediaType = "image";
      else if (file.type.startsWith("audio/")) mediaType = "audio";
      else if (file.type.startsWith("video/")) mediaType = "video";

      const res = await conversationApi.sendWhatsAppMedia(
        selectedJid,
        selectedChat.sessionName,
        file,
        mediaType,
        file.name
      );

      if (res?.key?.id) {
        // Optimistically add to UI if needed, Evolution returns a key
      }

      setChats((prev) =>
        prev.map((c) =>
          c.jid === selectedJid
            ? {
                ...c,
                lastMessage: `[${mediaType}] ${file.name}`,
                lastMessageTimestamp: new Date().toISOString(),
              }
            : c
        )
      );
    } catch (err: unknown) {
      setSendError((err as any)?.details?.message || (err as any)?.error || (err instanceof Error ? err.message : "Failed to send media"));
    }
  }, [selectedJid]);

  // -----------------------------------------------------------------------
  // Filtered chats
  // -----------------------------------------------------------------------
  const filteredChats = useMemo(() => {
    let result = [...chats];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(q) ||
          (c.pushName || "").toLowerCase().includes(q) ||
          (c.lastMessage || "").toLowerCase().includes(q) ||
          (c.jid || "").includes(q)
      );
    }

    if (activeFilter === "Unread") {
      result = result.filter((c) => (c.unreadCount ?? 0) > 0);
    }
    if (activeFilter === "Archived") {
      result = result.filter((c) => (c as any).archived);
    } else {
      result = result.filter((c) => !(c as any).archived);
    }

    return result;
  }, [chats, searchQuery, activeFilter]);

  // -----------------------------------------------------------------------
  // Map ChatMessage → MessageData for MessageBubble
  // -----------------------------------------------------------------------
  const mapMessageToProps = (msg: ChatMessage) => ({
    id: msg.id,
    direction: (msg.fromMe ? "out" : "in") as "in" | "out",
    content: extractTextFromMessage(msg),
    messageType: getMediaType(msg) || "text",
    createdAt: new Date(msg.messageTimestamp * 1000).toISOString(),
    read: msg.status === "read" || msg.status === "played",
    metadata: msg.message
      ? {
          mediaUrl: msg.message.imageMessage?.url || msg.message.videoMessage?.url || msg.message.audioMessage?.url || msg.message.documentMessage?.url || undefined,
        }
      : undefined,
  });

  // -----------------------------------------------------------------------
  // Map ChatItem → ContactSidebar conversation shape
  // -----------------------------------------------------------------------
  const mapChatToSidebarProps = (chat: ChatItem) => ({
    id: chat.jid,
    platform: "whatsapp",
    status: (chat as any).archived ? "archived" : "open",
    createdAt: chat.lastMessageTimestamp || new Date().toISOString(),
    botName: "",
    contactName: chat.name || chat.pushName || chat.jid,
    contactPhone: chat.jid.replace(/@.*$/, "").replace("+", ""),
    contactEmail: undefined,
    source: "whatsapp",
    leadStatus: "new",
    messageCount: messages.length,
  });

  const selectedContactName = selectedChat
    ? selectedChat.name || selectedChat.pushName || selectedChat.jid
    : "";
  const selectedInitials = selectedContactName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (hasBots === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (hasBots === false) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200">
        <NoBotGate
          title="Connect a bot to view conversations"
          description="Conversations are synced from your WhatsApp bots. Connect your first bot to start seeing real-time chats here."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-emerald-500/20 overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative w-full h-[280px] md:h-[320px] overflow-hidden flex flex-col border-b border-zinc-800">
        <div
          className="absolute inset-0 w-full h-full bg-no-repeat bg-cover bg-center opacity-30 mix-blend-screen"
          style={{ backgroundImage: `url('${heroBg}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
        <div className="relative z-10 w-full page-padding flex-1 flex flex-col justify-end pb-8">
          <h1
            className="text-white font-semibold leading-[0.92] tracking-[-0.02em]"
            style={{ fontSize: "clamp(52px, 9vw, 108px)", lineHeight: 0.92 }}
          >
            CONVERSATIONS
          </h1>
          <p className="text-zinc-400 mt-4 text-lg md:text-xl max-w-2xl">
            Real-time WhatsApp conversations powered by Evolution API.
          </p>
        </div>
      </div>

      {/* 3-Panel Layout */}
      <div className="w-full page-padding py-6 md:py-8">
        <div className="flex gap-4 h-[calc(100vh-400px)] min-h-[500px]">

          {/* ─── LEFT: Chat List ─── */}
          <div className="w-80 flex-shrink-0 flex flex-col bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, message, or number..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 px-3 py-2 border-b border-zinc-800">
              {filterTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeFilter === tab
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {tab}
                  {tab === "Unread" && (
                    <span className="ml-1 text-[10px]">
                      ({chats.filter((c) => (c.unreadCount ?? 0) > 0).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Chat Items */}
            <div className="flex-1 overflow-y-auto">
              {chatsLoading ? (
                <div className="space-y-0">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonChatItem key={i} />
                  ))}
                </div>
              ) : chatsError ? (
                <div className="p-4 text-center text-red-400 text-sm">{chatsError}</div>
              ) : filteredChats.length === 0 ? (
                <div className="p-4 text-center text-zinc-500 text-sm">
                  {searchQuery ? "No chats match your search" : "No WhatsApp chats yet"}
                </div>
              ) : (
                filteredChats.map((chat) => (
                  <ChatListItem
                    key={chat.jid}
                    chat={chat}
                    isSelected={chat.jid === selectedJid}
                    onClick={() => setSelectedJid(chat.jid)}
                    profilePic={profilePics[chat.jid] ?? null}
                  />
                ))
              )}
            </div>
          </div>

          {/* ─── CENTER: Message Thread ─── */}
          <div className="flex-1 flex flex-col bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
            {selectedJid && selectedChat ? (
              <>
                {/* Thread Header */}
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {profilePics[selectedJid] ? (
                      <img
                        src={profilePics[selectedJid]!}
                        alt={selectedContactName}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-300">
                        {selectedInitials}
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-zinc-100">
                        {selectedContactName}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                          WhatsApp
                        </span>
                        {isMarkingRead && (
                          <span className="text-[10px] text-zinc-500">Marking read...</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSidebar(!showSidebar)}
                      className={`p-1.5 rounded-md transition-colors ${
                        showSidebar
                          ? "text-emerald-400 bg-emerald-500/10"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                      }`}
                      title="Toggle contact info"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                  {messagesLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                      <span className="text-sm text-zinc-500">Loading messages...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <EmptyState
                      icon={<MessageSquare className="w-10 h-10" />}
                      title="No messages yet"
                      subtitle="Start a conversation by sending a message below."
                    />
                  ) : (
                    messages.map((msg) => (
                      <MessageBubble key={msg.id} message={mapMessageToProps(msg)} />
                    ))
                  )}
                  {contactTyping && (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-medium text-zinc-400">
                        {selectedInitials}
                      </div>
                      <TypingIndicator label={`${selectedContactName} is typing...`} />
                    </div>
                  )}
                </div>

                {/* Send error */}
                {sendError && (
                  <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs flex items-center justify-between">
                    <span>{sendError}</span>
                    <button
                      onClick={() => setSendError(null)}
                      className="text-red-400 hover:text-red-300 ml-2 text-xs"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Input */}
                <MessageInput
                  onSend={handleSend}
                  onSendMedia={handleSendMedia}
                />
              </>
            ) : (
              <EmptyState
                icon={<MessageSquare className="w-12 h-12" />}
                title="Select a conversation"
                subtitle="Choose a chat from the left panel to view messages."
              />
            )}
          </div>

          {/* ─── RIGHT: Contact Sidebar ─── */}
          {selectedChat && showSidebar && (
            <ContactSidebar
              conversation={mapChatToSidebarProps(selectedChat)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
