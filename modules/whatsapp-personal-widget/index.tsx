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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
  subtle: string;
  icon: ReactNode;
};

const STATUS_BADGES: Record<string, StatusBadgeVariant> = {
  ready: {
    label: "Conectado",
    tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    subtle: "from-emerald-500/10 via-emerald-500/10 to-transparent",
    icon: <MessageCircle className="size-3.5" />,
  },
  qr: {
    label: "Escanea el QR",
    tone: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    subtle: "from-amber-500/15 via-emerald-500/10 to-transparent",
    icon: <QrCodeIcon className="size-3.5" />,
  },
  initializing: {
    label: "Inicializando",
    tone: "bg-primary/15 text-primary",
    subtle: "from-primary/10 via-emerald-500/10 to-transparent",
    icon: <Smartphone className="size-3.5" />,
  },
  disconnected: {
    label: "Desconectado",
    tone: "bg-red-500/15 text-red-600 dark:text-red-300",
    subtle: "from-red-500/15 via-emerald-500/10 to-transparent",
    icon: <WifiOff className="size-3.5" />,
  },
  error: {
    label: "Error",
    tone: "bg-destructive/15 text-destructive",
    subtle: "from-destructive/20 via-transparent to-transparent",
    icon: <WifiOff className="size-3.5" />,
  },
  idle: {
    label: "Esperando",
    tone: "bg-muted text-muted-foreground",
    subtle: "from-muted/30 via-emerald-500/10 to-transparent",
    icon: <Smartphone className="size-3.5" />,
  },
};

const WHATSAPP_BASE_CLASSES =
  "relative h-full overflow-hidden border border-emerald-500/20 bg-gradient-to-br";
const MIN_REFRESH_MS = 10000;

function toNumber(value: unknown, fallback: number, min: number, max: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, min), max);
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
  return name.length > 40 ? `${name.slice(0, 37)}…` : name;
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .trim() || "?"
  );
}

