import { api } from "@/lib/api"

export type CommandRecord = {
    _id: string
    commandId: string
    agentId: string
    sentBy: string
    command: string
    parameters?: Record<string, unknown>
    priority: string
    status: "pending" | "sent" | "received" | "executing" | "completed" | "failed" | "timeout" | string
    createdAt: string
    scheduledFor?: string
    completedAt?: string
    response?: {
        success?: boolean
        data?: Record<string, unknown> | null
        error?: string | null
        executionTime?: number
    } | null
}

export type AgentCommandsResponse = {
    commands: CommandRecord[]
    pagination: {
        current: number
        pages: number
        total: number
    }
}

export const controlService = {
    async sendCommand(payload: {
        agentId: string
        command: string
        parameters?: Record<string, unknown>
        priority?: "low" | "normal" | "high" | "urgent"
    }) {
        return api.postData<{
            commandId?: string
            status?: string
            priority?: string
            scheduledFor?: string
        }>("/control/command", payload)
    },
    async getCommand(commandId: string) {
        const data = await api.getData<{ command: CommandRecord }>(`/control/commands/${encodeURIComponent(commandId)}`)
        return data.command
    },
    async listAgentCommands(agentId: string, params?: { limit?: number; page?: number; status?: string; command?: string; from?: string; to?: string }) {
        const query = new URLSearchParams()
        if (params?.limit !== undefined) query.set("limit", String(params.limit))
        if (params?.page !== undefined) query.set("page", String(params.page))
        if (params?.status) query.set("status", params.status)
        if (params?.command) query.set("command", params.command)
        if (params?.from) query.set("from", params.from)
        if (params?.to) query.set("to", params.to)

        return api.getData<AgentCommandsResponse>(
            `/control/agents/${encodeURIComponent(agentId)}/commands${query.toString() ? `?${query.toString()}` : ""}`
        )
    },
    async listCommands(params?: { limit?: number; page?: number; status?: string; command?: string; from?: string; to?: string }) {
        const query = new URLSearchParams()
        if (params?.limit !== undefined) query.set("limit", String(params.limit))
        if (params?.page !== undefined) query.set("page", String(params.page))
        if (params?.status) query.set("status", params.status)
        if (params?.command) query.set("command", params.command)
        if (params?.from) query.set("from", params.from)
        if (params?.to) query.set("to", params.to)

        return api.getData<AgentCommandsResponse>(
            `/control/commands${query.toString() ? `?${query.toString()}` : ""}`
        )
    },

    async cancelCommand(commandId: string, reason?: string) {
        return api.postData<{ command: CommandRecord }>(
            `/control/commands/${encodeURIComponent(commandId)}/cancel`,
            reason ? { reason } : {}
        )
    },
}
