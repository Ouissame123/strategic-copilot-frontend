import type { RhActionRequestType } from "@/api/rh-actions.api";
import { formatRequestObject, getRequestObjectRaw } from "@/components/rh-requests/rhRequestFormatters";

export type KpiBucket = "pending" | "accepted" | "in_progress" | "done" | "rejected" | "cancelled";
export type StatusFilter = "all" | KpiBucket;
export type PriorityFilter = "" | "urgent" | "high" | "normal" | "low";

export const REQUEST_TYPE_ORDER: RhActionRequestType[] = ["recruitment", "reallocation", "training", "overload", "skill_gap"];

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Créateur (manager) vs décideur (RH / HR) pour l’affichage des actions UI. */
export type RhRequestViewerRole = "manager" | "rh";

export function isRhRequestDecider(role: RhRequestViewerRole): boolean {
    return role === "rh";
}

export type RhDetailModalGate =
    | "pending"
    | "accepted"
    | "in_progress"
    | "done"
    | "closed"
    | "refused"
    | "cancelled"
    | "none";

/**
 * Statut brut API → règles d’actions de la modale détail (PATCH `status` : accepted, refused, cancelled, done, closed).
 * Distinct de {@link kpiBucket} (agrégation KPI).
 */
export function rhDetailModalGate(row: Record<string, unknown>): RhDetailModalGate {
    const raw = String(row.status ?? row.state ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/-/g, "_");
    if (!raw) return "pending";
    if (
        raw === "pending" ||
        raw === "en_attente" ||
        raw === "open" ||
        raw === "submitted" ||
        raw === "new" ||
        raw === "draft"
    ) {
        return "pending";
    }
    if (raw === "refused" || raw === "rejected" || raw.includes("refus") || raw.includes("reject") || raw.includes("declin")) {
        return "refused";
    }
    if (raw === "cancelled" || raw === "canceled" || raw.includes("annul")) {
        return "cancelled";
    }
    if (raw === "closed") {
        return "closed";
    }
    if (raw === "done" || raw === "completed" || raw === "resolved") {
        return "done";
    }
    if (raw === "accepted" || raw.includes("accept") || raw === "approved") {
        return "accepted";
    }
    if (raw.includes("progress") || raw === "in_progress" || raw.includes("cours") || raw.includes("trait")) {
        return "in_progress";
    }
    return "none";
}

/** Agrégation affichage KPI — heuristique sur les libellés renvoyés par l’API (inchangé côté backend). */
export function kpiBucket(raw: unknown): KpiBucket {
    const s = String(raw ?? "")
        .trim()
        .toLowerCase();
    if (!s) return "pending";
    if (s === "refused" || s.includes("reject") || s.includes("refus") || s.includes("declin")) return "rejected";
    if (s === "cancelled" || s === "canceled" || s.includes("annul") || s.includes("cancel")) return "cancelled";
    if (s.includes("done") || s.includes("closed") || s.includes("completed") || s.includes("termin") || s === "resolved")
        return "done";
    if (s.includes("progress") || s.includes("cours") || s.includes("processing") || s.includes("assigned") || s.includes("trait"))
        return "in_progress";
    if (s.includes("accept") || s.includes("approved") || s.includes("valid")) return "accepted";
    if (s.includes("pend") || s.includes("attente") || s === "open" || s === "submitted" || s === "new" || s === "draft") return "pending";
    return "pending";
}

export function looksLikeUuid(s: string): boolean {
    return UUID_REGEX.test(s.trim());
}

export function primaryMessage(row: Record<string, unknown>): string {
    return String(row.message ?? row.body ?? row.description ?? "").trim();
}

const JUNK_ONE_WORD = new Set([
    "yy",
    "qq",
    "test",
    ",",
    ".",
    "ok",
    "x",
    "a",
    "b",
    "n",
    "na",
    "tbd",
    "todo",
    "none",
    "null",
    "undefined",
]);

/** Texte trop court / bruit de test — à masquer au profit d’un libellé pro. */
export function isUnusableDisplayText(s: string): boolean {
    const t = s.trim();
    if (t.length === 0) return true;
    if (t.length < 3) return true;
    if (JUNK_ONE_WORD.has(t.toLowerCase())) return true;
    if (/^[,.\s;:_-]+$/u.test(t)) return true;
    if (/^(.)\1+$/u.test(t) && t.length <= 4) return true;
    return false;
}

