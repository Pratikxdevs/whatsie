import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { ConversationListItem } from "../components/conversations/ConversationListItem";
import { MessageBubble } from "../components/conversations/MessageBubble";
import { MessageInput } from "../components/conversations/MessageInput";
import { ContactSidebar } from "../components/conversations/ContactSidebar";
import { TypingIndicator } from "../components/conversations/TypingIndicator";
import { PlatformBadge } from "../components/conversations/PlatformBadge";
import { Search, Filter, MessageSquare } from "lucide-react";
import heroBg from "../assets/ChatGPT Image Apr 6, 2026, 02_58_13 AM.png";
import { conversationApi, getSocketUrl } from "../services/api";
import { io as socketIo, Socket } from "socket.io-client";
import { useAuth } from "../contexts/AuthContext";

// ---------------------------------------------------------------------------
// Types (matches backend Prisma schema + nested lead relation)
// ---------------------------------------------------------------------------
interface ApiConversation {
  id: string;
  tenantId: string;
  leadId: string;
  platform: string;
  externalUserId: string;
  status: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  lead?: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    status: string;
  };
  messages?: { content: string; direction: string; createdAt: string }[];
}

interface ApiMessage {
  id: string;
  tenantId?: string;
  conversationId?: string;
  direction: "in" | "out";
  content: string;
  messageType?: string;
  platformMessageId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const filterTabs = ["All", "Open", "Closed", "Unread"];

export function ConversationsPage() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [showSidebar, setShowSidebar] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Real data state
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Socket.IO ref — persists across renders without causing re-renders
  const socketRef = useRef<Socket | null>(null);

  // Keep a ref to selectedId so the socket callback always reads the current
  // value without being listed as a dependency (which would reconnect on every select).
  const selectedIdRef = useRef(selectedId);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  // Connect to Socket.IO once per tenant — independent of conversation selection
  useEffect(() => {
    if (!user?.tenantId) return;

    const socket = socketIo(getSocketUrl(), {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_tenant", user.tenantId);
    });

    socket.on("new_message", (payload: { conversationId: string | null; message: { id?: string; direction: "in" | "out"; content: string; createdAt: string; platform?: string } }) => {
      const { conversationId, message } = payload;

      // Skip early gateway notifications (no conversationId yet) — the worker
      // will emit the real message with the conversationId shortly after.
      if (!conversationId) return;

      // Read selectedId from ref so we never tear down the socket on selection changes
      const currentSelectedId = selectedIdRef.current;

      // If the message belongs to the currently selected conversation, append it
      if (conversationId === currentSelectedId) {
        setMessages((prev) => {
          // Deduplicate: skip if a message with the same id already exists
          if (message.id && prev.some((m) => m.id === message.id)) return prev;
          return [
            ...prev,
            {
              id: message.id || `rt-${Date.now()}`,
              direction: message.direction,
              content: message.content,
              messageType: "text",
              createdAt: message.createdAt,
            },
          ];
        });
      }

      // Update the conversation's lastMessage and move it to the top of the list
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conversationId);
        if (idx === -1) return prev; // conversation not loaded yet

        const updated = { ...prev[idx], lastMessageAt: message.createdAt };
        // Put updated conversation at the top
        const rest = prev.filter((c) => c.id !== conversationId);
        return [updated, ...rest];
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.tenantId]);

  // Load conversations on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await conversationApi.getConversations();
        if (!cancelled) {
          setConversations(Array.isArray(data) ? data : []);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Failed to load conversations";
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load messages when a conversation is selected
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setMessagesLoading(true);
        const data = await conversationApi.getMessages(selectedId);
        if (!cancelled) {
          setMessages(Array.isArray(data) ? data : []);
        }
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
  }, [selectedId]);

