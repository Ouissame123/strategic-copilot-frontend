import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    managerReportsApi,
    type BoardPackGenerateParams,
    type ProjectDossierGenerateParams,
    type ScheduleReportParams,
    type SendReportEmailParams,
} from "@/api/manager-reports.api";
import type { GenerateReportResponse } from "@/api/reports.api";
import type { ReportHistoryItem } from "@/components/reports/types";
import { parseReportsHistoryResponse } from "@/hooks/use-reports-n8n";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";

export type ReportsHistoryData = {
    count: number;
    reports: ReportHistoryItem[];
    display: ReportHistoryItem[];
};

function asRecord(v: unknown): Record<string, unknown> | null {
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function readHistoryCount(raw: unknown, fallback: number): number {
    let node: unknown = raw;
    if (Array.isArray(node) && node.length > 0) node = node[0];
    const rec = asRecord(node);
    if (!rec) return fallback;
    for (const key of ["data", "body", "payload", "result"] as const) {
        const nested = asRecord(rec[key]);
        if (nested && typeof nested.count === "number") return nested.count;
    }
    if (typeof rec.count === "number") return rec.count;
    return fallback;
}

export function useReportsEnterpriseId(): string {
    const { user } = useAuth();
    return (user?.enterpriseId ?? (import.meta.env.VITE_MANAGER_ENTERPRISE_ID as string | undefined) ?? "").trim();
}

export function useReportsHistory(limit = 50) {
    const enterpriseId = useReportsEnterpriseId();

    return useQuery({
        queryKey: ["reports-history", enterpriseId, limit],
        queryFn: async (): Promise<ReportsHistoryData> => {
            if (!enterpriseId) throw new Error("enterprise_id requis");
            const raw = await managerReportsApi.getHistory(enterpriseId, limit);
            const parsed = parseReportsHistoryResponse(raw);
            return {
                count: readHistoryCount(raw, parsed.all.length),
                reports: parsed.all,
                display: parsed.display,
            };
        },
        enabled: Boolean(enterpriseId),
        retry: false,
        staleTime: 15_000,
    });
}

function useInvalidateReportsHistory() {
    const enterpriseId = useReportsEnterpriseId();
    const qc = useQueryClient();
    return () => {
        if (!enterpriseId) return;
        void qc.invalidateQueries({ queryKey: ["reports-history", enterpriseId] });
    };
}

function openGeneratedPdf(data: GenerateReportResponse) {
    const url = data.file_url?.trim();
    if (url) window.open(url, "_blank", "noopener,noreferrer");
}

export function useGenerateBoardPack() {
    const enterpriseId = useReportsEnterpriseId();
    const invalidate = useInvalidateReportsHistory();
    const { push } = useToast();

    return useMutation({
        mutationFn: (body: BoardPackGenerateParams) => {
            if (!enterpriseId) throw new Error("enterprise_id requis");
            return managerReportsApi.generateBoardPack(enterpriseId, body);
        },
        onSuccess: (data) => {
            const ok = data?.success !== false && !data?.error;
            if (!ok) {
                push(String(data?.error ?? data?.message ?? "Échec génération du Board Pack."), "error");
                return;
            }
            openGeneratedPdf(data);
            push("Rapport généré.", "success", 4000);
            invalidate();
        },
        onError: () => push("Échec génération du Board Pack.", "error"),
    });
}

export function useGenerateProjectDossier() {
    const enterpriseId = useReportsEnterpriseId();
    const invalidate = useInvalidateReportsHistory();
    const { push } = useToast();

    return useMutation({
        mutationFn: (body: ProjectDossierGenerateParams) => {
            if (!enterpriseId) throw new Error("enterprise_id requis");
            return managerReportsApi.generateProjectDossier(enterpriseId, body);
        },
        onSuccess: (data) => {
            const ok = data?.success !== false && !data?.error;
            if (!ok) {
                push(String(data?.error ?? data?.message ?? "Échec génération du dossier."), "error");
                return;
            }
            openGeneratedPdf(data);
            push("Rapport généré.", "success", 4000);
            invalidate();
        },
        onError: () => push("Échec génération du dossier projet.", "error"),
    });
}

export function useSendReportEmail() {
    const enterpriseId = useReportsEnterpriseId();
    const { push } = useToast();

    return useMutation({
        mutationFn: (body: SendReportEmailParams) => {
            if (!enterpriseId) throw new Error("enterprise_id requis");
            return managerReportsApi.sendEmail(enterpriseId, body);
        },
        onSuccess: (_data, vars) => {
            push(`Email envoyé à ${vars.recipients.length} destinataire(s).`, "success");
        },
        onError: () => push("Échec envoi email.", "error"),
    });
}

export function useDeleteReport() {
    const enterpriseId = useReportsEnterpriseId();
    const qc = useQueryClient();
    const { push } = useToast();

    return useMutation({
        mutationFn: (reportId: string) => {
            if (!enterpriseId) throw new Error("enterprise_id requis");
            return managerReportsApi.delete(enterpriseId, reportId);
        },
        onSuccess: (data, reportId) => {
            if (data.success) {
                if (enterpriseId) {
                    qc.setQueryData<ReportsHistoryData>(["reports-history", enterpriseId, 50], (old) => {
                        if (!old) return old;
                        return {
                            ...old,
                            count: Math.max(0, old.count - 1),
                            reports: old.reports.filter((r) => r.reportId !== reportId),
                            display: old.display.filter((r) => r.reportId !== reportId),
                        };
                    });
                }
                push("Rapport supprimé.", "success");
            } else {
                push(data.message ?? "Erreur lors de la suppression.", "error");
            }
        },
        onError: () => push("Erreur réseau lors de la suppression.", "error"),
    });
}

export function useCreateSchedule() {
    const enterpriseId = useReportsEnterpriseId();
    const { push } = useToast();

    return useMutation({
        mutationFn: (body: ScheduleReportParams) => {
            if (!enterpriseId) throw new Error("enterprise_id requis");
            return managerReportsApi.schedule(enterpriseId, body);
        },
        onSuccess: () => push("Planification créée.", "success"),
        onError: () => push("Échec création planification.", "error"),
    });
}