function stateBadge(status?: WhatsAppStatus | null): StatusBadgeVariant {
  if (!status) return STATUS_BADGES.idle;
  return STATUS_BADGES[status.state] ?? STATUS_BADGES.idle;
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

  const [conversations, setConversations] = useState<WhatsAppConversation[]>(
    []
  );
  const [conversationsError, setConversationsError] = useState<string | null>(
    null
  );
  const [loadingConversations, setLoadingConversations] =
    useState<boolean>(false);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [conversationDetail, setConversationDetail] =
    useState<WhatsAppConversationDetail | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messagesReloadToken, setMessagesReloadToken] = useState(0);

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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setConversationsError(message);
    } finally {
      conversationsFetchInFlight.current = false;
      conversationsLoaded.current = true;
      setLoadingConversations(false);
    }
  }, [status?.state, limit, includeGroups]);

  const selectedConversation = useMemo(() => {
    if (!selectedChatId) return null;
    return conversations.find((chat) => chat.id === selectedChatId) ?? null;
  }, [conversations, selectedChatId]);

  const handleSelectConversation = useCallback(
    (chatId: string) => {
      setSelectedChatId((prev) => {
        if (prev === chatId) {
          setMessagesReloadToken((token) => token + 1);
          return prev;
        }
        return chatId;
      });
    },
    [setMessagesReloadToken]
  );

  const handleReloadMessages = useCallback(() => {
    if (!selectedChatId) return;
    setMessagesReloadToken((token) => token + 1);
  }, [selectedChatId, setMessagesReloadToken]);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      await refreshStatus();
    };

    void poll();

    const interval = window.setInterval(
      poll,
      status?.state === "ready" ? Math.max(refreshMs, 60_000) : 7_000
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [refreshStatus, status?.state, refreshMs]);

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
      return;
    }

    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      await refreshConversations();
    };

    void poll();
    const interval = window.setInterval(poll, refreshMs);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [status?.state, refreshConversations, refreshMs]);

  const badge = useMemo(() => stateBadge(status), [status]);

  useEffect(() => {
    if (status?.state !== "ready") return;
    if (!conversations.length) {
      setSelectedChatId(null);
      setConversationDetail(null);
      setMessagesError(null);
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
    if (status?.state !== "ready" || !selectedChatId) {
      return;
    }

    let cancelled = false;
    setLoadingMessages(true);
    setMessagesError(null);

    void whatsappService
      .getConversation(selectedChatId, { limit: messagesLimit })
      .then((detail) => {
        if (cancelled) return;
        setConversationDetail(detail);
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setConversationDetail(null);
        setMessagesError(message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingMessages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedChatId, status?.state, messagesLimit, messagesReloadToken]);

  const handleManualRefresh = useCallback(() => {
    void Promise.all([
      refreshStatus(),
      status?.state === "ready" ? refreshConversations() : Promise.resolve(),
    ]).finally(() => {
      if (selectedChatId) {
        setMessagesReloadToken((token) => token + 1);
      }
    });
  }, [
    refreshStatus,
    refreshConversations,
    status?.state,
    selectedChatId,
    setMessagesReloadToken,
  ]);

  const lastUpdateText = useMemo(() => {
    if (!status?.lastReadyAt && !status?.lastQrAt) return "";
    const base =
      status?.state === "ready" ? status?.lastReadyAt : status?.lastQrAt;
    const formatted = formatRelative(base);
    return formatted ? `Actualizado ${formatted}` : "";
  }, [status]);

  return (
    <Card
      className={cn(
        WHATSAPP_BASE_CLASSES,
        `from-emerald-600/10 via-emerald-500/10 to-background`,
        "flex h-full flex-col"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_60%)]" />
      <CardHeader className="relative z-10 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-foreground">
              WhatsApp
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {lastUpdateText}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider shadow-sm",
                badge.tone
              )}
            >
              {badge.icon}
              {badge.label}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className=" bg-background/80 transition-colors hover:bg-background"
              onClick={handleManualRefresh}
              disabled={loadingStatus || loadingConversations}
            >
              <RefreshCcw
                className={cn(
                  "size-4",
                  (loadingStatus || loadingConversations) && "animate-spin"
                )}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 flex-1 overflow-y-auto sm:overflow-hidden">
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          {renderContent({
            status,
            statusError,
            loadingStatus,
            conversations,
            conversationsError,
            loadingConversations,
            selectedChatId,
            selectedConversation,
            onSelectConversation: handleSelectConversation,
            conversationDetail,
            loadingMessages,
            messagesError,
            onReloadMessages: handleReloadMessages,
          })}
        </div>
      </CardContent>
    </Card>
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
    return <ErrorState message={statusError} />;
  }

  if (status?.state === "qr") {
    return <QrState status={status} loading={loadingStatus} />;
  }

  if (status?.state !== "ready") {
    const message =
      status?.state === "error"
        ? status.error ?? "No fue posible conectar con WhatsApp"
        : "Esperando conexión con tu sesión personal";
    return <IdleState status={status} message={message} />;
  }

  if (loadingConversations && conversations.length === 0) {
    return <ConversationSkeleton />;
  }

  if (conversationsError && conversations.length === 0) {
    return <ErrorState message={conversationsError} />;
  }

  if (conversations.length === 0) {
    return <EmptyState />;
  }

  return (
    <ConversationMasterDetail
      conversations={conversations}
      loadingConversations={loadingConversations}
      selectedChatId={selectedChatId}
      selectedConversation={selectedConversation}
      onSelectConversation={onSelectConversation}
      conversationDetail={conversationDetail}
      loadingMessages={loadingMessages}
      messagesError={messagesError}
      onReloadMessages={onReloadMessages}
    />
  );
}

function isStatusLoaded(status: WhatsAppStatus | null) {
  return Boolean(status && status.state && status.state !== "idle");
}

function WidgetSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-2xl bg-emerald-500/10" />
      <Skeleton className="h-24 w-full rounded-2xl bg-emerald-500/10" />
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="size-12 rounded-full bg-emerald-500/10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 bg-emerald-500/10" />
            <Skeleton className="h-3 w-1/2 bg-emerald-500/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-6 text-sm text-destructive">
      {message}
    </div>
  );
}

