import type {
    TalentProjectDetail,
    TalentProjectListItem,
    TalentProjectsSummary,
} from "@/types/talent-projects";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function arr<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

export function normalizeTalentProjectsList(raw: unknown): TalentProjectListItem[] {
    const root = unwrapN8nRoot(raw);
    const items = root.items ?? root.data ?? root.projects;
    return arr<TalentProjectListItem>(items);
}

export function normalizeTalentProjectsSummary(raw: unknown): TalentProjectsSummary {
    const root = unwrapN8nRoot(raw);
    const summary = asRecord(root.summary ?? root);
    const byTab = asRecord(summary.by_tab);
    return {
        total: Number(summary.total ?? 0),
        by_tab: {
            active: Number(byTab.active ?? 0),
            planned: Number(byTab.planned ?? 0),
            past: Number(byTab.past ?? 0),
        },
        unique_active_projects: Number(summary.unique_active_projects ?? 0),
        total_allocation_pct_active: Number(summary.total_allocation_pct_active ?? 0),
        allocation_status: (summary.allocation_status as TalentProjectsSummary["allocation_status"]) ?? "available",
        available_pct: Number(summary.available_pct ?? 0),
        upcoming_milestones: Number(summary.upcoming_milestones ?? 0),
    };
}

export function normalizeTalentProjectDetail(raw: unknown): TalentProjectDetail {
    const root = unwrapN8nRoot(raw);
    const project = asRecord(root.project ?? root);
    return {
        project: project as TalentProjectDetail["project"],
        team: arr(root.team),
        requirements: arr(root.requirements),
        viability: (root.viability as TalentProjectDetail["viability"]) ?? null,
        alerts: arr(root.alerts),
    };
}
