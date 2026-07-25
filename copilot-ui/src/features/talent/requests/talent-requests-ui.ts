import type { TalentRequest, TalentRequestStatus, TalentRequestType } from "@/types/talent-requests";
import { cx } from "@/utils/cx";
import {
    REQUEST_TYPE_OPTIONS,
    TALENT_REQUEST_TABS,
    parseTabParam,
    tabToApiStatus,
    type TalentRequestsTab,
} from "@/components/talent/requests/talent-request-ui";

export type { TalentRequestsTab };
export { REQUEST_TYPE_OPTIONS, TALENT_REQUEST_TABS, parseTabParam, tabToApiStatus };

export type BadgeTone = "blue" | "violet" | "amber" | "slate" | "emerald" | "red" | "orange" | "teal";

export type RequestsStatKey = "pending" | "accepted" | "urgent";

/** Tons badge type — Mes demandes talent. */
export const TYPE_TONES: Record<TalentRequestType, BadgeTone> = {
    formation: "blue",
    mobilite: "violet",
    conge: "teal",
    feedback: "slate",
    autre: "slate",
};

export const TYPE_LABELS_FR: Record<TalentRequestType, string> = {
    formation: "Formation",
    mobilite: "Mobilité",
    conge: "Congés",
    feedback: "Feedback",
    autre: "Autre",
};

/** Tons badge statut — Mes demandes talent. */
export const STATUS_TONES: Record<string, BadgeTone> = {
    pending: "amber",
    accepted: "emerald",
    rejected: "red",
    refused: "red",
    cancelled: "slate",
    closed: "slate",
    done: "emerald",
    transferred_to_hr: "blue",
    transferred_rh: "blue",
    in_progress: "blue",
};

export const STATUS_LABELS_FR: Record<string, string> = {
    pending: "En attente",
    accepted: "Acceptée",
    rejected: "Rejetée",
    refused: "Rejetée",
    cancelled: "Archivée",
    closed: "Archivée",
    done: "Terminée",
    transferred_to_hr: "Transférée RH",
    transferred_rh: "Transférée RH",
    in_progress: "En cours",
};

const TONE_CLASS: Record<BadgeTone, string> = {
    blue: "bg-primary-50 text-primary-700 ring-primary-200 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-800",
    violet: "bg-primary-50 text-primary-700 ring-primary-200 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-800",
    amber: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800",
    slate: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-700",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800",
    red: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800",
    orange: "bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-800",
    teal: "bg-teal-50 text-teal-800 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-200 dark:ring-teal-800",
};

export function badgeToneClass(tone: BadgeTone): string {
    return cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        TONE_CLASS[tone],
    );
}

export function typeBadgeLabel(request: TalentRequest): string {
    const fromApi = request.request_type_label?.trim();
    if (fromApi) return fromApi;
    return TYPE_LABELS_FR[request.request_type] ?? "Autre";
}

export function statusBadgeLabel(request: TalentRequest): string {
    const fromApi = request.status_label?.trim();
    if (fromApi) return fromApi;
    const key = String(request.status ?? "pending").trim().toLowerCase();
    return STATUS_LABELS_FR[key] ?? request.status;
}

export function statusBadgeTone(status: TalentRequestStatus | string): BadgeTone {
    const key = String(status ?? "pending").trim().toLowerCase();
    return STATUS_TONES[key] ?? "slate";
}

/** Demande issue d’un intérêt opportunité (« Intérêt pour X ») vs création manuelle. */
export function isOpportunityInterestRequest(request: TalentRequest): boolean {
    const title = request.title.trim();
    if (/^intérêt\s+pour\b/i.test(title)) return true;

    const payload = request.payload;
    const source = String(payload.source ?? payload.origin ?? payload.request_source ?? "")
        .trim()
        .toLowerCase();
    if (source === "opportunity" || source === "matchmaker" || source === "interest") return true;

    if (payload.is_interest === true || payload.from_opportunity === true) return true;
    if (payload.opportunity_id != null && String(payload.opportunity_id).trim() !== "") return true;

    return false;
}

export function emptyTitleForTab(tab: TalentRequestsTab): string {
    switch (tab) {
        case "pending":
            return "Aucune demande en attente";
        case "accepted":
            return "Aucune demande acceptée";
        case "rejected":
            return "Aucune demande rejetée";
        case "archived":
        case "cancelled":
            return "Aucune demande archivée";
        default:
            return "Vous n'avez pas encore créé de demande";
    }
}

export function searchEmptyTitle(query: string): string {
    return `Aucune demande ne correspond à « ${query.trim()} »`;
}

export function sortRequestsByCreatedDesc(items: TalentRequest[]): TalentRequest[] {
    return [...items].sort((a, b) => {
        const ta = Date.parse(a.created_at) || 0;
        const tb = Date.parse(b.created_at) || 0;
        return tb - ta;
    });
}

export function filterRequestsBySearch(items: TalentRequest[], query: string): TalentRequest[] {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
        const title = item.title.toLowerCase();
        const description = (item.description ?? "").toLowerCase();
        return title.includes(q) || description.includes(q);
    });
}

export function filterUrgentRequests(items: TalentRequest[]): TalentRequest[] {
    return items.filter((item) => item.priority === "urgent");
}

export function tabCountFromSummary(
    tab: TalentRequestsTab,
    summary: { total: number; by_status: Record<string, number> } | undefined,
): number | undefined {
    if (!summary) return undefined;
    if (tab === "all") return summary.total;
    if (tab === "archived" || tab === "cancelled") return summary.by_status.cancelled ?? 0;
    return summary.by_status[tab] ?? 0;
}
