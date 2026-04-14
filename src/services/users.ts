import { api } from "@/lib/api";

export type UserRole = "admin" | "operator" | "viewer" | "user";

export type User = {
    _id: string;
    username: string;
    email: string;
    role: UserRole;
    lastLogin: string;
    isActive: boolean;
    name: string;
    surname: string;
};

export const usersService = {
    async list(): Promise<User[]> {
        const data = await api.getData<{ users: User[] }>("/api/v1/users");
        return data.users;
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
    }
};
