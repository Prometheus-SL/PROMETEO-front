import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  MessageCircle,
  QrCodeIcon,
  RefreshCcw,
  Smartphone,
  WifiOff,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  WidgetContent,
  WidgetHeader,
  WidgetSection,
  WidgetShell,
  WidgetState,
  WidgetStatus,
} from "@/modules/ui/WidgetShell";
import {
  type WhatsAppConversation,
  type WhatsAppConversationDetail,
  type WhatsAppStatus,
  whatsappService,
} from "@/services/whatsapp";

type WidgetConfig = Record<string, unknown>;

type StatusBadgeVariant = {
  label: string;
  tone: string;
  icon: ReactNode;
};

const STATUS_BADGES: Record<string, StatusBadgeVariant> = {
  ready: {
    label: "Connected",
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
    icon: <MessageCircle className="size-3.5" />,
  },
  qr: {
    label: "Scan QR",
    tone: "bg-amber-500/20 text-amber-700 dark:text-amber-200",
    icon: <QrCodeIcon className="size-3.5" />,
  },
  initializing: {
    label: "Starting",
    tone: "bg-sky-500/15 text-sky-700 dark:text-sky-200",
    icon: <Smartphone className="size-3.5" />,
  },
  disconnected: {
    label: "Offline",
    tone: "bg-rose-500/15 text-rose-700 dark:text-rose-200",
    icon: <WifiOff className="size-3.5" />,
  },
  error: {
    label: "Error",
    tone: "bg-destructive/15 text-destructive",
    icon: <WifiOff className="size-3.5" />,
  },
  idle: {
    label: "Idle",
    tone: "bg-muted text-muted-foreground",
    icon: <Smartphone className="size-3.5" />,
  },
};

const MIN_REFRESH_MS = 10000;

function toNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function formatRelative(timestamp?: string | null) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  if (diff < 30_000) return "Ahora";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} min`;
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString();
}

function normalizeName(name?: string | null) {
  if (!name) return "Sin nombre";
  return name.length > 40 ? `${name.slice(0, 37)}...` : name;
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function stateBadge(status?: WhatsAppStatus | null): StatusBadgeVariant {
  if (!status) return STATUS_BADGES.idle;
  return STATUS_BADGES[status.state] ?? STATUS_BADGES.idle;
}

function isStatusLoaded(status: WhatsAppStatus | null) {
  return Boolean(status && status.state && status.state !== "idle");
}

export default function WhatsAppPersonalWidget({
  config,
}: {
  config: WidgetConfig;
}) {
  const limit = toNumber(config["limit"], 8, 3, 20);
  const refreshSeconds = toNumber(config["refreshSeconds"], 60, 60, 180);
  const includeGroups = Boolean(config["includeGroups"] ?? false);
  const messagesLimit = toNumber(config["messagesLimit"], 40, 10, 200);
  const refreshMs = Math.max(refreshSeconds * 1000, MIN_REFRESH_MS);

  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);

  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [conversationsError, setConversationsError] = useState<string | null>(
    null,
  );
  const [loadingConversations, setLoadingConversations] = useState(false);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [conversationDetail, setConversationDetail] =
    useState<WhatsAppConversationDetail | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messagesReloadToken, setMessagesReloadToken] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const statusLoaded = useRef(false);
  const conversationsLoaded = useRef(false);
  const statusFetchInFlight = useRef(false);
  const conversationsFetchInFlight = useRef(false);

  const refreshStatus = useCallback(async () => {
    if (statusFetchInFlight.current) return;
    if (!statusLoaded.current) setLoadingStatus(true);
    statusFetchInFlight.current = true;

    try {
      const next = await whatsappService.getStatus();
      setStatus(next);
      setStatusError(null);
    } catch (statusFetchError) {
      const message =
        statusFetchError instanceof Error
          ? statusFetchError.message
          : String(statusFetchError);
      setStatusError(message);
    } finally {
      statusFetchInFlight.current = false;
      statusLoaded.current = true;
      setLoadingStatus(false);
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    if (status?.state !== "ready" || conversationsFetchInFlight.current) return;
    if (!conversationsLoaded.current) setLoadingConversations(true);
    conversationsFetchInFlight.current = true;

    try {
      const data = await whatsappService.listConversations({
        limit,
        includeGroups,
      });
      setConversations(data);
      setConversationsError(null);
    } catch (conversationError) {
      const message =
        conversationError instanceof Error
          ? conversationError.message
          : String(conversationError);
      setConversationsError(message);
    } finally {
      conversationsFetchInFlight.current = false;
      conversationsLoaded.current = true;
      setLoadingConversations(false);
    }
  }, [includeGroups, limit, status?.state]);

  const selectedConversation = useMemo(() => {
    if (!selectedChatId) return null;
    return conversations.find((chat) => chat.id === selectedChatId) ?? null;
  }, [conversations, selectedChatId]);

  const handleSelectConversation = useCallback((chatId: string) => {
    setSelectedChatId((prev) => {
      if (prev === chatId) {
        setMessagesReloadToken((token) => token + 1);
        return prev;
      }
      return chatId;
    });
    setDetailsOpen(true);
  }, []);

  const handleReloadMessages = useCallback(() => {
    if (!selectedChatId) return;
    setMessagesReloadToken((token) => token + 1);
  }, [selectedChatId]);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (!cancelled) await refreshStatus();
    };

    void poll();
    const interval = window.setInterval(
      poll,
      status?.state === "ready" ? Math.max(refreshMs, 60_000) : 7_000,
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [refreshMs, refreshStatus, status?.state]);

  useEffect(() => {
    if (status?.state !== "ready") {
      setConversations([]);
      setConversationsError(null);
      conversationsLoaded.current = false;
      setLoadingConversations(false);
      setSelectedChatId(null);
      setConversationDetail(null);
      setMessagesError(null);
      setLoadingMessages(false);
      setDetailsOpen(false);
      return;
    }

    let cancelled = false;
    const poll = async () => {
      if (!cancelled) await refreshConversations();
    };

    void poll();
    const interval = window.setInterval(poll, refreshMs);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [refreshConversations, refreshMs, status?.state]);

  useEffect(() => {
    if (status?.state !== "ready") return;
    if (!conversations.length) {
      setSelectedChatId(null);
      setConversationDetail(null);
      setMessagesError(null);
      setDetailsOpen(false);
      return;
    }

    setSelectedChatId((prev) => {
      if (prev && conversations.some((chat) => chat.id === prev)) {
        return prev;
      }
      return conversations[0]?.id ?? null;
    });
  }, [conversations, status?.state]);

  useEffect(() => {
    if (status?.state !== "ready" || !selectedChatId) return;

    let cancelled = false;
    setLoadingMessages(true);
    setMessagesError(null);

    void whatsappService
      .getConversation(selectedChatId, { limit: messagesLimit })
      .then((detail) => {
        if (!cancelled) setConversationDetail(detail);
      })
      .catch((conversationError) => {
        if (cancelled) return;
        const message =
          conversationError instanceof Error
            ? conversationError.message
            : String(conversationError);
        setConversationDetail(null);
        setMessagesError(message);
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [messagesLimit, messagesReloadToken, selectedChatId, status?.state]);

  const handleManualRefresh = useCallback(() => {
    void Promise.all([
      refreshStatus(),
      status?.state === "ready" ? refreshConversations() : Promise.resolve(),
    ]).finally(() => {
      if (selectedChatId) {
        setMessagesReloadToken((token) => token + 1);
      }
    });
  }, [refreshConversations, refreshStatus, selectedChatId, status?.state]);

  const badge = useMemo(() => stateBadge(status), [status]);
  const unreadTotal = useMemo(
    () =>
      conversations.reduce((count, conversation) => {
        return count + (conversation.unreadCount ?? 0);
      }, 0),
    [conversations],
  );
  const lastUpdateText = useMemo(() => {
    if (!status?.lastReadyAt && !status?.lastQrAt) return "";
    const base = status?.state === "ready" ? status?.lastReadyAt : status?.lastQrAt;
    const formatted = formatRelative(base);
    return formatted ? `Actualizado ${formatted}` : "";
  }, [status]);

  return (
    <WidgetShell accent="emerald">
      <WidgetHeader
        accent="emerald"
        icon={<MessageCircle className="size-5" />}
        title="WhatsApp"
        description={lastUpdateText || "Sesion personal"}
        status={
          <Badge
            variant="secondary"
            className={cn("h-6 rounded-full px-2 text-[10px] font-semibold", badge.tone)}
          >
            {badge.icon}
            {badge.label}
          </Badge>
        }
        meta={
          status?.state === "ready" ? (
            <>
              <WidgetStatus tone="neutral">{conversations.length} chats</WidgetStatus>
              <WidgetStatus tone={unreadTotal > 0 ? "info" : "neutral"}>
                {unreadTotal} unread
              </WidgetStatus>
            </>
          ) : null
        }
        actions={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg bg-background/80"
            onClick={handleManualRefresh}
            disabled={loadingStatus || loadingConversations}
            title="Refresh WhatsApp"
          >
            <RefreshCcw
              className={cn(
                "size-4",
                (loadingStatus || loadingConversations) && "animate-spin",
              )}
            />
          </Button>
        }
      />

      <WidgetContent className="flex flex-col gap-2.5">
        {renderContent({
          status,
          statusError,
          loadingStatus,
          conversations,
          conversationsError,
          loadingConversations,
          selectedChatId,
          selectedConversation,
          detailOpen: detailsOpen,
          onOpenDetails: setDetailsOpen,
          onSelectConversation: handleSelectConversation,
          conversationDetail,
          loadingMessages,
          messagesError,
          onReloadMessages: handleReloadMessages,
        })}
      </WidgetContent>
    </WidgetShell>
  );
}

function renderContent({
  status,
  statusError,
  loadingStatus,
  conversations,
  conversationsError,
  loadingConversations,
  selectedChatId,
  selectedConversation,
  detailOpen,
  onOpenDetails,
  onSelectConversation,
  conversationDetail,
  loadingMessages,
  messagesError,
  onReloadMessages,
}: {
  status: WhatsAppStatus | null;
  statusError: string | null;
  loadingStatus: boolean;
  conversations: WhatsAppConversation[];
  conversationsError: string | null;
  loadingConversations: boolean;
  selectedChatId: string | null;
  selectedConversation: WhatsAppConversation | null;
  detailOpen: boolean;
  onOpenDetails: (next: boolean) => void;
  onSelectConversation: (chatId: string) => void;
  conversationDetail: WhatsAppConversationDetail | null;
  loadingMessages: boolean;
  messagesError: string | null;
  onReloadMessages: () => void;
}) {
  if (loadingStatus && !isStatusLoaded(status)) {
    return <WidgetSkeleton />;
  }

  if (statusError && !status) {
    return (
      <WidgetState
        accent="rose"
        tone="danger"
        icon={<WifiOff className="size-5" />}
        title="WhatsApp no responde"
        message={statusError}
      />
    );
  }

  if (status?.state === "qr") {
    return <QrState status={status} loading={loadingStatus} />;
  }

  if (status?.state !== "ready") {
    const message =
      status?.state === "error"
        ? status.error ?? "No fue posible conectar con WhatsApp"
        : "Esperando conexion con tu sesion personal.";

    return (
      <WidgetState
        accent="emerald"
        tone={status?.state === "error" ? "danger" : "neutral"}
        icon={status?.state === "error" ? <WifiOff className="size-5" /> : <Smartphone className="size-5" />}
        title="WhatsApp en espera"
        message={message}
      />
    );
  }

  if (loadingConversations && conversations.length === 0) {
    return <ConversationSkeleton />;
  }

  if (conversationsError && conversations.length === 0) {
    return (
      <WidgetState
        accent="rose"
        tone="danger"
        icon={<WifiOff className="size-5" />}
        title="No se pudieron cargar los chats"
        message={conversationsError}
      />
    );
  }

  if (conversations.length === 0) {
    return (
      <WidgetState
        accent="emerald"
        icon={<MessageCircle className="size-5" />}
        title="Sin conversaciones"
        message="No hay conversaciones recientes para mostrar."
      />
    );
  }

  return (
    <>
      <WidgetSection accent="emerald" className="grid grid-cols-2 gap-1.5">
        <SummaryCard label="Chats" value={conversations.length.toString()} />
        <SummaryCard
          label="Unread"
          value={conversations
            .reduce((count, chat) => count + (chat.unreadCount ?? 0), 0)
            .toString()}
        />
      </WidgetSection>

      <ConversationList
        conversations={conversations}
        loading={loadingConversations}
        selectedId={selectedChatId}
        onSelect={onSelectConversation}
      />

      <Sheet
        open={detailOpen && Boolean(selectedConversation)}
        onOpenChange={onOpenDetails}
      >
        <SheetContent
          side="bottom"
          className="max-h-[82vh] rounded-t-[1.25rem] p-0"
        >
          <ConversationDetailSheet
            conversation={selectedConversation}
            detail={conversationDetail}
            loading={loadingMessages}
            error={messagesError}
            onReload={onReloadMessages}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-emerald-500/15 bg-background/85 p-2.5">
      <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-[0.16em]">
        {label}
      </p>
      <p className="mt-1.5 text-base font-semibold">{value}</p>
    </div>
  );
}

function WidgetSkeleton() {
  return (
    <WidgetSection accent="emerald" className="space-y-2.5">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-full bg-emerald-500/10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3 bg-emerald-500/10" />
            <Skeleton className="h-3 w-1/2 bg-emerald-500/10" />
          </div>
        </div>
      ))}
    </WidgetSection>
  );
}

function ConversationSkeleton() {
  return (
    <WidgetSection accent="emerald" className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-full bg-emerald-500/10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 bg-emerald-500/10" />
            <Skeleton className="h-3 w-1/2 bg-emerald-500/10" />
          </div>
        </div>
      ))}
    </WidgetSection>
  );
}

function QrState({
  status,
  loading,
}: {
  status: WhatsAppStatus;
  loading: boolean;
}) {
  return (
    <WidgetSection accent="emerald" className="flex flex-col items-center gap-4 text-center">
      <div className="rounded-[1.1rem] border border-emerald-500/25 bg-white p-3 shadow-sm">
        {status.qr ? (
          <img
            src={status.qr}
            alt="Codigo QR de WhatsApp"
            className="h-44 w-44 rounded-xl object-contain"
          />
        ) : (
          <Skeleton className="h-44 w-44 rounded-xl bg-emerald-500/10" />
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">Escanea desde WhatsApp</p>
        <p className="text-muted-foreground text-sm">
          Abre Dispositivos vinculados y escanea este codigo.
        </p>
        {loading ? (
          <p className="text-xs text-muted-foreground">Generando credenciales...</p>
        ) : null}
      </div>
    </WidgetSection>
  );
}

function ConversationList({
  conversations,
  loading,
  selectedId,
  onSelect,
}: {
  conversations: WhatsAppConversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (chatId: string) => void;
}) {
  return (
    <WidgetSection accent="emerald" className="min-h-0 flex flex-1 flex-col p-0">
      <ScrollArea className="h-full flex-1">
        <div className="space-y-2 p-2.5">
          {conversations.map((chat) => {
            const active = selectedId === chat.id;
            return (
              <button
                type="button"
                key={chat.id}
                onClick={() => onSelect(chat.id)}
                className={cn(
                  "w-full rounded-lg border px-2.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
                  active
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-border/60 bg-background/85 hover:border-emerald-500/30 hover:bg-emerald-500/5",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <Avatar className="size-9 border border-emerald-500/20">
                    <AvatarFallback className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-200">
                      {getInitials(normalizeName(chat.name))}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {normalizeName(chat.name)}
                      </p>
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                        {formatRelative(chat.lastMessage?.timestamp)}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 truncate text-[13px]">
                      {chat.lastMessage?.body || "Mensaje sin contenido"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                      {chat.isGroup ? (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-200">
                          Grupo
                        </Badge>
                      ) : null}
                      {chat.muted ? (
                        <Badge variant="secondary">Silenciado</Badge>
                      ) : null}
                      {chat.unreadCount > 0 ? (
                        <Badge variant="secondary" className="bg-sky-500/15 text-sky-700 dark:text-sky-200">
                          {chat.unreadCount} new
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {loading ? (
        <div className="border-t border-border/60 px-3 py-2 text-center text-xs text-muted-foreground">
          Actualizando...
        </div>
      ) : null}
    </WidgetSection>
  );
}

function ConversationDetailSheet({
  conversation,
  detail,
  loading,
  error,
  onReload,
}: {
  conversation: WhatsAppConversation | null;
  detail: WhatsAppConversationDetail | null;
  loading: boolean;
  error: string | null;
  onReload: () => void;
}) {
  if (!conversation) {
    return (
      <div className="p-6">
        <WidgetState
          accent="emerald"
          icon={<MessageCircle className="size-5" />}
          title="Selecciona un chat"
          message="Elige una conversacion para ver sus mensajes."
        />
      </div>
    );
  }

  const messages = detail?.messages ?? [];

  return (
    <div className="flex h-full max-h-[82vh] flex-col">
      <SheetHeader className="border-b border-border/60 px-5 py-4">
        <div className="flex items-start gap-3">
          <Avatar className="size-10 border border-emerald-500/20">
            <AvatarFallback className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-200">
              {getInitials(normalizeName(conversation.name))}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate">{normalizeName(conversation.name)}</SheetTitle>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{conversation.isGroup ? "Grupo" : "Contacto"}</span>
              {conversation.unreadCount > 0 ? (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-200">
                  {conversation.unreadCount} sin leer
                </span>
              ) : null}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={onReload}
            disabled={loading}
          >
            <RefreshCcw className={cn("size-4", loading && "animate-spin")} />
          </Button>
        </div>
      </SheetHeader>

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          {loading ? (
            <MessagesSkeleton />
          ) : error ? (
            <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : messages.length ? (
            messages.map((message, index) => (
              <MessageBubble
                key={message.id ?? `${message.timestamp ?? "ts"}-${index}`}
                message={message}
                isGroup={conversation.isGroup}
              />
            ))
          ) : (
            <div className="rounded-xl border border-border/60 bg-background/85 px-3 py-4 text-sm text-muted-foreground">
              Sin mensajes recientes en este chat.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className={cn("flex", index % 2 === 0 ? "justify-start" : "justify-end")}
        >
          <Skeleton className="h-12 w-3/4 max-w-[240px] rounded-2xl bg-emerald-500/10" />
        </div>
      ))}
    </div>
  );
}

function MessageBubble({
  message,
  isGroup,
}: {
  message: WhatsAppConversationDetail["messages"][number];
  isGroup: boolean;
}) {
  const mine = message.fromMe;
  const timestamp = formatRelative(message.timestamp);

  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm",
          mine
            ? "bg-emerald-500 text-emerald-50"
            : "border border-border/60 bg-background text-foreground",
        )}
      >
        {!mine && isGroup && message.author ? (
          <p className="mb-1 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
            {message.author}
          </p>
        ) : null}
        <p className="whitespace-pre-line break-words">
          {message.body || (
            <span className="italic text-muted-foreground">
              Mensaje sin contenido
            </span>
          )}
        </p>
        {timestamp ? (
          <div
            className={cn(
              "mt-1 text-right text-[10px]",
              mine ? "text-emerald-50/80" : "text-muted-foreground",
            )}
          >
            {timestamp}
          </div>
        ) : null}
      </div>
    </div>
  );
}
