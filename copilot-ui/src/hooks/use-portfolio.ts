import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiGet } from "@/utils/apiClient";

export type PortfolioStatus = "active" | "at-risk" | "planned" | "paused" | "completed";

export interface PortfolioProject {
    id: string;
    name: string;
    owner: string;
    status: PortfolioStatus;
    riskLevel: "low" | "medium" | "high";
    budgetUsage: number;
    updatedAt: string;
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

const normalizeStatus = (value: unknown): PortfolioStatus => {
    if (typeof value !== "string") return "planned";
    const normalized = value.trim().toLowerCase();
    if (normalized === "active") return "active";
    if (normalized === "at-risk" || normalized === "at_risk" || normalized === "atrisk") return "at-risk";
    if (normalized === "paused") return "paused";
    if (normalized === "completed") return "completed";
    return "planned";
};

const normalizeRisk = (value: unknown): "low" | "medium" | "high" => {
    if (typeof value !== "string") return "medium";
    const normalized = value.trim().toLowerCase();
    if (normalized === "low") return "low";
    if (normalized === "high") return "high";
    return "medium";
};

const extractProjects = (payload: unknown): unknown[] => {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.projects)) return record.projects;
    if (Array.isArray(record.items)) return record.items;
    const data = record.data;
    if (data && typeof data === "object") {
        const dataRecord = data as Record<string, unknown>;
        if (Array.isArray(dataRecord.projects)) return dataRecord.projects;
        if (Array.isArray(dataRecord.items)) return dataRecord.items;
    }
    return [];
};

const mapProject = (entry: unknown, index: number): PortfolioProject => {
    const value = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    const idCandidate = value.id ?? value.projectId ?? value.slug;
    const id = idCandidate ? String(idCandidate) : `project-${index + 1}`;
    const name = value.name ? String(value.name) : `Project ${index + 1}`;
    const owner = value.owner ? String(value.owner) : "Unassigned";
    const status = normalizeStatus(value.status);
    const riskLevel = normalizeRisk(value.riskLevel ?? value.risk);
    const budgetUsage = Math.max(0, Math.min(100, toNumber(value.budgetUsage ?? value.budget ?? value.budgetPercent, 0)));
    const updatedAt = value.updatedAt ? String(value.updatedAt) : new Date().toISOString();
    return { id, name, owner, status, riskLevel, budgetUsage, updatedAt };
};

const computeSummary = (projects: PortfolioProject[]): PortfolioSummary => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === "active").length;
    const highRiskProjects = projects.filter((p) => p.riskLevel === "high").length;
    const averageBudgetUsage =
        totalProjects === 0 ? 0 : Math.round(projects.reduce((sum, p) => sum + p.budgetUsage, 0) / totalProjects);
    return { totalProjects, activeProjects, averageBudgetUsage, highRiskProjects };
};

const extractSummary = (payload: unknown, projects: PortfolioProject[]): PortfolioSummary => {
    if (!payload || typeof payload !== "object") return computeSummary(projects);
    const record = payload as Record<string, unknown>;
    const summaryValue = (record.summary ?? (record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>).summary : undefined)) as
        | Record<string, unknown>
        | undefined;
    if (!summaryValue || typeof summaryValue !== "object") return computeSummary(projects);
    return {
        totalProjects: toNumber(summaryValue.totalProjects, projects.length),
        activeProjects: toNumber(summaryValue.activeProjects, projects.filter((p) => p.status === "active").length),
        averageBudgetUsage: toNumber(summaryValue.averageBudgetUsage, computeSummary(projects).averageBudgetUsage),
        highRiskProjects: toNumber(summaryValue.highRiskProjects, projects.filter((p) => p.riskLevel === "high").length),
    };
};

const DEFAULT_TIMEOUT_MS = 15000;

export interface UsePortfolioOptions {
    timeout?: number;
}

export function usePortfolio(options: UsePortfolioOptions = {}) {
    const { timeout = DEFAULT_TIMEOUT_MS } = options;
    const [projects, setProjects] = useState<PortfolioProject[]>([]);
    const [summary, setSummary] = useState<PortfolioSummary>({
        totalProjects: 0,
        activeProjects: 0,
        averageBudgetUsage: 0,
        highRiskProjects: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOverview = useCallback(
        async (signal?: AbortSignal) => {
            setIsLoading(true);
            setError(null);
            try {
                const payload = await apiGet<unknown>("/api/portfolio/overview", { timeout, signal });
                const normalizedProjects = extractProjects(payload).map(mapProject);
                const normalizedSummary = extractSummary(payload, normalizedProjects);
                setProjects(normalizedProjects);
                setSummary(normalizedSummary);
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") return;
                setProjects([]);
                setSummary({ totalProjects: 0, activeProjects: 0, averageBudgetUsage: 0, highRiskProjects: 0 });
                setError(err instanceof ApiError ? err.message : "Erreur de connexion");
            } finally {
                setIsLoading(false);
            }
        },
        [timeout],
    );

    useEffect(() => {
        const controller = new AbortController();
        void fetchOverview(controller.signal);
        return () => controller.abort();
    }, [fetchOverview]);

    const retry = useCallback(() => {
        void fetchOverview();
    }, [fetchOverview]);

    return useMemo(
        () => ({
            projects,
            summary,
            isLoading,
            error,
            retry,
        }),
        [projects, summary, isLoading, error, retry],
    );
}
