import type { ReactNode } from "react";

const Box = ("di" + "v") as const;

type TalentProposal = Record<string, unknown>;

function talentName(item: TalentProposal, index: number): string {
    return String(item.talent_name ?? item.name ?? item.full_name ?? `Talent ${index + 1}`).trim();
}

function pct(value: unknown): string {
    if (value == null || value === "") return "—";
    const n = Number(value);
    return Number.isFinite(n) ? String(n) : String(value);
}

function parseMessageJson(text: string): { prefix: string; parsed: unknown } | null {
    const trimmed = text.trim();

    const suffixMatch = trimmed.match(/^(.*?):\s*(\[[\s\S]*\]|\{[\s\S]*\})\s*$/s);
    if (suffixMatch) {
        try {
            return { prefix: suffixMatch[1].trim(), parsed: JSON.parse(suffixMatch[2]) };
        } catch {
            /* essai suivant */
        }
    }

    const arrayStart = trimmed.indexOf("[");
    if (arrayStart >= 0) {
        const jsonText = trimmed.slice(arrayStart);
        try {
            const parsed = JSON.parse(jsonText);
            const prefix = trimmed
                .slice(0, arrayStart)
                .replace(/[:\s]+$/u, "")
                .trim();
            return { prefix, parsed };
        } catch {
            /* essai suivant */
        }
    }

    if (trimmed.startsWith("{")) {
        try {
            return { prefix: "", parsed: JSON.parse(trimmed) };
        } catch {
            return null;
        }
    }

    return null;
}

function TalentProposalCard({ item, index }: { item: TalentProposal; index: number }) {
    return (
        <Box className="rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="font-semibold text-slate-900 dark:text-slate-100">{talentName(item, index)}</p>
            <Box className="mt-1 grid grid-cols-1 gap-1 text-xs text-slate-600 dark:text-slate-400 sm:grid-cols-2 sm:gap-2">
                <span>Charge actuelle : {pct(item.current_load_pct)}%</span>
                <span>Compétences : {pct(item.matching_skills_count)}</span>
                <span className="sm:col-span-2">Allocation proposée : {pct(item.proposed_allocation_pct)}%</span>
            </Box>
        </Box>
    );
}

function formatObjectReadable(obj: Record<string, unknown>, depth = 0): ReactNode {
    if (depth > 2) return null;
    const entries = Object.entries(obj).filter(([, v]) => v != null && v !== "");
    if (!entries.length) return <span className="text-slate-500">—</span>;

    return (
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-300">
            {entries.map(([key, value]) => (
                <li key={key} className="break-words">
                    <span className="font-medium">{key.replace(/_/g, " ")} : </span>
                    {typeof value === "object" && value !== null && !Array.isArray(value)
                        ? formatObjectReadable(value as Record<string, unknown>, depth + 1)
                        : String(value)}
                </li>
            ))}
        </ul>
    );
}

function formatTalentArray(prefix: string, parsed: TalentProposal[]): ReactNode {
    const heading = prefix
        ? `${prefix} : ${parsed.length} talent${parsed.length > 1 ? "s" : ""}`
        : `${parsed.length} talent${parsed.length > 1 ? "s" : ""} proposé${parsed.length > 1 ? "s" : ""}`;

    return (
        <Box className="space-y-3">
            <p className="font-medium text-slate-900 dark:text-slate-100">{heading}</p>
            <Box className="space-y-2">
                {parsed.map((item, index) => (
                    <TalentProposalCard key={String(item.talent_id ?? index)} item={item} index={index} />
                ))}
            </Box>
        </Box>
    );
}

/** Affiche le message RH sans JSON brut (réaffectations, listes de talents, etc.). */
export function formatRhRequestMessage(message?: string | null): ReactNode {
    if (!message) return <span className="text-slate-500">Aucun message.</span>;

    const text = String(message).trim();
    if (!text) return <span className="text-slate-500">Aucun message.</span>;

    const embedded = parseMessageJson(text);
    if (embedded) {
        const { prefix, parsed } = embedded;

        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object" && parsed[0] !== null) {
            return formatTalentArray(prefix, parsed as TalentProposal[]);
        }

        if (Array.isArray(parsed) && parsed.length === 0) {
            return (
                <span className="text-slate-700 dark:text-slate-300">
                    {prefix ? `${prefix} : aucun élément` : "Aucun élément"}
                </span>
            );
        }

        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return (
                <Box className="space-y-2">
                    {prefix ? <p className="font-medium text-slate-900 dark:text-slate-100">{prefix}</p> : null}
                    {formatObjectReadable(parsed as Record<string, unknown>)}
                </Box>
            );
        }
    }

    return <span className="break-words whitespace-normal text-slate-700 dark:text-slate-300">{text}</span>;
}
