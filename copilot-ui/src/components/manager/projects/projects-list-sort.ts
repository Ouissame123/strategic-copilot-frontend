import type { ProjectListItem } from "@/types/api.types";

export type ProjectsListSortKey =
    | "project"
    | "priority"
    | "team"
    | "budget"
    | "deadline"
    | "updated";

export type ProjectsListSortDirection = "asc" | "desc";

const DEADLINE_ORDER: Record<string, number> = { overdue: 0, urgent: 1, warning: 2, ok: 3 };

function budgetConsumption(project: ProjectListItem): number | null {
    const planned = project.budget_rh_planned;
    const actual = project.budget_rh_actual;
    if (planned == null || actual == null || planned <= 0) return null;
    return (actual / planned) * 100;
}

function compareNullable(a: number | null, b: number | null, direction: ProjectsListSortDirection): number {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return direction === "asc" ? a - b : b - a;
}

function timestamp(value: string | null | undefined): number | null {
    if (!value) return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
}

/** Tri d'affichage local uniquement — n'invente aucune métrique métier. */
export function sortProjectsList(
    projects: ProjectListItem[],
    sortKey: ProjectsListSortKey,
    direction: ProjectsListSortDirection,
): ProjectListItem[] {
    const arr = [...projects];
    arr.sort((a, b) => {
        switch (sortKey) {
            case "project":
                return direction === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            case "priority":
                return compareNullable(a.priority, b.priority, direction);
            case "team":
                return compareNullable(a.team_size, b.team_size, direction);
            case "budget":
                return compareNullable(budgetConsumption(a), budgetConsumption(b), direction);
            case "deadline": {
                const urgency = compareNullable(
                    a.deadline_urgency ? (DEADLINE_ORDER[a.deadline_urgency] ?? null) : null,
                    b.deadline_urgency ? (DEADLINE_ORDER[b.deadline_urgency] ?? null) : null,
                    direction,
                );
                return urgency || compareNullable(timestamp(a.milestone_at), timestamp(b.milestone_at), direction);
            }
            case "updated":
                return compareNullable(timestamp(a.updated_at), timestamp(b.updated_at), direction);
            default:
                return 0;
        }
    });
    return arr;
}
