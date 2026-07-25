import type { RhActionRequestType } from "@/api/rh-actions.api";
import type { KpiBucket, PriorityFilter } from "@/components/manager/rh-requests/rh-requests-utils";
import {
    cardDescription,
    formatSentOnDateLong,
    kpiBucket,
    pickRhActionPatchId,
    rowPriorityDisplayBucket,
    typeTranslationKey,
} from "@/components/manager/rh-requests/rh-requests-utils";

export type RhRequest = Record<string, unknown> & { id: string };

const CANCELLED_STATUSES = new Set(["cancelled", "canceled", "annulée", "annulee", "annulé", "annule"]);

export function normalizeStatus(status: unknown): string {
    return String(status ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/-/g, "_");
}

export function isCancelledStatus(status: unknown): boolean {
    const s = normalizeStatus(status);
    if (CANCELLED_STATUSES.has(s)) return true;
    return s.includes("annul") || s.includes("cancel");
}

export function formatTypeLabel(type?: string, tr?: (k: string) => string): string {
    const raw = String(type ?? "").trim().toLowerCase();
    if (tr) {
        const keys: Record<string, RhActionRequestType> = {
            recruitment: "recruitment",
            recrutement: "recruitment",
            reallocation: "reallocation",
            training: "training",
            formation: "training",
            overload: "overload",
            skill_gap: "skill_gap",
        };
        const key = keys[raw];
        if (key) return tr(typeTranslationKey(key));
    }
    const labels: Record<string, string> = {
        recruitment: "Recrutement",
        recrutement: "Recrutement",
        reallocation: "Réaffectation",
        training: "Formation",
        formation: "Formation",
        overload: "Surcharge",
        skill_gap: "Écart compétences",
        arbitration: "Arbitrage",
        arbitrage: "Arbitrage",
    };
    return labels[raw] ?? (raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Demande RH");
}

export function formatRequestObject(raw: unknown, type?: string, tr?: (k: string) => string): string {
    if (raw == null || raw === "") return formatTypeLabel(type, tr) || "Demande RH";

    if (typeof raw === "object" && !Array.isArray(raw)) {
        const o = raw as Record<string, unknown>;
        const name =
            o.talent_name ?? o.name ?? o.full_name ?? (o.talent && typeof o.talent === "object" ? (o.talent as Record<string, unknown>).name : null);
        if (name) return `${formatTypeLabel(type, tr)} : ${String(name)}`;
        if (o.project_name) return `${formatTypeLabel(type, tr)} : ${String(o.project_name)}`;
    }

    const text = String(raw).trim();
    if (!text) return formatTypeLabel(type, tr) || "Demande RH";

    const jsonStart = /^[\s\n\r]*[[{]/;
    if (jsonStart.test(text)) {
        try {
            const parsed: unknown = JSON.parse(text);

            if (Array.isArray(parsed)) {
                const names = parsed
                    .map((item) => {
                        if (!item || typeof item !== "object") return null;
                        const row = item as Record<string, unknown>;
                        return (
                            row.talent_name ??
                            row.name ??
                            row.full_name ??
                            (row.talent && typeof row.talent === "object"
                                ? (row.talent as Record<string, unknown>).name
                                : null)
                        );
                    })
                    .filter((n): n is string => Boolean(n && String(n).trim()));

                if (names.length > 0) {
                    const visible = names.slice(0, 2).join(", ");
                    const suffix = names.length > 2 ? ` +${names.length - 2}` : "";
                    return `${formatTypeLabel(type, tr)} : ${visible}${suffix} (${names.length})`;
                }

                return `${formatTypeLabel(type, tr)} : ${parsed.length} élément(s)`;
            }

            if (typeof parsed === "object" && parsed !== null) {
                const o = parsed as Record<string, unknown>;
                const name = o.talent_name ?? o.name ?? o.full_name ?? o.project_name;
                if (name) return `${formatTypeLabel(type, tr)} : ${String(name)}`;
            }
        } catch {
            /* texte normal */
        }
    }

    return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

export function cleanAlertMessage(message?: string | null): string {
    if (!message) return "";
    return message
        .replace(/\s*\[ignore by [^\]]+\]/gi, "")
        .replace(/\s*\[ignored by [^\]]+\]/gi, "")
        .trim();
}

export function getRequestObjectRaw(request: RhRequest): unknown {
    const payload = request.payload;
    const fromPayload =
        payload && typeof payload === "object" && !Array.isArray(payload)
            ? (payload as Record<string, unknown>).request_title ??
              (payload as Record<string, unknown>).object ??
              (payload as Record<string, unknown>).title
            : undefined;

    return (
        request.object ??
        request.title ??
        request.request_title ??
        request.subject ??
        fromPayload ??
        request.summary
    );
}

function nestedStringField(obj: unknown, key: string): string | null {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
    const v = (obj as Record<string, unknown>)[key];
    const s = v == null ? "" : String(v).trim();
    return s || null;
}

/** Extrait `project_name` depuis la ligne API (champ aplati). */
export function extractRhRequestProjectName(request: RhRequest): string | null {
    const payload =
        request.payload && typeof request.payload === "object" && !Array.isArray(request.payload)
            ? request.payload
            : null;
    const metadata =
        request.metadata && typeof request.metadata === "object" && !Array.isArray(request.metadata)
            ? (request.metadata as Record<string, unknown>)
            : null;

    return (
        nestedStringField(request, "project_name") ??
        nestedStringField(request, "project_title") ??
        nestedStringField(metadata, "project_name") ??
        nestedStringField(payload, "project_name")
    );
}

/** Enrichit la ligne avec `project_name` lorsque l’API ne l’envoie pas. */
export function enrichRhRequestRow(request: RhRequest, projectNameById?: Map<string, string>): RhRequest {
    const fromApi = extractRhRequestProjectName(request);
    const projectId = String(request.project_id ?? "").trim();
    const fromCatalog = projectId && projectNameById?.get(projectId) ? projectNameById.get(projectId)! : null;
    const project_name = fromApi ?? fromCatalog ?? null;

    if (!project_name) return request;
    if (nestedStringField(request, "project_name") === project_name) return request;
    return { ...request, project_name };
}

export function getProjectLabel(request: RhRequest, projectNameById?: Map<string, string>): string {
    const direct = extractRhRequestProjectName(request);
    if (direct) return direct;

    const projectId = String(request.project_id ?? "").trim();
    if (projectId && projectNameById?.get(projectId)) {
        return projectNameById.get(projectId)!;
    }

    if (projectId) {
        return `Projet ${projectId.slice(0, 8)}`;
    }
    return "Aucun projet";
}

export function isAiSource(request: RhRequest): boolean {
    if (String(request.source ?? "").toLowerCase() === "ai") return true;
    if (String(request.generated_by ?? "").toLowerCase() === "strategist") return true;
    const meta = request.metadata;
    if (meta && typeof meta === "object" && !Array.isArray(meta)) {
        const m = meta as Record<string, unknown>;
        if (m.source_agent != null && String(m.source_agent).trim()) return true;
        if (String(m.source ?? "").toLowerCase() === "ai") return true;
    }
    return false;
}

export function sourceDisplay(request: RhRequest): string {
    return isAiSource(request) ? "✨ IA" : "👤 Manuel";
}

export function readStrategistConfidence(request: RhRequest): number | null {
    const candidates = [
        request.strategist_confidence,
        request.confidence,
        request.metadata && typeof request.metadata === "object"
            ? (request.metadata as Record<string, unknown>).confidence
            : null,
        request.payload && typeof request.payload === "object"
            ? (request.payload as Record<string, unknown>).confidence
            : null,
    ];
    for (const c of candidates) {
        const n = Number(c);
        if (Number.isFinite(n)) return Math.round(n * (n <= 1 ? 100 : 1));
    }
    return null;
}

export function daysSinceSent(request: RhRequest): number {
    const raw = request.created_at ?? request.sent_at ?? request.updated_at ?? request.submitted_at;
    const ts = new Date(String(raw ?? "")).getTime();
    if (!Number.isNaN(ts)) return Math.max(0, Math.floor((Date.now() - ts) / 86_400_000));
    return 0;
}

export function sentAgoLabel(request: RhRequest): string {
    const d = daysSinceSent(request);
    if (d === 0) return "Envoyé aujourd'hui";
    if (d === 1) return "Envoyé il y a 1 jour";
    return `Envoyé il y a ${d} jours`;
}

export function typeBadgeClass(type?: string): string {
    const t = String(type ?? "").toLowerCase();
    if (t.includes("recruit") || t.includes("recrut")) {
        return "bg-primary-50 text-primary-800 ring-primary-200 dark:bg-primary-950/50 dark:text-primary-100 dark:ring-primary-800";
    }
    if (t.includes("realloc") || t.includes("réaffect")) {
        return "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200 dark:bg-fuchsia-950/50 dark:text-fuchsia-100 dark:ring-fuchsia-800";
    }
    if (t.includes("train") || t.includes("format")) {
        return "bg-cyan-50 text-cyan-900 ring-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-100 dark:ring-cyan-800";
    }
    if (t.includes("arbitr")) {
        return "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-800";
    }
    if (t.includes("skill") || t.includes("compét") || t.includes("compet")) {
        return "bg-primary-50 text-primary-800 ring-primary-200 dark:bg-primary-950/50 dark:text-primary-100 dark:ring-primary-800";
    }
    return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600";
}

export function priorityBadgeClass(bucket: PriorityFilter): string {
    if (bucket === "urgent") {
        return "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-100 dark:ring-rose-900";
    }
    if (bucket === "low") {
        return "bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700";
    }
    return "bg-slate-100 text-slate-800 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600";
}

export function statusBadgeClass(bucket: KpiBucket): string {
    if (bucket === "pending") {
        return "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-900";
    }
    if (bucket === "accepted") {
        return "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-900";
    }
    if (bucket === "in_progress") {
        return "bg-primary-50 text-primary-900 ring-primary-200 dark:bg-primary-950/50 dark:text-primary-100 dark:ring-primary-900";
    }
    if (bucket === "done") {
        return "bg-primary-50 text-primary-900 ring-primary-200 dark:bg-primary-950/50 dark:text-primary-100 dark:ring-primary-900";
    }
    if (bucket === "cancelled") {
        return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600";
    }
    return "bg-rose-50 text-rose-900 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-100 dark:ring-rose-900";
}

export type RhRequestViewModel = {
    id: string;
    raw: RhRequest;
    objectLabel: string;
    objectFull: string;
    typeKey: string;
    typeLabel: string;
    projectLabel: string;
    priorityBucket: PriorityFilter;
    statusBucket: KpiBucket;
    sourceAi: boolean;
    sourceDisplay: string;
    createdTs: number;
    createdLabel: string;
    sentAgo: string;
    description: string;
    confidence: number | null;
    patchId: string | null;
    showCancel: boolean;
};

export function buildRhRequestViewModel(
    row: RhRequest,
    tr: (k: string) => string,
    locale: string,
    statusOverride?: KpiBucket,
    projectNameById?: Map<string, string>,
): RhRequestViewModel {
    const enriched = enrichRhRequestRow(row, projectNameById);
    const typeKey = String(enriched.type ?? enriched.request_type ?? "").trim();
    const objectRaw = getRequestObjectRaw(enriched);
    const objectFull = formatRequestObject(objectRaw, typeKey, tr);
    const sentAt = enriched.created_at ?? enriched.sent_at ?? enriched.updated_at ?? enriched.submitted_at;
    const n = new Date(String(sentAt ?? "")).getTime();
    const statusBucket = statusOverride ?? kpiBucket(enriched.status ?? enriched.state);

    return {
        id: String(enriched.id ?? "").trim(),
        raw: enriched,
        objectLabel: objectFull,
        objectFull,
        typeKey,
        typeLabel: formatTypeLabel(typeKey, tr),
        projectLabel: getProjectLabel(enriched, projectNameById),
        priorityBucket: rowPriorityDisplayBucket(enriched.priority),
        statusBucket,
        sourceAi: isAiSource(enriched),
        sourceDisplay: sourceDisplay(enriched),
        createdTs: Number.isFinite(n) ? n : 0,
        createdLabel: formatSentOnDateLong(sentAt, locale) || "—",
        sentAgo: sentAgoLabel(enriched),
        description: cleanAlertMessage(cardDescription(enriched, tr)) || cardDescription(enriched, tr),
        confidence: readStrategistConfidence(enriched),
        patchId: pickRhActionPatchId(enriched),
        showCancel: statusBucket === "pending" && Boolean(pickRhActionPatchId(enriched)),
    };
}

export const KANBAN_COLUMNS: KpiBucket[] = ["pending", "accepted", "in_progress", "done", "rejected"];

/** Transitions kanban — réservées au rôle RH (le manager ne valide pas via PATCH). */
export function kanbanPatchBody(column: KpiBucket): Record<string, unknown> | null {
    switch (column) {
        case "accepted":
            return { status: "accepted", response_message: "Demande acceptée par les RH" };
        case "in_progress":
            return { status: "in_progress", response_message: "Demande en cours de traitement" };
        case "done":
            return { status: "done", response_message: "Demande traitée avec succès" };
        case "rejected":
            return { status: "refused", response_message: "Demande refusée par les RH" };
        case "pending":
            return { status: "pending", response_message: "Demande remise en attente" };
        default:
            return null;
    }
}

export function extractPayloadJson(request: RhRequest): unknown {
    const p = request.payload ?? request.strategist_payload ?? request.metadata;
    if (p == null) return null;
    if (typeof p === "string") {
        try {
            return JSON.parse(p);
        } catch {
            return p;
        }
    }
    return p;
}

export function extractCandidates(request: RhRequest): unknown[] {
    const payload = extractPayloadJson(request);
    if (!payload || typeof payload !== "object") return [];
    const o = payload as Record<string, unknown>;
    const list = o.candidates ?? o.talents ?? o.recommendations;
    return Array.isArray(list) ? list : [];
}
