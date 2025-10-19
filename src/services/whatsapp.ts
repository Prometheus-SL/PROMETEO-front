import { api } from "@/lib/api";

export type WhatsAppStatusState =
    | "idle"
    | "initializing"
    | "qr"
    | "ready"
    | "disconnected"
    | "error";

export type WhatsAppStatus = {
    sessionId: string;
    state: WhatsAppStatusState;
    qr: string | null;
    lastQrAt: string | null;
    lastReadyAt: string | null;
    lastSessionPersistedAt: string | null;
    error: string | null;
    disconnectReason: string | null;
    engineState: string | null;
};

export type WhatsAppConversation = {
    id: string;
    name: string;
    isGroup: boolean;
    unreadCount: number;
    muted: boolean;
    lastMessage: {
        id: string | null;
        body: string;
        fromMe: boolean;
        timestamp: string | null;
        author: string | null;
        type: string | null;
    } | null;
};

export type WhatsAppConversationDetail = {
    chat: {
        id: string;
        name: string;
        isGroup: boolean;
    };
    messages: Array<{
        id: string | null;
        body: string;
        fromMe: boolean;
        timestamp: string | null;
        type: string | null;
        author: string | null;
        ack: number | null;
    }>;
};

type ApiEnvelope<T> = { success: true; data: T } | { success: false; error?: string };

function unwrap<T>(res: ApiEnvelope<T>): T {
    if (!res?.success) {
        const error = res?.error ?? "Error en el servicio de WhatsApp";
        throw new Error(error);
    }
    return res.data;
}

function withQuery(base: string, params: Record<string, string | undefined>): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value) search.set(key, value);
    }
    const qs = search.toString();
    return qs ? `${base}?${qs}` : base;
}

export const whatsappService = {
    async getStatus(): Promise<WhatsAppStatus> {
        const res = await api.get<ApiEnvelope<WhatsAppStatus>>("/api/v1/whatsapp/status");
        return unwrap(res);
    },
    async listConversations(options: { limit?: number; includeGroups?: boolean } = {}): Promise<WhatsAppConversation[]> {
        const { limit, includeGroups = true } = options;
        const res = await api.get<ApiEnvelope<WhatsAppConversation[]>>(
            withQuery("/api/v1/whatsapp/conversations", {
                limit: limit ? String(limit) : undefined,
                includeGroups: includeGroups ? undefined : "false",
            })
        );
        return unwrap(res);
    },
    async getConversation(chatId: string, options: { limit?: number } = {}): Promise<WhatsAppConversationDetail> {
        const res = await api.get<ApiEnvelope<WhatsAppConversationDetail>>(
            withQuery(`/api/v1/whatsapp/conversations/${encodeURIComponent(chatId)}/messages`, {
                limit: options.limit ? String(options.limit) : undefined,
            })
        );
        return unwrap(res);
    },
};
