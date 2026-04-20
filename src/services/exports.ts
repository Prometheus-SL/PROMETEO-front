import { API_URL } from "@/lib/api";
import { ACCESS_TOKEN_KEY } from "@/services/auth-storage";

type ExportFormat = "csv" | "json";

function buildExportUrl(path: string, params?: Record<string, string>) {
    const url = new URL(`${API_URL}${path}`);
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            if (value) url.searchParams.set(key, value);
        }
    }
    return url.toString();
}

async function downloadExport(path: string, filename: string, params?: Record<string, string>) {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const url = buildExportUrl(path, params);

    const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
            (body as { error?: { message?: string } })?.error?.message ?? `Export failed (${res.status})`
        );
    }

    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
}

export const exportsService = {
    async exportAgents(format: ExportFormat = "csv") {
        const ext = format === "csv" ? "csv" : "json";
        await downloadExport("/api/v1/export/agents", `agents.${ext}`, { format });
    },
    async exportUsers(format: ExportFormat = "csv") {
        const ext = format === "csv" ? "csv" : "json";
        await downloadExport("/api/v1/export/users", `users.${ext}`, { format });
    },
    async exportCommands(format: ExportFormat = "csv", params?: { from?: string; to?: string }) {
        const ext = format === "csv" ? "csv" : "json";
        await downloadExport("/api/v1/export/commands", `commands.${ext}`, {
            format,
            ...(params?.from ? { from: params.from } : {}),
            ...(params?.to ? { to: params.to } : {}),
        });
    },
};
