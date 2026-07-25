import type {
    TalentRequestPriority,
    TalentRequestStatus,
    TalentRequestType,
} from "@/types/talent-requests";
import { cx } from "@/utils/cx";

export type BadgeTone = "blue" | "violet" | "amber" | "slate" | "emerald" | "red" | "orange";

export const TYPE_TONES: Record<TalentRequestType, BadgeTone> = {
    formation: "blue",
    mobilite: "violet",
    conge: "amber",
    feedback: "slate",
    autre: "slate",
};

export const STATUS_TONES: Record<string, BadgeTone> = {
    pending: "amber",
    accepted: "emerald",
    rejected: "red",
    refused: "red",
    transferred_to_hr: "blue",
    transferred_rh: "blue",
    in_progress: "blue",
    done: "emerald",
    closed: "slate",
    cancelled: "slate",
};

export function normalizeRequestStatusKey(raw: string | null | undefined): string {
    return String(raw ?? "pending")
        .trim()
        .toLowerCase() || "pending";
}

export function isPendingStatus(s: string): boolean {
    return normalizeRequestStatusKey(s) === "pending";
}

export function isAcceptedStatus(s: string): boolean {
    return normalizeRequestStatusKey(s) === "accepted";
}

export function isRejectedStatus(s: string): boolean {
    return ["rejected", "refused"].includes(normalizeRequestStatusKey(s));
}

export function isTransferredStatus(s: string): boolean {
    return ["transferred_rh", "transferred_to_hr", "in_progress"].includes(normalizeRequestStatusKey(s));
}

export function isDoneStatus(s: string): boolean {
    return ["done", "closed", "cancelled"].includes(normalizeRequestStatusKey(s));
}

export const PRIORITY_TONES: Record<TalentRequestPriority, BadgeTone> = {
    urgent: "red",
    high: "orange",
    normal: "slate",
    low: "slate",
};

const TONE_CLASS: Record<BadgeTone, string> = {
    blue: "bg-primary-50 text-primary-700 ring-primary-200",
    violet: "bg-primary-50 text-primary-700 ring-primary-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    orange: "bg-orange-50 text-orange-700 ring-orange-200",
};

export function badgeToneClass(tone: BadgeTone): string {
    return cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", TONE_CLASS[tone]);
}

export type TalentRequestsTab = "all" | "pending" | "accepted" | "rejected" | "archived" | "cancelled";

export const TALENT_REQUEST_TABS: { value: TalentRequestsTab; label: string }[] = [
    { value: "all", label: "Toutes" },
    { value: "pending", label: "En attente" },
    { value: "accepted", label: "Acceptées" },
    { value: "rejected", label: "Rejetées" },
    { value: "archived", label: "Archivées" },
];

export function tabToApiStatus(tab: TalentRequestsTab): TalentRequestStatus | undefined {
    if (tab === "all") return undefined;
    if (tab === "pending") return "pending";
    if (tab === "accepted") return "accepted";
    if (tab === "rejected") return "rejected";
    if (tab === "archived" || tab === "cancelled") return "cancelled";
    return undefined;
}

export function parseTabParam(raw: string | null): TalentRequestsTab {
    const value = (raw ?? "all").trim().toLowerCase();
    if (value === "cancelled") return "archived";
    const allowed: TalentRequestsTab[] = ["all", "pending", "accepted", "rejected", "archived"];
    return allowed.includes(value as TalentRequestsTab) ? (value as TalentRequestsTab) : "all";
}

export const REQUEST_TYPE_OPTIONS: { value: TalentRequestType | "all"; label: string }[] = [
    { value: "all", label: "Tous les types" },
    { value: "formation", label: "Formation" },
    { value: "mobilite", label: "Mobilité" },
    { value: "conge", label: "Congé" },
    { value: "feedback", label: "Feedback" },
    { value: "autre", label: "Autre" },
];

export function formatPayloadEntries(payload: Record<string, unknown>): { key: string; value: string }[] {
    return Object.entries(payload)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([key, value]) => ({
            key,
            value: typeof value === "object" ? JSON.stringify(value) : String(value),
        }));
}

export function isDecidedStatus(status: TalentRequestStatus | string): boolean {
    const s = normalizeRequestStatusKey(status);
    return ["accepted", "rejected", "refused", "done", "closed", "cancelled"].includes(s);
}
