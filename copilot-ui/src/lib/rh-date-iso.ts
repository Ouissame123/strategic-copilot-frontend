/**
 * Dates RH — conversion vers ISO `YYYY-MM-DD` (backend n8n / Supabase).
 */

function buildIso(year: number, month: number, day: number): string | null {
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000 || year > 9999) return null;
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const check = new Date(`${iso}T12:00:00.000Z`);
    if (
        check.getUTCFullYear() !== year ||
        check.getUTCMonth() + 1 !== month ||
        check.getUTCDate() !== day
    ) {
        return null;
    }
    return iso;
}

/**
 * Accepte `YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MM-YYYY` et datetime ISO.
 */
export function parseFlexibleDateToIso(value?: string | null): string | null {
    const raw = value?.trim();
    if (!raw) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [y, m, d] = raw.split("-").map(Number);
        return buildIso(y, m, d);
    }

    const dmY = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(raw);
    if (dmY) {
        const day = Number(dmY[1]);
        const month = Number(dmY[2]);
        const year = Number(dmY[3]);
        return buildIso(year, month, day);
    }

    const t = new Date(raw);
    if (!Number.isNaN(t.getTime())) {
        return t.toISOString().slice(0, 10);
    }

    return null;
}

/** Valeur pour `<input type="date" />`. */
export function toDateInputValue(value?: string | null): string {
    return parseFlexibleDateToIso(value) ?? "";
}

export function parseSalaryToNumber(value?: string | number | null): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const raw = value != null ? String(value).trim() : "";
    if (!raw) return 0;
    const n = Number(raw.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}
