import { useQuery } from "@tanstack/react-query";
import { getCopilotDashboard, getCopilotProjects } from "@/api/copilot.api";
import { queryKeys } from "@/lib/query-keys";
import { ApiError, getHttpTimeoutMs } from "@/utils/apiClient";

export type PortfolioStatus = "active" | "at-risk" | "planned" | "paused" | "completed";

export interface PortfolioProject {
    id: string;
    name: string;
    owner: string;
    status: PortfolioStatus;
    riskLevel: "low" | "medium" | "high";
    budgetUsage: number;
    updatedAt: string;
    /** Libellé brut décision Copilot (Continue / Adjust / Stop) si présent dans la charge utile. */
    aiDecision?: string;
    raw?: Record<string, unknown>;
}

export interface PortfolioSummary {
    totalProjects: number;
    activeProjects: number;
    averageBudgetUsage: number;
    highRiskProjects: number;
}

const toNumber = (value: unknown, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeStatus = (value: unknown): PortfolioStatus | null => {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === "active") return "active";
    if (normalized === "at-risk" || normalized === "at_risk" || normalized === "atrisk") return "at-risk";
    if (normalized === "paused") return "paused";
    if (normalized === "completed") return "completed";
    return null;
};

const normalizeRisk = (value: unknown): "low" | "medium" | "high" | null => {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === "low") return "low";
    if (normalized === "high") return "high";
    if (normalized === "medium" || normalized === "med") return "medium";
    return null;
};

const mapProject = (entry: unknown): PortfolioProject | null => {
    const value = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    const idCandidate = value.project_id ?? value.id ?? value.projectId ?? value.slug;
    if (!idCandidate || value.name == null) return null;
    const id = String(idCandidate);
    const name = String(value.name);
    const owner = value.owner ? String(value.owner) : "";
    const status = normalizeStatus(value.status) ?? "planned";
    const riskLevel = normalizeRisk(value.riskLevel ?? value.risk) ?? "medium";
    const scoreRaw = value.viability_score ?? value.score;
    const score = typeof scoreRaw === "number" ? scoreRaw : null;
    const budgetUsage = score == null ? 0 : Math.max(0, Math.min(100, Math.round((score / 10) * 100)));
    const updatedAt = value.updatedAt ? String(value.updatedAt) : "";
    const decRaw = value.decision ?? value.ai_decision;
    const aiDecision =
        decRaw != null && String(decRaw).trim() !== "" ? String(decRaw).trim() : undefined;
    return { id, name, owner, status, riskLevel, budgetUsage, updatedAt, aiDecision, raw: value };
};

const extractSummaryFromDashboard = (payload: unknown): PortfolioSummary => {
    if (!payload || typeof payload !== "object") {
        return { totalProjects: 0, activeProjects: 0, averageBudgetUsage: 0, highRiskProjects: 0 };
    }
    const record = payload as Record<string, unknown>;
    const summary = (record.portfolio_summary ?? {}) as Record<string, unknown>;
    const avgViability = toNumber(summary.avg_viability_score, 0);
    return {
        totalProjects: toNumber(summary.total_projects, 0),
        activeProjects: toNumber(summary.active_projects, 0),
        averageBudgetUsage: Math.max(0, Math.min(100, Math.round((avgViability / 10) * 100))),
        highRiskProjects: toNumber(summary.high_risk_projects, 0) + toNumber(summary.attention_projects, 0),
    };
};

export interface PortfolioDashboardInsights {
    summary: string | null;
    explanation: string | null;
    recommendations_text: string[];
}

function extractInsightsFromDashboard(payload: unknown): PortfolioDashboardInsights {
    if (!payload || typeof payload !== "object") {
        return { summary: null, explanation: null, recommendations_text: [] };
    }
    const d = payload as Record<string, unknown>;
    const rec = d.recommendations_text;
    return {
        summary: typeof d.summary === "string" ? d.summary : null,
        explanation: typeof d.explanation === "string" ? d.explanation : null,
        recommendations_text: Array.isArray(rec) ? rec.filter((x): x is string => typeof x === "string") : [],
    };
}

function resolvePortfolioTimeoutMs(override?: number): number {
    if (override != null && override > 0) return override;
    const env = Number((import.meta.env as Record<string, string | undefined>).VITE_PORTFOLIO_TIMEOUT_MS);
    if (Number.isFinite(env) && env >= 5000) return env;
    return Math.max(getHttpTimeoutMs(), 60000);
}

function mapPortfolioError(err: unknown): string {
    if (err instanceof ApiError) return err.message;
    if (err instanceof Error) return err.message;
    return "Erreur de connexion";
}

export interface UsePortfolioOptions {
    timeout?: number;
}

export function usePortfolio(options: UsePortfolioOptions = {}) {
    const timeout = resolvePortfolioTimeoutMs(options.timeout);
    const enterpriseId = ((import.meta.env as Record<string, string | undefined>).VITE_MANAGER_ENTERPRISE_ID ?? "").trim();

    const query = useQuery({
        queryKey: queryKeys.portfolio.overview(),
        queryFn: async ({ signal }) => {
            const opts = { signal, timeout };
            if (!enterpriseId) throw new Error("enterprise_id manquant pour le portfolio manager.");
            const [dashboard, projectsPayload] = await Promise.all([
                getCopilotDashboard({ enterprise_id: enterpriseId }, opts),
                getCopilotProjects({ enterprise_id: enterpriseId }, opts),
            ]);
            const projectItems = Array.isArray(projectsPayload.items) ? projectsPayload.items : [];
            const normalizedProjects = projectItems.map(mapProject).filter((p): p is PortfolioProject => p != null);
            const normalizedSummary = extractSummaryFromDashboard(dashboard);
            const insights = extractInsightsFromDashboard(dashboard);
            return {
                copilotDashboardRaw: dashboard,
                copilotProjectsRaw: projectsPayload,
                projects: normalizedProjects,
                summary: normalizedSummary,
                insights,
            };
        },
        staleTime: 30_000,
    });

    return {
        projects: query.data?.projects ?? [],
        summary: query.data?.summary ?? {
            totalProjects: 0,
            activeProjects: 0,
            averageBudgetUsage: 0,
            highRiskProjects: 0,
        },
        copilotDashboardRaw: query.data?.copilotDashboardRaw ?? null,
        copilotProjectsRaw: query.data?.copilotProjectsRaw ?? null,
        insights: query.data?.insights ?? {
            summary: null,
            explanation: null,
            recommendations_text: [],
        },
        isLoading: query.isPending,
        error: query.error ? mapPortfolioError(query.error) : null,
        retry: () => query.refetch(),
    };
}
