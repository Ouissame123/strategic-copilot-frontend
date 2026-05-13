/**
 * Textes « métier » pour l’UI : masque formules pondérées, coefficients et détails
 * de calcul renvoyés par l’IA / le backend, sans modifier les API.
 */

export function normalizeViabilityScore0to10(score: number | null | undefined): number | null {
    if (score == null || Number.isNaN(Number(score))) return null;
    const n = Number(score);
    if (!Number.isFinite(n)) return null;
    if (n > 10) return Math.round((n / 10) * 10) / 10;
    return Math.round(n * 10) / 10;
}

export function stripTechnicalScoringSegments(text: string): string {
    let t = text;
    t = t.replace(/score\s*=\s*[^\n]+/gi, "");
    t = t.replace(/0\.\d+\s*[x×*]\s*[A-Za-zÀ-ÿ_][\wÀ-ÿ_]*/gi, "");
    t = t.replace(/\bweighted\s+formula\b/gi, "");
    t = t.replace(/\bformule\s+pondéré[e]?/gi, "");
    t = t.replace(/\bcoefficients?\b[^.!?,\n]{0,120}/gi, "");
    t = t.replace(/\b(?:skills|capacity|budget)\s*[:=]\s*[\d.]+\s*(?:\/\s*10)?/gi, "");
    t = t.replace(/\d+(?:\.\d+)?\s*\/\s*10\s*[|·]/gi, "");
    t = t.replace(/\|\s*/g, " · ");
    t = t.replace(/[·]{2,}/g, "·");
    t = t.replace(/\s{2,}/g, " ").trim();
    return t;
}

export function looksLikeTechnicalScoringBlob(text: string): boolean {
    const s = text.trim();
    if (!s) return false;
    const lower = s.toLowerCase();
    if (/0\.\d+\s*[x×*]/.test(s)) return true;
    if (/score\s*=/.test(lower)) return true;
    if (/\d+(?:\.\d+)?\s*\/\s*10\s*[|·]/.test(s)) return true;
    if (lower.includes("skills") && lower.includes("capacity") && (s.includes("|") || s.includes("·"))) return true;
    if (/\+\s*0\.\d+/.test(s) && /[x×*]/.test(s)) return true;
    if (/ponderation|weighted|\b0\.35\b|\b0\.4\b|\b0\.25\b/.test(lower) && (/\+|=/.test(s) || /[x×*]/.test(s))) return true;
    return false;
}

function hasReadableBusinessContent(s: string): boolean {
    const t = s.trim();
    if (t.length < 28) return false;
    if (looksLikeTechnicalScoringBlob(t)) return false;
    return true;
}

export function viabilityNarrativeFallback(score: number | null | undefined, decision?: string | null): string {
    const s0 = normalizeViabilityScore0to10(score);
    if (s0 == null) {
        return "Synthèse métier indisponible pour le moment. Relance une analyse complète pour obtenir une lecture projet.";
    }
    const dec = String(decision ?? "").trim().toLowerCase();
    let band: string;
    if (s0 < 4) band = `Le projet présente un score de viabilité de ${s0}/10, dans une zone fragile.`;
    else if (s0 < 6) band = `Le projet présente un score de viabilité de ${s0}/10, dans une zone de vigilance.`;
    else if (s0 < 8) band = `Le projet présente un score de viabilité de ${s0}/10, correct mais perfectible.`;
    else band = `Le projet présente un score de viabilité solide (${s0}/10).`;

    const hint =
        dec === "continue"
            ? " La lecture globale est favorable à la poursuite, sous monitoring habituel."
            : dec === "adjust"
              ? " Une adaptation du plan ou des ressources est conseillée avant d'engager davantage."
              : dec === "stop"
                ? " Une décision d'arrêt ou de repli stratégique doit être arbitrée avec les parties prenantes."
                : "";

    return band + hint;
}

export function formatUserFacingExplanation(
    raw: unknown,
    ctx?: { score?: number | null; decision?: string | null },
): string {
    const original = String(raw ?? "").trim();
    if (!original) {
        return viabilityNarrativeFallback(ctx?.score ?? null, ctx?.decision ?? null);
    }
    const stripped = stripTechnicalScoringSegments(original);
    if (hasReadableBusinessContent(stripped)) {
        return stripped;
    }
    return viabilityNarrativeFallback(ctx?.score ?? null, ctx?.decision ?? null);
}

/** Remplace l’affichage brut de plusieurs sous-scores talent par une synthèse lisible. */
/** Lecture métier sans afficher explicitement « 10 − score ». */
export function qualitativeFragilityFromViability(score: number | null | undefined): string {
    if (score == null || !Number.isFinite(Number(score))) return "—";
    const frag = 10 - Number(score);
    if (frag >= 6.5) return "Élevée — priorisation recommandée";
    if (frag >= 4) return "Modérée — suivi renforcé";
    return "Relativement maîtrisée";
}

export function formatTalentFitNarrative(overall: number, skills: number, avail: number): string {
    if (!Number.isFinite(overall) || overall <= 0) {
        return "Les indicateurs talent ne sont pas encore consolidés.";
    }
    const o = Math.min(10, Math.max(0, overall));
    const lowSkill = Number.isFinite(skills) && skills < 5;
    const lowAvail = Number.isFinite(avail) && avail < 5;
    const base = `Positionnement global des talents sur ce projet : ${o.toFixed(1)}/10.`;
    if (lowSkill && lowAvail) {
        return `${base} Le score est surtout pénalisé par un déficit de compétences et une disponibilité serrée — planifier un renfort ou une montée en compétences.`;
    }
    if (lowSkill) return `${base} Le score est surtout pénalisé par un déficit de compétences critiques.`;
    if (lowAvail) return `${base} La disponibilité des ressources est le principal point d'attention.`;
    if (o >= 7) return `${base} Bon alignement général avec les besoins projet.`;
    return `${base} Des ajustements ciblés restent recommandés avant la prochaine revue.`;
}
