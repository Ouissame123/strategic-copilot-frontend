/**
 * Parsing pure de présentation pour le journal des décisions IA.
 * Ne modifie jamais la donnée stockée — lecture seule du texte brut.
 */

export type ParsedDecisionScores = {
    skills?: number;
    capacity?: number;
    budget?: number;
    risk?: number;
    fragility?: number;
    /** Pourcentage 0–100 si présent */
    dependence?: number;
};

export type ParsedDecision = {
    summary: string;
    scores: ParsedDecisionScores;
    hasParsingIssue: boolean;
    technicalDetails: string | null;
};

const SCORE_BLOCK_RE = /\bScore\s*=/i;

/** Extraire un sous-score x/10 (casse / accents tolérés). `label` = motif déjà groupé si alternance. */
function matchScore10(raw: string, label: string): number | undefined {
    const re = new RegExp(
        `(?:${label})\\s*[:=]?\\s*\\(?\\s*([\\d]+(?:[.,]\\d+)?)\\s*(?:/\\s*10)?`,
        "i",
    );
    const m = raw.match(re);
    if (!m?.[1]) return undefined;
    const n = Number(String(m[1]).replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
}

function matchPercent(raw: string, label: string): number | undefined {
    const re = new RegExp(
        `(?:${label})\\s*[:=]?\\s*\\(?\\s*([\\d]+(?:[.,]\\d+)?)\\s*%?`,
        "i",
    );
    const m = raw.match(re);
    if (!m?.[1]) return undefined;
    const n = Number(String(m[1]).replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
}

const EN_TECH_PATTERNS: RegExp[] = [
    /The resource you are requesting could not be found/i,
    /Service unavailable/i,
    /try again later/i,
    /node settings/i,
    /could not be found/i,
    /Internal Server Error/i,
    /Bad Gateway/i,
    /Gateway Timeout/i,
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
];

const SYNTHESIS_UNAVAILABLE_RE = /synth[eè]se\s+ia\s+indisponible/i;

const AI_UNAVAILABLE_BADGE = "Synthèse IA indisponible — score déterministe utilisé";

function looksMostlyEnglish(text: string): boolean {
    const t = text.trim();
    if (!t) return false;
    const letters = t.replace(/[^a-zA-ZÀ-ÿ]/g, "");
    if (letters.length < 8) return false;
    const asciiLetters = (t.match(/[a-zA-Z]/g) ?? []).length;
    return asciiLetters / Math.max(1, letters.length) > 0.75 && EN_TECH_PATTERNS.some((p) => p.test(t));
}

function isTechNoise(segment: string): boolean {
    const s = segment.trim();
    if (!s) return false;
    if (EN_TECH_PATTERNS.some((p) => p.test(s))) return true;
    return looksMostlyEnglish(s);
}

/**
 * Extrait les détails techniques EN (parenthèses / tirets) et nettoie le texte.
 */
function stripTechnicalNoise(text: string): { cleaned: string; technicalDetails: string | null } {
    const collected: string[] = [];
    let cleaned = text;

    // Segments entre parenthèses majoritairement EN (souvent collés à « Synthèse IA indisponible »)
    cleaned = cleaned.replace(/\(([^)]{8,})\)/g, (full, inner: string) => {
        if (isTechNoise(inner) || (SYNTHESIS_UNAVAILABLE_RE.test(text) && looksMostlyEnglish(inner))) {
            collected.push(inner.trim());
            return "";
        }
        return full;
    });

    // Après tiret / em-dash : bruit EN
    cleaned = cleaned.replace(/\s*[-–—]\s*((?:The |Service |Please |Error |HTTP |Unable |Failed |Node )[^.!\n]{8,})/gi, (_, seg: string) => {
        if (isTechNoise(seg)) {
            collected.push(seg.trim());
            return "";
        }
        return ` — ${seg}`;
    });

    // Phrases EN isolées encore présentes
    for (const pat of EN_TECH_PATTERNS) {
        cleaned = cleaned.replace(pat, (m) => {
            collected.push(m.trim());
            return "";
        });
    }

    cleaned = cleaned.replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();

    // Remplacer le libellé brut « Synthèse IA indisponible » par le badge FR si bruit détecté
    if (collected.length > 0 && SYNTHESIS_UNAVAILABLE_RE.test(cleaned)) {
        cleaned = cleaned.replace(SYNTHESIS_UNAVAILABLE_RE, AI_UNAVAILABLE_BADGE);
    } else if (collected.length > 0 && !cleaned.trim()) {
        cleaned = AI_UNAVAILABLE_BADGE;
    }

    const technicalDetails = collected.length ? Array.from(new Set(collected)).join("\n") : null;
    return { cleaned, technicalDetails };
}

export function extractDecisionScores(raw: string): ParsedDecisionScores {
    const text = String(raw ?? "");
    const scores: ParsedDecisionScores = {};
    const skills = matchScore10(text, "Skills?");
    const capacity = matchScore10(text, "Capacity|Capacit[eé]");
    const budget = matchScore10(text, "Budget");
    const risk = matchScore10(text, "Risk|Risque");
    const fragility = matchScore10(text, "Fragilit[eé]");
    const dependence = matchPercent(text, "D[eé]pendance");

    if (skills != null) scores.skills = skills;
    if (capacity != null) scores.capacity = capacity;
    if (budget != null) scores.budget = budget;
    if (risk != null) scores.risk = risk;
    if (fragility != null) scores.fragility = fragility;
    if (dependence != null) scores.dependence = dependence;
    return scores;
}

/**
 * Parse un texte de synthèse / recommandation pour l'affichage timeline.
 *
 * @example
 * // Entrée :
 * // "Projet sous-staffé. Synthese IA indisponible (The resource you are requesting could not be found).
 * //  Score = 0.40×Skills(4.2/10) + 0.25×Capacity(5.0/10) + 0.15×Budget(7/10) + 0.20×Risk(3.5/10)"
 * // Sortie :
 * // { summary: "Projet sous-staffé. Synthèse IA indisponible — score déterministe utilisé",
 * //   scores: { skills: 4.2, capacity: 5, budget: 7, risk: 3.5 },
 * //   hasParsingIssue: true,
 * //   technicalDetails: "The resource you are requesting could not be found" }
 */
export function parseDecision(raw: string | null | undefined): ParsedDecision {
    const full = String(raw ?? "").trim();
    if (!full) {
        return { summary: "", scores: {}, hasParsingIssue: false, technicalDetails: null };
    }

    const scoreIdx = full.search(SCORE_BLOCK_RE);
    const beforeScore = scoreIdx >= 0 ? full.slice(0, scoreIdx).trim() : full;
    const scoreBlock = scoreIdx >= 0 ? full.slice(scoreIdx) : full;

    const scores = extractDecisionScores(scoreBlock.length > 20 ? scoreBlock : full);
    const { cleaned, technicalDetails } = stripTechnicalNoise(beforeScore || full);

    let summary = cleaned;
    // Retirer formules résiduelles du résumé
    summary = summary.replace(SCORE_BLOCK_RE, "").trim();
    summary = summary.replace(/\s{2,}/g, " ").trim();

    const hasParsingIssue = Boolean(technicalDetails) || SYNTHESIS_UNAVAILABLE_RE.test(beforeScore);

    // Si le résumé ne contient plus que le signal d'indispo (sans phrase métier), normaliser le badge.
    // Ne pas écraser un résumé FR utile déjà présent avant le signal.
    const withoutBadge = summary
        .replace(AI_UNAVAILABLE_BADGE, "")
        .replace(SYNTHESIS_UNAVAILABLE_RE, "")
        .replace(/[.\-–—\s]+$/g, "")
        .trim();
    if (hasParsingIssue && !withoutBadge) {
        summary = AI_UNAVAILABLE_BADGE;
    }

    return {
        summary,
        scores,
        hasParsingIssue,
        technicalDetails,
    };
}

export const SCORE_WEIGHTS = {
    skills: 0.4,
    capacity: 0.25,
    budget: 0.15,
    risk: 0.2,
} as const;

export { AI_UNAVAILABLE_BADGE };
