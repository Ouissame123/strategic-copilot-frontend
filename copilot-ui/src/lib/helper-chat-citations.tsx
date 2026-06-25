import { useMemo } from "react";
import { useNavigate } from "react-router";
import { HELPER_CHAT_UUID_RE } from "@/lib/helper-conversation-id";
import { managerProjectMissionControlPath } from "@/utils/workspace-routes";

const CITATION_MARKER_RE =
    /\[(talent|alert|decision|project):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/gi;

const PAREN_UUID_RE = /\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/gi;

type ReplyToken =
    | { kind: "text"; text: string }
    | { kind: "citation"; type: string; id: string; label: string };

export function buildValidatedCitationIndex(citations: string[] | undefined): Map<string, { type: string; id: string }> {
    const map = new Map<string, { type: string; id: string }>();
    for (const raw of citations ?? []) {
        const trimmed = String(raw ?? "").trim();
        const m = trimmed.match(/^(talent|alert|decision|project):([0-9a-f-]{36})$/i);
        if (m) map.set(m[2].toLowerCase(), { type: m[1].toLowerCase(), id: m[2] });
    }
    return map;
}

export function citationEntityPath(type: string, id: string): string | null {
    const t = type.toLowerCase();
    if (t === "talent" || t === "team_member" || t === "talent_match") {
        return `/workspace/manager/team/${encodeURIComponent(id)}`;
    }
    if (t === "alert" || t === "risk" || t === "risk_alert") {
        return `/workspace/manager/risks?alertId=${encodeURIComponent(id)}`;
    }
    if (t === "decision") {
        return `/workspace/manager/decision-log`;
    }
    if (t === "project") {
        return managerProjectMissionControlPath(id);
    }
    return null;
}

export function inferCitationTypeFromActionType(type: string): string | null {
    const t = type.toLowerCase();
    if (t.includes("talent") || t === "assign") return "talent";
    if (t.includes("project")) return "project";
    if (t.includes("decision")) return "decision";
    if (t.includes("alert") || t.includes("risk")) return "alert";
    return null;
}

function isCitationValidated(
    type: string,
    id: string,
    validated: Map<string, { type: string; id: string }>,
): boolean {
    const entry = validated.get(id.toLowerCase());
    return entry != null && entry.type === type.toLowerCase();
}

function tokenizeReplyWithCitations(content: string, validated: Map<string, { type: string; id: string }>): ReplyToken[] {
    if (!content || validated.size === 0) return [{ kind: "text", text: content }];

    type RawMatch = { start: number; end: number; token: ReplyToken };
    const matches: RawMatch[] = [];

    let m: RegExpExecArray | null;
    const markerRe = new RegExp(CITATION_MARKER_RE.source, CITATION_MARKER_RE.flags);
    while ((m = markerRe.exec(content)) !== null) {
        const type = m[1].toLowerCase();
        const id = m[2];
        if (!isCitationValidated(type, id, validated)) continue;
        matches.push({
            start: m.index,
            end: m.index + m[0].length,
            token: { kind: "citation", type, id, label: m[0] },
        });
    }

    const parenRe = new RegExp(PAREN_UUID_RE.source, PAREN_UUID_RE.flags);
    while ((m = parenRe.exec(content)) !== null) {
        const id = m[1];
        const entry = validated.get(id.toLowerCase());
        if (!entry) continue;
        matches.push({
            start: m.index,
            end: m.index + m[0].length,
            token: { kind: "citation", type: entry.type, id: entry.id, label: m[0] },
        });
    }

    matches.sort((a, b) => a.start - b.start);
    const filtered: RawMatch[] = [];
    let lastEnd = 0;
    for (const match of matches) {
        if (match.start >= lastEnd) {
            filtered.push(match);
            lastEnd = match.end;
        }
    }

    if (filtered.length === 0) return [{ kind: "text", text: content }];

    const tokens: ReplyToken[] = [];
    let cursor = 0;
    for (const match of filtered) {
        if (match.start > cursor) tokens.push({ kind: "text", text: content.slice(cursor, match.start) });
        tokens.push(match.token);
        cursor = match.end;
    }
    if (cursor < content.length) tokens.push({ kind: "text", text: content.slice(cursor) });
    return tokens;
}

export function resolveSuggestedActionPath(type: string, targetId: string): string | null {
    if (!HELPER_CHAT_UUID_RE.test(targetId)) return null;
    return (
        citationEntityPath(type, targetId) ??
        (() => {
            const inferred = inferCitationTypeFromActionType(type);
            return inferred ? citationEntityPath(inferred, targetId) : null;
        })()
    );
}

type HelperChatReplyContentProps = {
    content: string;
    citations?: string[];
    className?: string;
};

export function HelperChatReplyContent({ content, citations, className }: HelperChatReplyContentProps) {
    const navigate = useNavigate();
    const validated = useMemo(() => buildValidatedCitationIndex(citations), [citations]);
    const tokens = useMemo(() => tokenizeReplyWithCitations(content, validated), [content, validated]);

    const hasLinks = tokens.some((t) => t.kind === "citation");
    if (!hasLinks) {
        return <p className={className}>{content}</p>;
    }

    return (
        <p className={className}>
            {tokens.map((token, i) => {
                if (token.kind === "text") return <span key={i}>{token.text}</span>;
                const href = citationEntityPath(token.type, token.id);
                if (!href) return <span key={i}>{token.label}</span>;
                return (
                    <button
                        key={i}
                        type="button"
                        onClick={() => navigate(href)}
                        className="font-medium text-violet-700 underline decoration-violet-300 underline-offset-2 hover:text-violet-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:text-violet-300 dark:decoration-violet-600 dark:hover:text-violet-100"
                    >
                        {token.label}
                    </button>
                );
            })}
        </p>
    );
}
