import { cx } from "@/utils/cx";

/** Tokens triage inbox (Demandes talents / Demandes RH / alertes). */

export type TriageBadgeTone = "blue" | "violet" | "amber" | "slate" | "emerald" | "red" | "orange" | "cyan" | "fuchsia";

const TONE_CLASS: Record<TriageBadgeTone, string> = {
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    orange: "bg-orange-50 text-orange-700 ring-orange-200",
    cyan: "bg-cyan-50 text-cyan-800 ring-cyan-200",
    fuchsia: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
};

export function triageBadgeClass(tone: TriageBadgeTone): string {
    return cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        TONE_CLASS[tone],
    );
}

export const TRIAGE_SEGMENTED =
    "inline-flex flex-wrap gap-0.5 rounded-md border border-secondary/60 bg-secondary_subtle/80 p-0.5";

export const TRIAGE_SEGMENT_ACTIVE =
    "bg-primary font-medium text-primary shadow-sm ring-1 ring-secondary/40";

export const TRIAGE_SEGMENT_IDLE = "text-tertiary hover:text-secondary";

export const TRIAGE_TYPE_PILL_ACTIVE =
    "border-brand-secondary/40 bg-brand-secondary/10 text-primary ring-1 ring-brand-secondary/30";

export const TRIAGE_TYPE_PILL_IDLE =
    "border-secondary bg-primary text-secondary hover:border-secondary_hover";

export function priorityDotClass(priority: string): string {
    const p = priority.toLowerCase().trim();
    if (p === "urgent") return "bg-red-500";
    if (p === "high" || p === "haute") return "bg-orange-500";
    return "bg-slate-400";
}

export function priorityLabelFr(priority: string): string {
    const p = priority.toLowerCase().trim();
    if (p === "urgent") return "Urgent";
    if (p === "high" || p === "haute") return "Haute";
    if (p === "low" || p === "faible") return "Faible";
    return "Normale";
}

const AVATAR_PALETTE = [
    "bg-blue-100 text-blue-800",
    "bg-violet-100 text-violet-800",
    "bg-emerald-100 text-emerald-800",
    "bg-amber-100 text-amber-900",
    "bg-rose-100 text-rose-800",
    "bg-cyan-100 text-cyan-800",
    "bg-fuchsia-100 text-fuchsia-800",
    "bg-slate-200 text-slate-800",
] as const;

export function hashStableIndex(seed: string, modulo: number): number {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    return Math.abs(h) % modulo;
}

export function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function avatarToneClass(name: string): string {
    return AVATAR_PALETTE[hashStableIndex(name.trim().toLowerCase() || "?", AVATAR_PALETTE.length)];
}

export function formatAbsoluteDateFr(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
