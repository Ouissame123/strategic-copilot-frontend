import { stripLeadingSubjectPrefix } from "@/components/manager/rh-requests/rh-requests-utils";
import { stripTechnicalScoringSegments } from "@/lib/business-explanation";
import { readRhRequestField } from "@/utils/rh-requests-decision";

/**
 * TODO BACKEND : `rh_actions.message` doit contenir un libellé FR lisible,
 * pas une clé technique (`typeOverload`, etc.). Pipeline atomique talent_request → rh_action.
 */
const TYPE_TITLE_FALLBACK: Record<string, string> = {
    typeOverload: "Surcharge équipe à traiter",
    typeRecruitment: "Demande de recrutement",
    typeReallocation: "Demande de réaffectation",
    typeTraining: "Demande de formation",
    typeSkillGap: "Écart de compétences",
};

const TYPE_LABEL_FR: Record<string, string> = {
    skill_gap: "Écart de compétences",
    reallocation: "Réaffectation",
    training: "Formation",
    overload: "Surcharge",
    recruitment: "Recrutement",
};

function looksLikeI18nKey(value: string): boolean {
    const t = value.trim();
    return /^type[A-Z]/.test(t) || /^workspace\./.test(t) || /^rh\./.test(t);
}

/** Titre affiché — donnée métier, jamais passée dans `t()`. */
export function getRequestTitle(row: Record<string, unknown>): string {
    const typeLabel = getRequestTypeLabel(
        String(row.type ?? ""),
        readRhRequestField(row, ["type_label", "typeLabel"]) || null,
    );

    for (const key of ["title", "subject", "request_title", "label", "name"] as const) {
        const raw = row[key];
        if (typeof raw !== "string") continue;
        const t = stripLeadingSubjectPrefix(raw.trim());
        if (!t) continue;
        if (TYPE_TITLE_FALLBACK[t]) return TYPE_TITLE_FALLBACK[t];
        if (looksLikeI18nKey(t)) continue;
        return t;
    }

    const msg = String(row.message ?? row.description ?? "").trim();
    if (msg) {
        const head = stripLeadingSubjectPrefix(msg.split(/\r?\n/)[0]?.trim() ?? msg);
        if (head && !looksLikeI18nKey(head)) {
            if (TYPE_TITLE_FALLBACK[head]) return TYPE_TITLE_FALLBACK[head];
            return head.length > 140 ? `${head.slice(0, 140)}…` : head;
        }
    }

    const typeLabelField = readRhRequestField(row, ["type_label", "typeLabel"]);
    if (typeLabelField && !looksLikeI18nKey(typeLabelField)) return typeLabelField;

    return typeLabel || "Demande RH";
}

export function getRequestTypeLabel(type: string, typeLabelFromBackend?: string | null): string {
    const backend = typeLabelFromBackend?.trim();
    if (backend) return backend;
    const key = type.trim().toLowerCase();
    return TYPE_LABEL_FR[key] ?? (key ? key.replace(/_/g, " ") : "Demande RH");
}

/** Projet affiché — `—` si absent ou placeholder backend. */
export function formatProjectDisplay(name: string | null | undefined): string {
    if (!name?.trim()) return "—";
    const n = name.trim();
    if (n === "Projet non renseigné" || n === "Non disponible") return "—";
    return n;
}

export function formatRelativeTimeFr(iso: string | null | undefined): string {
    if (!iso?.trim()) return "—";
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return "—";
    const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (sec < 45) return "À l'instant";
    const min = Math.floor(sec / 60);
    if (min < 60) return `il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `il y a ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `il y a ${d} jour${d > 1 ? "s" : ""}`;
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function humanizeMessagePreview(raw: string): string {
    return stripTechnicalScoringSegments(raw).replace(/\s+/g, " ").trim();
}
