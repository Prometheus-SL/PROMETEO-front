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

type ApiSuccess<T> = { success: true; data: { users: T } };
type ApiFailure = { success: false; error?: string; message?: string };

function getApiErrorMessage(response: ApiFailure | null | undefined, fallback: string) {
    return response?.error || response?.message || fallback;
}

export const usersService = {
    async list(): Promise<User[]> {
        const res = await api.get<ApiSuccess<User[]> | ApiFailure>("/api/v1/users");
        if (!res || ("success" in res && !res.success)) {
            const msg = getApiErrorMessage(res as ApiFailure, "No se pudo obtener la lista de usuarios");
            throw new Error(msg);
        }
        return (res as ApiSuccess<User[]>).data.users;
    },
    async toggleActive(userId: string, isActive: boolean): Promise<void> {
        const res = await api.patch<ApiSuccess<null> | ApiFailure>(`/api/v1/users/${userId}/status`, { isActive })
        if (!res || ("success" in res && !res.success)) {
            const msg = getApiErrorMessage(res as ApiFailure, "No se pudo cambiar el estado del usuario");
            throw new Error(msg);
        }
    },
    async delete(userId: string): Promise<void> {
        const res = await api.delete<ApiSuccess<null> | ApiFailure>(`/api/v1/users/${userId}`);
        if (!res || ("success" in res && !res.success)) {
            const msg = getApiErrorMessage(res as ApiFailure, "No se pudo eliminar el usuario");
            throw new Error(msg);
        }
    },
    async updateRole(userId: string, role: UserRole): Promise<void> {
        const res = await api.patch<ApiSuccess<null> | ApiFailure>(`/api/v1/users/${userId}/role`, { role });
        if (!res || ("success" in res && !res.success)) {
            const msg = getApiErrorMessage(res as ApiFailure, "No se pudo cambiar el rol del usuario");
            throw new Error(msg);
        }
    },
    async closeSessions(userId: string): Promise<void> {
        const res = await api.post<ApiSuccess<null> | ApiFailure>(`/api/v1/users/${userId}/logout-all`);
        if (!res || ("success" in res && !res.success)) {
            const msg = getApiErrorMessage(res as ApiFailure, "No se pudo cerrar las sesiones del usuario");
            throw new Error(msg);
        }
    },
    async getById(userId: string): Promise<User> {
        const res = await api.get<{ success: true; data: { user: User } } | ApiFailure>(`/api/v1/users/${userId}`);
        if (!res || ("success" in res && !res.success)) {
            const msg = getApiErrorMessage(res as ApiFailure, "No se pudo obtener el usuario");
            throw new Error(msg);
        }
        return (res as { success: true; data: { user: User } }).data.user;
    },
    async updateProfile(userId: string, profile: { email?: string; name?: string; surname?: string; birthday?: string; isActive?: boolean; }): Promise<void> {
        const res = await api.patch<ApiSuccess<null> | ApiFailure>(`/api/v1/users/${userId}`, profile);
        if (!res || ("success" in res && !res.success)) {
            const msg = getApiErrorMessage(res as ApiFailure, "No se pudo actualizar el perfil del usuario");
            throw new Error(msg);
        }
    },
    async resetPassword(userId: string, password: string): Promise<void> {
        const res = await api.post<ApiSuccess<null> | ApiFailure>(`/api/v1/users/${userId}/reset-password`, { password });
        if (!res || ("success" in res && !res.success)) {
            const msg = getApiErrorMessage(res as ApiFailure, "No se pudo cambiar la contraseña del usuario");
            throw new Error(msg);
        }
    }
};