/** Retire les fragments `{{var}}` typiques i18n / templates mal remplis pour l’affichage UI. */
export function stripTemplatePlaceholders(s: string): string {
    return String(s ?? "")
        .replace(/\{\{[^}]+\}\}/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

/** Retire un ou plusieurs préfixes « Objet : » / « Subject: » / « الموضوع: » en tête (message + payload). */
export function stripLeadingSubjectPrefix(s: string): string {
    let t = String(s ?? "").trim();
    const re = /^(objet|subject|الموضوع)\s*:\s*/iu;
    for (let i = 0; i < 6; i++) {
        const next = t.replace(re, "").trim();
        if (next === t) break;
        t = next;
    }
    return t;
}

export function responseMessageFromRow(row: Record<string, unknown>): string {
    const v =
        row.response_message ??
        row.rh_response_message ??
        row.hr_response ??
        row.rh_message ??
        row.reply_message ??
        "";
    return stripTemplatePlaceholders(String(v ?? "").trim());
}

export function assignedToFromRow(row: Record<string, unknown>): string {
    const v = row.assigned_to ?? row.assignedTo ?? row.assignee ?? row.hr_assignee ?? "";
    const t = String(v ?? "").trim();
    if (looksLikeUuid(t)) return "";
    return t;
}

/** Titre carte : champs métier, sinon extrait du message ; jamais d’UUID. */
export function businessTitle(row: Record<string, unknown>, tr: (k: string) => string): string {
    const titleKeys = ["title", "subject", "summary", "request_title", "label", "name"] as const;
    for (const k of titleKeys) {
        const v = row[k as string];
        if (typeof v !== "string") continue;
        const t = v.trim();
        if (!t || looksLikeUuid(t) || isUnusableDisplayText(t)) continue;
        return stripLeadingSubjectPrefix(stripTemplatePlaceholders(t));
    }
    const msg = primaryMessage(row);
    if (msg && !looksLikeUuid(msg) && !isUnusableDisplayText(msg)) {
        const short = msg.length > 100 ? `${msg.slice(0, 100)}…` : msg;
        return stripLeadingSubjectPrefix(stripTemplatePlaceholders(short));
    }
    return stripLeadingSubjectPrefix(stripTemplatePlaceholders(tr("defaultRequestTitle")));
}

/** Titre lisible basé sur le message (fallback « Demande RH à compléter » si bruit). */
export function displayTitleFromRow(row: Record<string, unknown>, tr: (k: string) => string): string {
    const typeKey = String(row.type ?? row.request_type ?? "").trim();
    const fromObject = formatRequestObject(getRequestObjectRaw(row as Parameters<typeof getRequestObjectRaw>[0]), typeKey, tr);
    if (fromObject && fromObject !== "Demande RH" && !fromObject.startsWith("[")) {
        return fromObject;
    }
    const titleKeys = ["title", "subject", "summary", "request_title", "label", "name"] as const;
    for (const k of titleKeys) {
        const v = row[k as string];
        if (typeof v !== "string") continue;
        const t = v.trim();
        if (!t || looksLikeUuid(t) || isUnusableDisplayText(t)) continue;
        return stripLeadingSubjectPrefix(stripTemplatePlaceholders(t));
    }
    const msg = primaryMessage(row);
    if (msg && !looksLikeUuid(msg) && !isUnusableDisplayText(msg)) {
        const line = msg.split(/\r?\n/)[0]?.trim() ?? msg;
        const head = line.length > 120 ? `${line.slice(0, 120)}…` : line;
        return stripLeadingSubjectPrefix(stripTemplatePlaceholders(head));
    }
    return stripLeadingSubjectPrefix(stripTemplatePlaceholders(tr("requestTitleIncomplete")));
}

/** Description affichée (message complet ou libellé si vide). */
export function cardDescription(row: Record<string, unknown>, tr: (k: string) => string): string {
    const msg = primaryMessage(row);
    if (!msg || looksLikeUuid(msg) || isUnusableDisplayText(msg)) return stripTemplatePlaceholders(tr("requestTitleIncomplete"));
    return stripTemplatePlaceholders(msg);
}

export function formatSentOnDate(ts: unknown, locale: string): string {
    if (ts == null || String(ts).trim() === "") return "";
    const d = new Date(String(ts));
    if (Number.isNaN(d.getTime())) return "";
    const loc = locale.startsWith("ar") ? "ar-MA" : locale.startsWith("en") ? "en-GB" : "fr-FR";
    return d.toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" });
}

/** Date longue pour tableaux (ex. « 13 mai 2026 »). */
export function formatSentOnDateLong(ts: unknown, locale: string): string {
    if (ts == null || String(ts).trim() === "") return "";
    const d = new Date(String(ts));
    if (Number.isNaN(d.getTime())) return "";
    const loc = locale.startsWith("ar") ? "ar-MA" : locale.startsWith("en") ? "en-GB" : "fr-FR";
    return d.toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric" });
}

/** Affichage priorité (4 niveaux) à partir des chaînes API. */
export function rowPriorityDisplayBucket(raw: unknown): PriorityFilter {
    const s = String(raw ?? "")
        .trim()
        .toLowerCase();
    if (s.includes("urgent") || s === "critical" || s.includes("critique")) return "urgent";
    if (s === "high" || s.includes("haute") || s.includes("elev") || s.includes("élev") || s === "important") return "high";
    if (s.includes("faible") || s.includes("low") || s.includes("basse")) return "low";
    if (s.includes("normal") || s === "medium" || s.includes("moyenne") || s === "moderate") return "normal";
    if (!s) return "";
    return "normal";
}

export function priorityPillClass(bucket: PriorityFilter): string {
    if (bucket === "urgent") return "bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-900";
    if (bucket === "high") return "bg-orange-50 text-orange-900 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-100 dark:ring-orange-900";
    if (bucket === "low") return "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-900";
    if (bucket === "normal") return "bg-slate-100 text-slate-800 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700";
    return "bg-slate-50 text-slate-500 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700";
}

export function priorityLabel(bucket: PriorityFilter, tr: (k: string) => string): string {
    if (bucket === "urgent") return tr("priorityUrgent");
    if (bucket === "high") return tr("priorityHigh");
    if (bucket === "low") return tr("priorityLow");
    if (bucket === "normal") return tr("priorityNormal");
    return tr("priorityDash");
}

export function statusPillClass(bucket: KpiBucket): string {
    if (bucket === "pending") return "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-900";
    if (bucket === "accepted") return "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-900";
    if (bucket === "in_progress") return "bg-blue-50 text-blue-900 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-100 dark:ring-blue-900";
    if (bucket === "done") return "bg-violet-50 text-violet-900 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-100 dark:ring-violet-900";
    if (bucket === "cancelled") return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600";
    return "bg-red-50 text-red-900 ring-red-200 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-900";
}

export function statusLabel(bucket: KpiBucket, tr: (k: string) => string): string {
    if (bucket === "pending") return tr("statusPending");
    if (bucket === "accepted") return tr("statusAccepted");
    if (bucket === "in_progress") return tr("statusInProgress");
    if (bucket === "done") return tr("statusDone");
    if (bucket === "cancelled") return tr("statusCancelled");
    return tr("statusRejected");
}

export function resolveRhActionId(row: Record<string, unknown>): string {
    const candidates = [row.id, row.action_id, row.rh_action_id, row.request_id];
    for (const value of candidates) {
        const id = String(value ?? "").trim();
        if (UUID_REGEX.test(id)) return id;
    }
    return "";
}

/** Identifiant pour PATCH n8n : UUID si présent, sinon `id` / champs alternatifs (non forcément UUID). */
export function pickRhActionPatchId(row: Record<string, unknown>): string | null {
    const uuidId = resolveRhActionId(row);
    if (uuidId) return uuidId;
    const primary = String(row.id ?? "").trim();
    if (primary) return primary;
    const alt = String(row.action_id ?? row.rh_action_id ?? row.request_id ?? "").trim();
    return alt || null;
}

/** Correspondance `?action=<id>` : id liste (`item.id`) ou UUID résolu. */
export function rowMatchesActionParam(row: Record<string, unknown>, actionId: string): boolean {
    const hid = actionId.trim().toLowerCase();
    if (!hid) return false;
    const id = String(row.id ?? "").trim().toLowerCase();
    if (id && id === hid) return true;
    const resolved = resolveRhActionId(row).toLowerCase();
    return Boolean(resolved) && resolved === hid;
}

export function typeTranslationKey(t: RhActionRequestType): string {
    const map: Record<RhActionRequestType, string> = {
        recruitment: "typeRecruitment",
        reallocation: "typeReallocation",
        training: "typeTraining",
        overload: "typeOverload",
        skill_gap: "typeSkillGap",
    };
    return map[t] ?? "typeSkillGap";
}

export function kpiCardAccent(id: KpiBucket): { iconWrap: string; number: string } {
    if (id === "pending") return { iconWrap: "bg-amber-100 text-amber-700", number: "text-amber-700" };
    if (id === "accepted") return { iconWrap: "bg-emerald-100 text-emerald-700", number: "text-emerald-700" };
    if (id === "in_progress") return { iconWrap: "bg-blue-100 text-blue-700", number: "text-blue-700" };
    if (id === "done") return { iconWrap: "bg-violet-100 text-violet-700", number: "text-violet-700" };
    if (id === "cancelled") return { iconWrap: "bg-slate-100 text-slate-700", number: "text-slate-700" };
    return { iconWrap: "bg-red-100 text-red-700", number: "text-red-700" };
}
