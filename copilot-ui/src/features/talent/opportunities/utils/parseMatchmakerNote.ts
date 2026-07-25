export type ParsedMatchmakerNote = {
    fit: number | null;
    dispo: number | null;
    overall: number | null;
    gaps: number | null;
    /** Texte qualitatif restant (ex. « profil à confirmer »), sans scores déjà affichés ailleurs. */
    qualitativeNote: string | null;
};

function parseNum(raw: string | undefined): number | null {
    if (raw == null || raw.trim() === "") return null;
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) ? n : null;
}

/**
 * Parse une note Matchmaker brute (sortie agent) pour en extraire fit / dispo / overall / gaps
 * et un éventuel commentaire qualitatif. Tolérant aux variantes de libellés / formats.
 *
 * Ex. « Rang 1: fit 8.77/10, dispo 0/10, overall 7.69/10, 0 gap(s). »
 * Ex. « Score global 7.7/10, profil à confirmer, disponibilité 50%. »
 */
export function parseMatchmakerNote(raw: string | null | undefined): ParsedMatchmakerNote {
    const empty: ParsedMatchmakerNote = {
        fit: null,
        dispo: null,
        overall: null,
        gaps: null,
        qualitativeNote: null,
    };
    if (raw == null) return empty;
    const text = raw.trim();
    if (!text) return empty;

    const fitMatch =
        text.match(/\bfit\b\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*\/\s*10/i) ??
        text.match(/compatib(?:ilité|ilite)?(?:\s+comp[ée]tences?)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*\/\s*10/i);

    const overallMatch =
        text.match(/\boverall\b\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*\/\s*10/i) ??
        text.match(/score\s*global\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*\/\s*10/i);

    const dispoMatch =
        text.match(/\bdispo\b\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*\/\s*10/i) ??
        text.match(/disponibilit[ée]\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:\/\s*10|%)?/i);

    const gapsMatch =
        text.match(/(\d+)\s*gap\s*\(?s?\)?/i) ??
        text.match(/(\d+)\s*[ée]cart\s*\(?s?\)?/i);

    let remainder = text;
    const stripPatterns: RegExp[] = [
        /rang\s*\d+\s*[:.]?\s*/gi,
        /\bfit\b\s*[:=]?\s*\d+(?:[.,]\d+)?\s*\/\s*10/gi,
        /compatib(?:ilité|ilite)?(?:\s+comp[ée]tences?)?\s*[:=]?\s*\d+(?:[.,]\d+)?\s*\/\s*10/gi,
        /\boverall\b\s*[:=]?\s*\d+(?:[.,]\d+)?\s*\/\s*10/gi,
        /score\s*global\s*[:=]?\s*\d+(?:[.,]\d+)?\s*\/\s*10/gi,
        /\bdispo\b\s*[:=]?\s*\d+(?:[.,]\d+)?\s*\/\s*10/gi,
        /disponibilit[ée]\s*[:=]?\s*\d+(?:[.,]\d+)?\s*(?:\/\s*10|%)?/gi,
        /\d+\s*gap\s*\(?s?\)?/gi,
        /\d+\s*[ée]cart\s*\(?s?\)?/gi,
        /\d+(?:[.,]\d+)?\s*\/\s*10/g,
    ];

    for (const pattern of stripPatterns) {
        remainder = remainder.replace(pattern, " ");
    }

    remainder = remainder
        .replace(/[,;|/·•]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/^[\s.:\-–—]+|[\s.:\-–—]+$/g, "")
        .trim();

    const qualitativeNote = remainder.length > 0 ? remainder : null;

    return {
        fit: parseNum(fitMatch?.[1]),
        dispo: parseNum(dispoMatch?.[1]),
        overall: parseNum(overallMatch?.[1]),
        gaps: parseNum(gapsMatch?.[1]),
        qualitativeNote,
    };
}
