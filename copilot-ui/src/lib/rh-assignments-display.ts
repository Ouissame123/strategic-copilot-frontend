import type { RhAssignmentRow } from "@/types/rh-assignments.types";

/** Manager affecté — basé sur `manager_name` (affichage tableau). */
export function rowHasManager(row: RhAssignmentRow): boolean {
    return Boolean(row.manager_name?.trim());
}

export function resolveAssignmentManagerName(row: RhAssignmentRow): string {
    return row.manager_name?.trim() || "Sans manager";
}

export function resolveAssignmentManagerEmail(row: RhAssignmentRow): string {
    if (!rowHasManager(row)) return "Non assigné";
    return row.manager_email?.trim() || "Email non renseigné";
}

export function resolveAssignmentStatusLabel(row: RhAssignmentRow): string {
    return rowHasManager(row) ? "Affecté" : "Sans manager";
}

export function assignmentStatusBadgeClass(row: RhAssignmentRow): string {
    return rowHasManager(row)
        ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
        : "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300";
}

export function fmtAssignmentUpdatedAt(d?: string | null): string {
    if (!d?.trim()) return "Non renseigné";
    const t = new Date(d);
    if (Number.isNaN(t.getTime())) return d;
    return t.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export type RhManagerFilter = "all" | "with_manager" | "without_manager";

export function matchesManagerFilter(row: RhAssignmentRow, filter: RhManagerFilter): boolean {
    if (filter === "all") return true;
    if (filter === "with_manager") return rowHasManager(row);
    return !rowHasManager(row);
}

export function matchesSearch(row: RhAssignmentRow, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const hay = [
        row.talent_name,
        row.talent_email,
        row.job_title,
        row.manager_name,
        row.manager_email,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    return hay.includes(q);
}

export function countTalentsWithManager(assignments: RhAssignmentRow[]): number {
    return assignments.filter(rowHasManager).length;
}

export function countTalentsWithoutManager(assignments: RhAssignmentRow[]): number {
    return assignments.filter((r) => !rowHasManager(r)).length;
}
