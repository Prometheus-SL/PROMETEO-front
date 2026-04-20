import { api } from "@/lib/api";

export type AgentGroup = {
    _id: string;
    name: string;
    description?: string;
    agents: string[];
    color?: string;
    createdAt?: string;
    updatedAt?: string;
};

export const agentGroupsService = {
    async list(): Promise<AgentGroup[]> {
        const data = await api.getData<{ groups: AgentGroup[] }>("/api/v1/agents/groups");
        return data.groups;
    },
    async create(payload: { name: string; description?: string; agents?: string[]; color?: string }): Promise<AgentGroup> {
        const data = await api.postData<{ group: AgentGroup }>("/api/v1/agents/groups", payload);
        return data.group;
    },
    async update(groupId: string, payload: Partial<{ name: string; description: string; agents: string[]; color: string }>): Promise<AgentGroup> {
        const data = await api.patchData<{ group: AgentGroup }>(`/api/v1/agents/groups/${groupId}`, payload);
        return data.group;
    },
    async remove(groupId: string): Promise<void> {
        await api.deleteData<null>(`/api/v1/agents/groups/${groupId}`);
    },
};
