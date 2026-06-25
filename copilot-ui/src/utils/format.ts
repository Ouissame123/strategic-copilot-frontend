import { formatUserFacingExplanation, viabilityNarrativeFallback } from "@/lib/business-explanation";

export function formatViabilityScore(score: number | null | undefined): { display: string; pct: string; header: string } {
    if (score == null || !Number.isFinite(Number(score))) {
        return { display: "—", pct: "—", header: "—" };
    }
    const n = Number(score);
    return {
        display: `${n.toFixed(1)}/10`,
        pct: `${Math.round(n * 10)}%`,
        header: n.toFixed(1),
    };
}

/** Affichage score 0–10 pour cartes opportunités talent (valeur, unité, barre %). */
export function formatViabilityScoreDisplay(score: number | null | undefined): {
    value: string;
    unit: string;
    barPct: number;
} {
    if (score == null || !Number.isFinite(Number(score))) {
        return { value: "—", unit: "", barPct: 0 };
    }
    const n = Number(score);
    return {
        value: n.toFixed(1),
        unit: "/10",
        barPct: Math.min(100, Math.max(0, Math.round(n * 10))),
    };
}

/** Score 0–10 depuis `latest_viability` (API : `viability_score`, normalisé en `score`). */
export function readLatestViabilityScore(latest: { score?: number } | null | undefined): number | null {
    const n = latest?.score;
    if (n == null || !Number.isFinite(Number(n))) return null;
    return Number(n);
}

/** Normalise un % d'avancement (0–100 ; fraction 0–1 uniquement si 0 < n ≤ 1). */
export function normalizeProgressPctValue(value: number): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return n;
    if (n > 0 && n <= 1) return Math.round(n * 100);
    return Math.round(n);
}

export function formatProgressPercent(progress: number | null | undefined): string {
    if (progress == null || !Number.isFinite(Number(progress))) return "—";
    return `${Math.round(Number(progress))}%`;
}

/**
 * Avancement réel depuis `latest_kpi.progress_pct` uniquement.
 * `null`/`undefined` → non mesuré ; `0` est une valeur valide.
 */
export function readLatestKpiProgressPct(kpi: { progress_pct?: number | null } | null | undefined): number | null {
    if (!kpi) return null;
    if (!("progress_pct" in kpi) || kpi.progress_pct === undefined || kpi.progress_pct === null) {
        return null;
    }
    const n = Number(kpi.progress_pct);
    if (!Number.isFinite(n)) return null;
    return normalizeProgressPctValue(n);
}

export function readLatestKpiHealthScore(kpi: { project_health_score?: number | null } | null | undefined): number | null {
    if (!kpi) return null;
    if (!("project_health_score" in kpi) || kpi.project_health_score === undefined || kpi.project_health_score === null) {
        return null;
    }
    const n = Number(kpi.project_health_score);
    return Number.isFinite(n) ? Number(n) : null;
}

export function readLatestKpiDelayDays(kpi: { delay_days?: number | null } | null | undefined): number | null {
    if (!kpi) return null;
    if (!("delay_days" in kpi) || kpi.delay_days === undefined || kpi.delay_days === null) {
        return null;
    }
    const n = Number(kpi.delay_days);
    return Number.isFinite(n) ? Math.round(n) : null;
}

export type MissionExecutiveSummaryContext = {
    viabilityScore: number | null;
    viabilityDecision: string | null | undefined;
    healthScore: number | null;
    progressPct: number | null;
    delayDays: number | null;
    /** Ignoré : la synthèse exécutive est construite uniquement depuis les KPI structurés. */
    rawExplanation?: string | null;
};

/**
 * Synthèse exécutive — uniquement champs structurés (`latest_kpi` / `latest_viability`).
 * N'utilise pas le texte `explanation` (souvent confond viabilité × 10, santé, retard).
 */
export function formatMissionExecutiveSummary(ctx: MissionExecutiveSummaryContext): string {
    const { viabilityScore, viabilityDecision, healthScore, progressPct, delayDays } = ctx;
    const parts: string[] = [];

    if (viabilityScore != null && Number.isFinite(viabilityScore)) {
        const decision =
            viabilityDecision != null && String(viabilityDecision).trim() !== ""
                ? ` — décision ${String(viabilityDecision).trim()}`
                : "";
        parts.push(`Score de viabilité (décision Copilot) : ${viabilityScore.toFixed(1)}/10${decision}.`);
    } else {
        parts.push(viabilityNarrativeFallback(null, viabilityDecision));
    }

    if (progressPct != null && Number.isFinite(progressPct)) {
        parts.push(`Avancement : ${Math.round(progressPct)} %.`);
    } else {
        parts.push("Progression non encore mesurée.");
    }

    if (healthScore != null && Number.isFinite(healthScore)) {
        parts.push(`Score santé projet : ${healthScore.toFixed(1)}/10.`);
    }

    if (delayDays != null && Number.isFinite(delayDays)) {
        const d = Math.round(delayDays);
        if (d === 0) {
            parts.push("Retard : aucun jour de retard signalé.");
        } else {
            parts.push(`Retard estimé : ${d} jour${Math.abs(d) > 1 ? "s" : ""}.`);
        }
    }

    return parts.filter(Boolean).join(" ");
}

/** Synthèse Copilot — texte viabilité court (hors bloc Vue d'ensemble). */
export function formatMissionViabilityExplanation(
    raw: unknown,
    viabilityScore: number | null,
    decision: string | null | undefined,
): string {
    const text = formatUserFacingExplanation(raw, { score: viabilityScore, decision });
    if (viabilityScore == null || !Number.isFinite(viabilityScore)) return text;
    const canonical = `${viabilityScore.toFixed(1)}/10`;
    return text.replace(/\b\d+(?:[.,]\d+)?\s*\/\s*10\b/g, (match, offset, full) => {
        const before = full.slice(Math.max(0, offset - 40), offset).toLowerCase();
        if (before.includes("santé") || before.includes("sante") || before.includes("health")) {
            return match;
        }
        return canonical;
    });
}

/** Montant ISO 4217 — jamais de symbole hardcodé. */
export function formatCurrency(amount: number, currency: string = "EUR", locale = "fr-FR"): string {
    const n = Number(amount);
    if (!Number.isFinite(n)) return "—";
    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: currency.trim() || "EUR",
            maximumFractionDigits: 0,
        }).format(n);
    } catch {
        return `${n} ${currency}`;
    }
}

/** Date courte locale FR. */
export function formatDateFR(iso: string | null | undefined, locale = "fr-FR"): string {
    if (!iso?.trim()) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

/** Date relative lisible (MAJ, historique). */
export function formatDateRelative(iso: string | null | undefined, locale = "fr-FR"): string {
    if (!iso?.trim()) return "—";
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return "—";
    const ageMs = Date.now() - t;
    const days = Math.floor(ageMs / 86_400_000);
    if (days <= 0) return "aujourd'hui";
    if (days === 1) return "hier";
    if (days < 7) return `il y a ${days}j`;
    if (days < 30) return `il y a ${Math.floor(days / 7)}sem.`;
    return formatDateFR(iso, locale);
}

/** Date courte pour listes (historique budget RH). */
export function formatShortDate(iso: string | null | undefined, locale = "fr-FR"): string {
    if (!iso?.trim()) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(d);
}
