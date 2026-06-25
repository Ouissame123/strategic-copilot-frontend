import type { PendingValidation, ValidationType } from "@/services/validations.api";

export type ValidationsTimeFilterId = "today" | "week" | "month" | "all";
export type ValidationsDensity = "comfortable" | "compact";
export type ValidationsTypeFilterId = "all" | ValidationType;
export type ValidationsTimeBucket = "now" | "today" | "yesterday" | "week" | "older";

export const VALIDATIONS_TIME_FILTERS: {
    id: ValidationsTimeFilterId;
    label: string;
    hours: number | null;
}[] = [
    { id: "today", label: "Aujourd'hui", hours: 24 },
    { id: "week", label: "7 derniers jours", hours: 24 * 7 },
    { id: "month", label: "30 derniers jours", hours: 24 * 30 },
    { id: "all", label: "Tout", hours: null },
];

export const VALIDATIONS_BUCKET_LABELS: Record<ValidationsTimeBucket, string> = {
    now: "🔥 Moins de 4h",
    today: "Aujourd'hui",
    yesterday: "Hier",
    week: "7 derniers jours",
    older: "Plus ancien",
};

export const VALIDATIONS_BUCKET_ORDER: ValidationsTimeBucket[] = ["now", "today", "yesterday", "week", "older"];

export const VALIDATIONS_TYPE_FILTERS: { id: ValidationsTypeFilterId; label: string }[] = [
    { id: "all", label: "Tous types" },
    { id: "rh_action", label: "Action RH" },
    { id: "arbitrage", label: "Arbitrage" },
    { id: "decision", label: "Décision" },
];

export type ValidationDedupEntry = {
    item: PendingValidation;
    count: number;
    ids: string[];
    items: PendingValidation[];
};

export function readValidationCreatedAtMs(iso: string): number | null {
    const t = new Date(iso).getTime();
    return Number.isFinite(t) ? t : null;
}

export function validationMatchesTimeFilter(
    item: PendingValidation,
    filterId: ValidationsTimeFilterId,
    nowMs = Date.now(),
): boolean {
    const hours = VALIDATIONS_TIME_FILTERS.find((t) => t.id === filterId)?.hours;
    if (hours == null) return true;
    const created = readValidationCreatedAtMs(item.created_at);
    if (created == null) return false;
    return created >= nowMs - hours * 3_600_000;
}

export function filterValidationsByTime(
    items: PendingValidation[],
    filterId: ValidationsTimeFilterId,
): PendingValidation[] {
    return items.filter((it) => validationMatchesTimeFilter(it, filterId));
}

export function validationTimeBucket(createdAt: string, nowMs = Date.now()): ValidationsTimeBucket {
    const created = readValidationCreatedAtMs(createdAt);
    if (created == null) return "older";
    const ageHours = (nowMs - created) / 3_600_000;
    if (ageHours < 4) return "now";
    if (ageHours < 24) return "today";
    if (ageHours < 48) return "yesterday";
    if (ageHours < 24 * 7) return "week";
    return "older";
}

/** Fingerprint strict — champs backend existants uniquement. */
export function validationFingerprint(item: PendingValidation): string {
    return [item.type, item.project_id ?? "", item.why ?? "", item.category ?? ""].join("|");
}

export function dedupeValidations(items: PendingValidation[]): ValidationDedupEntry[] {
    const map = new Map<string, ValidationDedupEntry>();
    for (const it of items) {
        const key = validationFingerprint(it);
        const existing = map.get(key);
        if (existing) {
            existing.count += 1;
            existing.ids.push(it.id);
            existing.items.push(it);
        } else {
            map.set(key, { item: it, count: 1, ids: [it.id], items: [it] });
        }
    }
    return Array.from(map.values());
}

export function sortDedupEntriesByPriorityDesc(entries: ValidationDedupEntry[]): ValidationDedupEntry[] {
    return [...entries].sort((a, b) => (b.item.priority_score ?? 0) - (a.item.priority_score ?? 0));
}

export function filterDedupEntriesByType(
    entries: ValidationDedupEntry[],
    typeFilter: ValidationsTypeFilterId,
): ValidationDedupEntry[] {
    if (typeFilter === "all") return entries;
    return entries.filter((e) => e.item.type === typeFilter);
}

export function groupDedupEntriesByBucket(
    entries: ValidationDedupEntry[],
    nowMs = Date.now(),
): Record<ValidationsTimeBucket, ValidationDedupEntry[]> {
    const groups: Record<ValidationsTimeBucket, ValidationDedupEntry[]> = {
        now: [],
        today: [],
        yesterday: [],
        week: [],
        older: [],
    };
    for (const entry of entries) {
        groups[validationTimeBucket(entry.item.created_at, nowMs)].push(entry);
    }
    return groups;
}

export function validationDetailHref(item: PendingValidation): string {
    if (item.type === "rh_action") return "/workspace/manager/rh-requests";
    if (item.type === "arbitrage" && item.project_id) {
        return `/workspace/manager/projects/${encodeURIComponent(item.project_id)}`;
    }
    return "/workspace/manager/decision-log";
}