  // Send message handler
  const handleSend = useCallback(async (text: string) => {
    if (!selectedId) return;
    setSendError(null);
    try {
      setIsTyping(true);
      const newMsg = await conversationApi.sendMessage(selectedId, text);
      // Append the new message to the list
      setMessages((prev) => [...prev, newMsg]);
      // Update the conversation's lastMessage in the list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, lastMessageAt: new Date().toISOString(), messages: [{ content: text, direction: "out", createdAt: new Date().toISOString() }] }
            : c
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send message";
      setSendError(msg);
    } finally {
      setIsTyping(false);
    }
  }, [selectedId]);

  // Send media handler
  const handleSendMedia = useCallback(async (file: File) => {
    if (!selectedId) return;
    setSendError(null);
    try {
      setIsTyping(true);
      // Determine messageType from the file MIME type
      let messageType = 'document';
      if (file.type.startsWith('image/')) messageType = 'image';
      else if (file.type.startsWith('audio/')) messageType = 'audio';
      else if (file.type.startsWith('video/')) messageType = 'video';

      const newMsg = await conversationApi.sendMedia(selectedId, file, messageType);
      // Append the new message to the list
      setMessages((prev) => [...prev, newMsg]);
      // Update the conversation's lastMessage in the list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, lastMessageAt: new Date().toISOString(), messages: [{ content: file.name, direction: "out", createdAt: new Date().toISOString() }] }
            : c
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send media";
      setSendError(msg);
    } finally {
      setIsTyping(false);
    }
  }, [selectedId]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let convs = [...conversations];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      convs = convs.filter(
        (c) =>
          (c.lead?.name || "").toLowerCase().includes(q) ||
          (c.lead?.phone || "").includes(q) ||
          (c.messages?.[0]?.content || "").toLowerCase().includes(q)
      );
    }

    if (activeFilter === "Open") convs = convs.filter((c) => c.status === "open");
    if (activeFilter === "Closed") convs = convs.filter((c) => c.status === "closed");
    if (activeFilter === "Unread") convs = convs.filter((c) => c.status === "open"); // backend has no unreadCount, show open as proxy

