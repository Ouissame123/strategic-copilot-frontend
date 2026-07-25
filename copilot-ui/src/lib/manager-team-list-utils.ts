import type { ManagerTeamListCounts, TalentListItem } from "@/types/api.types";

export type TeamSegmentFilter = "all" | "overloaded" | "contract_ending" | "healthy";
export type TeamTableSortKey = "name" | "charge_pct" | "ipi_score" | "contract_end_date";

export const TEAM_SEGMENT_FILTERS: { id: TeamSegmentFilter; label: string; tone: string }[] = [
    { id: "all", label: "Tous", tone: "slate" },
    { id: "overloaded", label: "🔴 Surchargés", tone: "red" },
    { id: "contract_ending", label: "⏱ Contrats < 90j", tone: "orange" },
    { id: "healthy", label: "✅ Sains", tone: "emerald" },
];

const HEALTHY_IPI_BANDS = new Set(["strong", "dependable"]);

/** Charge — lit `total_allocation_pct` (alias prompt `charge_pct`). */
export function readTalentChargePct(talent: TalentListItem): number {
    return Number(talent.total_allocation_pct ?? 0);
}

export function readSegmentCount(counts: ManagerTeamListCounts | undefined, segment: TeamSegmentFilter): number | undefined {
    if (!counts) return undefined;
    if (segment === "all") {
        const v = counts.total ?? counts.all;
        return typeof v === "number" ? v : undefined;
    }
    if (segment === "overloaded") return typeof counts.overloaded === "number" ? counts.overloaded : undefined;
    if (segment === "contract_ending") {
        const v = counts.contracts_ending_soon ?? counts.contract_ending;
        return typeof v === "number" ? v : undefined;
    }
    if (segment === "healthy") return typeof counts.healthy === "number" ? counts.healthy : undefined;
    return undefined;
}

export function matchesTeamSegmentFilter(talent: TalentListItem, segment: TeamSegmentFilter): boolean {
    if (segment === "all") return true;
    const charge = readTalentChargePct(talent);
    if (segment === "overloaded") return charge > 100;
    if (segment === "contract_ending") return Boolean(talent.contract_ending_soon);
    if (segment === "healthy") {
        const band = talent.insights?.ipi_band?.trim().toLowerCase();
        return charge <= 100 && Boolean(band && HEALTHY_IPI_BANDS.has(band));
    }
    return true;
}

export function matchesTeamSearch(talent: TalentListItem, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const name = talent.full_name?.toLowerCase() ?? "";
    const email = talent.email?.toLowerCase() ?? "";
    return name.includes(q) || email.includes(q);
}

export function chargeToneClass(charge: number): string {
    if (charge >= 150) return "text-red-700 dark:text-red-400";
    if (charge >= 100) return "text-amber-700 dark:text-amber-400";
    if (charge >= 90) return "text-yellow-700 dark:text-yellow-500";
    return "text-emerald-700 dark:text-emerald-400";
}

export function chargeToneBg(charge: number): string {
    if (charge >= 150) return "bg-red-500";
    if (charge >= 100) return "bg-amber-400";
    if (charge >= 90) return "bg-yellow-300";
    return "bg-emerald-500";
}

export function chargeLeftBorderClass(charge: number): string {
    if (charge >= 150) return "border-l-4 border-l-red-500";
    if (charge >= 100) return "border-l-4 border-l-amber-400";
    if (charge >= 90) return "border-l-4 border-l-yellow-300";
    return "border-l-4 border-l-transparent";
}

export function contractUrgencyDotClass(dateIso: string): string {
    const end = new Date(dateIso).getTime();
    if (!Number.isFinite(end)) return "bg-slate-300";
    const days = Math.ceil((end - Date.now()) / 86_400_000);
    if (days <= 30) return "bg-red-500";
    if (days <= 90) return "bg-amber-400";
    return "bg-emerald-500";
}

export function ipiBandBadgeClass(band: string): string {
    const b = band.trim().toLowerCase();
    if (b === "strong") return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200";
    if (b === "dependable") return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200";
    if (b === "at_risk") return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200";
    return "bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300";
}

export function toggleTeamSort(
    currentKey: TeamTableSortKey,
    nextKey: TeamTableSortKey,
    currentDir: "asc" | "desc",
): { key: TeamTableSortKey; dir: "asc" | "desc" } {
    if (currentKey !== nextKey) {
        const defaultDir: "asc" | "desc" = nextKey === "name" || nextKey === "contract_end_date" ? "asc" : "desc";
        return { key: nextKey, dir: defaultDir };
    }
    return { key: nextKey, dir: currentDir === "asc" ? "desc" : "asc" };
}

export function sortTeamTalents(
    talents: TalentListItem[],
    sortKey: TeamTableSortKey,
    sortDir: "asc" | "desc",
): TalentListItem[] {
    const mul = sortDir === "asc" ? 1 : -1;
    return [...talents].sort((a, b) => {
        if (sortKey === "name") return mul * a.full_name.localeCompare(b.full_name, "fr");
        if (sortKey === "charge_pct") return mul * (readTalentChargePct(a) - readTalentChargePct(b));
        if (sortKey === "ipi_score") {
            const av = a.insights?.ipi_score;
            const bv = b.insights?.ipi_score;
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            return mul * (av - bv);
        }
        if (sortKey === "contract_end_date") {
            const da = a.contract_end_date ?? "9999-12-31";
            const db = b.contract_end_date ?? "9999-12-31";
            return mul * da.localeCompare(db);
        }
        return 0;
    });
}