function IdleState({
  status,
  message,
}: {
  status: WhatsAppStatus | null;
  message: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-500/15 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
      <p>{message}</p>
      {status?.disconnectReason ? (
        <p className="mt-2 text-xs text-muted-foreground/80">
          Motivo: {status.disconnectReason}
        </p>
      ) : null}
    </div>
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
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-emerald-500/20 bg-background/70 p-6 text-center">
      <div className="rounded-2xl border border-emerald-500/30 bg-white/90 p-3 shadow-lg shadow-emerald-500/15">
        {status.qr ? (
          <img
            src={status.qr}
            alt="Código QR de WhatsApp"
            className="h-44 w-44 rounded-lg border border-emerald-500/30 object-contain"
          />
        ) : (
          <Skeleton className="h-44 w-44 rounded-lg bg-emerald-500/10" />
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">
          Escanea desde WhatsApp
        </h3>
        <p className="text-sm text-muted-foreground">
          Abre la app, ve a{" "}
          <span className="font-medium text-foreground">
            Dispositivos vinculados
          </span>{" "}
          y escanea el código.
        </p>
        {loading ? (
          <p className="text-xs text-muted-foreground">
            Generando credenciales…
          </p>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-emerald-500/15 bg-background/70 px-4 py-10 text-center text-sm text-muted-foreground">
      Sin conversaciones recientes.
    </div>
  );
}

function ConversationMasterDetail({
  conversations,
  loadingConversations,
  selectedChatId,
  selectedConversation,
  onSelectConversation,
  conversationDetail,
  loadingMessages,
  messagesError,
  onReloadMessages,
}: {
  conversations: WhatsAppConversation[];
  loadingConversations: boolean;
  selectedChatId: string | null;
  selectedConversation: WhatsAppConversation | null;
  onSelectConversation: (chatId: string) => void;
  conversationDetail: WhatsAppConversationDetail | null;
  loadingMessages: boolean;
  messagesError: string | null;
  onReloadMessages: () => void;
}) {
  return (
    <div className="grid h-full min-h-0 gap-4 sm:min-h-[260px] sm:grid-cols-[minmax(0,220px)_1fr]">
      <ConversationList
        conversations={conversations}
        loading={loadingConversations}
        selectedId={selectedChatId}
        onSelect={onSelectConversation}
      />
      <ConversationDetailPanel
        conversation={selectedConversation}
        detail={conversationDetail}
        loading={loadingMessages}
        error={messagesError}
        onReload={onReloadMessages}
      />
    </div>
  );
}

function ConversationDetailPanel({
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
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-emerald-500/10 bg-background/70 p-4 text-sm text-muted-foreground">
        Selecciona una conversación para ver sus mensajes.
      </div>
    );
  }

  const messages = detail?.messages ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-emerald-500/10 bg-background/80 p-4 shadow-sm shadow-emerald-500/10 sm:min-h-[240px]">
      <div className="flex items-start justify-between gap-3 border-b border-emerald-500/10 pb-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {normalizeName(conversation.name)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{conversation.isGroup ? "Grupo" : "Contacto"}</span>
            {conversation.unreadCount > 0 ? (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-semibold text-emerald-700">
                {conversation.unreadCount} sin leer
              </span>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="border border-transparent text-emerald-600 hover:bg-emerald-500/10"
          onClick={onReload}
          disabled={loading}
        >
          <RefreshCcw className={cn("size-4", loading && "animate-spin")} />
        </Button>
      </div>
      <div className="mt-3 flex-1 overflow-y-auto space-y-3 pr-1">
        {loading ? (
          <MessagesSkeleton />
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Error: {error}
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
          <p className="text-sm text-muted-foreground">
            Sin mensajes recientes en este chat.
          </p>
        )}
      </div>
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "flex",
            index % 2 === 0 ? "justify-start" : "justify-end"
          )}
        >
          <Skeleton className="h-12 w-3/4 max-w-[220px] rounded-2xl bg-emerald-500/10" />
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
  const isMine = message.fromMe;
  const bubbleClass = isMine
    ? "bg-emerald-500 text-emerald-50 shadow-emerald-500/20"
    : "border border-emerald-500/20 bg-background text-foreground";
  const metaClass = isMine ? "text-emerald-50/80" : "text-muted-foreground/70";
  const timestamp = formatRelative(message.timestamp);

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isMine ? "items-end" : "items-start"
      )}
    >
      <div
        className={cn("max-w-full rounded-2xl px-4 py-2 text-sm", bubbleClass)}
      >
        {!isMine && isGroup && message.author ? (
          <p className="mb-1 text-xs font-semibold text-emerald-700">
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
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-2 text-[10px]",
            metaClass
          )}
        >
          {timestamp ? <span>{timestamp}</span> : null}
        </div>
      </div>
    </div>
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {conversations.map((chat, index) => {
          const isActive = selectedId === chat.id;
          return (
            <button
              type="button"
              key={chat.id}
              onClick={() => onSelect(chat.id)}
              className={cn(
                "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                "shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40",
                isActive
                  ? "border-emerald-500/60 bg-emerald-500/10 shadow-emerald-500/20"
                  : "border-emerald-500/10 bg-background/80 hover:border-emerald-500/30 hover:bg-emerald-500/5"
              )}
            >
              <div className="flex items-start gap-3">
                <Avatar className="border border-emerald-500/30">
                  <AvatarFallback className="bg-emerald-500/15 text-emerald-700">
                    {getInitials(normalizeName(chat.name))}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {normalizeName(chat.name)}
                    </p>
                    {chat.isGroup ? (
                      <Badge
                        className="bg-emerald-500/15 text-emerald-700"
                        variant="secondary"
                      >
                        Grupo
                      </Badge>
                    ) : null}
                    {chat.muted ? (
                      <Badge
                        className="bg-muted text-muted-foreground"
                        variant="secondary"
                      >
                        Silenciado
                      </Badge>
                    ) : null}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatRelative(chat.lastMessage?.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {chat.lastMessage?.body || "Mensaje sin contenido"}
                  </p>
                </div>
              </div>
              {index < conversations.length - 1 ? (
                <Separator className="mt-3 border-emerald-500/10" />
              ) : null}
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{chat.lastMessage?.fromMe ? "Enviado" : "Recibido"}</span>
                {chat.unreadCount > 0 ? (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-semibold text-emerald-700">
                    {chat.unreadCount} nuevos
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
      {loading ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Actualizando…
        </p>
      ) : null}
    </div>
  );
}
