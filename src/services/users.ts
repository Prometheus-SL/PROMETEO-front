import { api } from "@/lib/api";

export type UserRole = "admin" | "operator" | "viewer" | "user";

export type User = {
    _id: string;
    username: string;
    email: string;
    role: UserRole;
    lastLogin?: string;
    isActive: boolean;
    name: string;
    surname: string;
    birthday?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type PagedUsers = {
    items: User[];
    total: number;
    page: number;
    pageSize: number;
    pages: number;
};

export type ListUsersParams = {
    query?: string;
    role?: UserRole | "all";
    isActive?: boolean | "all";
    page?: number;
    pageSize?: number;
};

export type CreateUserPayload = {
    username: string;
    email: string;
    password: string;
    role?: UserRole;
    name?: string;
    surname?: string;
    birthday?: string;
    isActive?: boolean;
};

type UsersListResponse = {
    users: User[];
    pagination?: {
        current: number;
        pages: number;
        total: number;
    };
};

function buildUsersQuery(params?: ListUsersParams) {
    const q = new URLSearchParams();
    if (params?.query) q.set("search", params.query);
    if (params?.role && params.role !== "all") q.set("role", params.role);
    if (params?.isActive !== undefined && params.isActive !== "all") {
        q.set("isActive", String(params.isActive));
    }
    if (params?.page !== undefined) q.set("page", String(params.page));
    if (params?.pageSize !== undefined) q.set("limit", String(params.pageSize));
    return q.toString();
}

export const usersService = {
    async list(): Promise<User[]> {
        const data = await api.getData<{ users: User[] }>("/api/v1/users");
        return data.users;
    },
    async listPaged(params?: ListUsersParams): Promise<PagedUsers> {
        const query = buildUsersQuery(params);
        const data = await api.getData<UsersListResponse>(
            `/api/v1/users${query ? `?${query}` : ""}`,
        );
        return {
            items: data.users,
            total: data.pagination?.total ?? data.users.length,
            page: data.pagination?.current ?? params?.page ?? 1,
            pageSize: params?.pageSize ?? data.users.length,
            pages: data.pagination?.pages ?? 1,
        };
    },
    async create(payload: CreateUserPayload): Promise<User> {
        const data = await api.postData<{ user: User }>("/api/v1/users", payload);
        return data.user;
    },
    async toggleActive(userId: string, isActive: boolean): Promise<void> {
        await api.patchData<null>(`/api/v1/users/${userId}/status`, { isActive });
    },
    async delete(userId: string): Promise<void> {
        await api.deleteData<null>(`/api/v1/users/${userId}`);
    },
    async updateRole(userId: string, role: UserRole): Promise<void> {
        await api.patchData<null>(`/api/v1/users/${userId}/role`, { role });
    },
    async closeSessions(userId: string): Promise<void> {
        await api.postData<null>(`/api/v1/users/${userId}/logout-all`);
    },
    async getById(userId: string): Promise<User> {
        const data = await api.getData<{ user: User }>(`/api/v1/users/${userId}`);
        return data.user;
    },
    async updateProfile(userId: string, profile: { email?: string; name?: string; surname?: string; birthday?: string; isActive?: boolean; }): Promise<void> {
        await api.patchData<null>(`/api/v1/users/${userId}`, profile);
    },
    async resetPassword(userId: string, password: string): Promise<void> {
        await api.postData<null>(`/api/v1/users/${userId}/reset-password`, { password });
    },

    // --- Batch operations ---
    async batchStatus(userIds: string[], isActive: boolean): Promise<void> {
        await api.postData<null>("/api/v1/users/batch/status", { userIds, isActive });
    },
    async batchRole(userIds: string[], role: UserRole): Promise<void> {
        await api.postData<null>("/api/v1/users/batch/role", { userIds, role });
    },
};