    return convs;
  }, [conversations, searchQuery, activeFilter]);

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  // Map API conversation to the shape ConversationListItem expects
  const mapConversationToProps = (conv: ApiConversation) => ({
    id: conv.id,
    contactName: conv.lead?.name || conv.externalUserId || "Unknown",
    contactPhone: conv.lead?.phone || "",
    platform: conv.platform,
    botName: "", // backend does not store botName per conversation
    lastMessage: conv.messages?.[0]?.content || "",
    lastMessageAt: conv.lastMessageAt,
    unreadCount: 0, // backend does not track unread count
    status: (conv.status === "closed" ? "closed" : "open") as "open" | "closed",
    leadStatus: conv.lead?.status || "new",
  });

  // Map API message to the shape MessageBubble expects
  const mapMessageToProps = (msg: ApiMessage) => ({
    id: msg.id,
    direction: msg.direction,
    content: msg.content,
    messageType: msg.messageType || "text",
    createdAt: msg.createdAt,
    metadata: msg.metadata,
  });

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 font-sans selection:bg-white/10 overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative w-full h-[280px] md:h-[320px] overflow-hidden flex flex-col border-b border-white/5">
        <div
          className="absolute inset-0 w-full h-full bg-no-repeat bg-cover bg-center opacity-30 mix-blend-screen"
          style={{ backgroundImage: `url('${heroBg}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent" />
        <div className="relative z-20 w-full">
        </div>
        <div className="relative z-10 w-full px-6 md:px-12 lg:px-16 flex-1 flex flex-col justify-end pb-8">
          <h1 className="text-white font-semibold leading-[0.92] tracking-[-0.02em]" style={{ fontSize: "clamp(52px, 9vw, 108px)", lineHeight: 0.92 }}>
            CONVERSATIONS
          </h1>
          <p className="text-zinc-400 mt-4 text-lg md:text-xl max-w-2xl">
            View and manage customer conversations across all platforms.
          </p>
        </div>
      </div>

      {/* 3-Panel Layout */}
      <div className="w-full px-6 md:px-12 lg:px-16 py-6 md:py-8">
        <div className="flex gap-4 h-[calc(100vh-400px)] min-h-[500px]">
          {/* Left: Conversation List */}
          <div className="w-80 flex-shrink-0 flex flex-col bg-[#0f0f11] rounded-lg border border-white/5 overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500/50"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 px-3 py-2 border-b border-white/5">
              {filterTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeFilter === tab
                      ? "bg-green-500/10 text-green-400"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {tab}
                  {tab === "Unread" && (
                    <span className="ml-1 text-[10px]">
                      ({conversations.filter((c) => c.status === "open").length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Conversation Items */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-zinc-500 text-sm">Loading conversations...</div>
              ) : error ? (
                <div className="p-4 text-center text-red-400 text-sm">{error}</div>
              ) : (
                <>
                  {filteredConversations.map((conv) => (
                    <ConversationListItem
                      key={conv.id}
                      conversation={mapConversationToProps(conv)}
                      isSelected={conv.id === selectedId}
                      onClick={() => setSelectedId(conv.id)}
                    />
                  ))}
                  {filteredConversations.length === 0 && (
                    <div className="p-4 text-center text-zinc-500 text-sm">No conversations found</div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Center: Message Thread */}
          <div className="flex-1 flex flex-col bg-[#0f0f11] rounded-lg border border-white/5 overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-white/5 bg-[#141415] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-300">
                      {(selectedConversation.lead?.name || "U").split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{selectedConversation.lead?.name || "Unknown"}</span>
                        <PlatformBadge platform={selectedConversation.platform} />
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          selectedConversation.lead?.status === "qualified" ? "bg-yellow-500/10 text-yellow-400" :
                          selectedConversation.lead?.status === "converted" ? "bg-green-500/10 text-green-400" :
                          selectedConversation.lead?.status === "contacted" ? "bg-blue-500/10 text-blue-400" :
                          "bg-zinc-700/50 text-zinc-400"
                        }`}>
                          {selectedConversation.lead?.status || "new"}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500">{selectedConversation.lead?.phone || ""} {selectedConversation.lead?.phone ? "·" : ""} {selectedConversation.platform}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSidebar(!showSidebar)}
                      className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <Filter className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                  {messagesLoading ? (
                    <div className="text-center text-zinc-500 text-sm py-8">Loading messages...</div>
                  ) : (
                    <>
                      {messages.map((msg) => (
                        <MessageBubble key={msg.id} message={mapMessageToProps(msg)} />
                      ))}
                    </>
                  )}
                  {isTyping && <TypingIndicator label="Sending..." />}
                </div>

                {/* Input */}
                {sendError && (
                  <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs flex items-center justify-between">
                    <span>{sendError}</span>
                    <button onClick={() => setSendError(null)} className="text-red-400 hover:text-red-300 ml-2 text-xs">Dismiss</button>
                  </div>
                )}
                <MessageInput onSend={handleSend} onSendMedia={handleSendMedia} />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3">
                <MessageSquare className="w-12 h-12 text-zinc-700" />
                <p className="text-sm">Select a conversation to view messages</p>
              </div>
            )}
          </div>

          {/* Right: Contact Sidebar */}
          {selectedConversation && showSidebar && (
            <ContactSidebar
              conversation={{
                id: selectedConversation.id,
                platform: selectedConversation.platform,
                status: selectedConversation.status,
                createdAt: selectedConversation.createdAt,
                botName: "",
                contactName: selectedConversation.lead?.name || "Unknown",
                contactPhone: selectedConversation.lead?.phone || "",
                contactEmail: selectedConversation.lead?.email || undefined,
                source: selectedConversation.platform,
                leadStatus: selectedConversation.lead?.status || "new",
                messageCount: messages.length,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
