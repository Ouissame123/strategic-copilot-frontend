import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { RefreshCw01 } from "@untitledui/icons";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useValidations } from "@/hooks/useValidations";
import type { PendingValidation, ValidationCategory, ValidationType } from "@/services/validations.api";
import {
    RH_ALERT_ERROR,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
    WS_BTN_PRIMARY,
    WS_CARD,
    WS_INPUT,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

type CategoryFilter = "all" | ValidationCategory;
type TypeFilter = "all" | ValidationType;
type ViewMode = "cards" | "table";

function timeAgo(iso: string): string {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (m < 60) return `il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `il y a ${h}h`;
    return `il y a ${Math.floor(h / 24)}j`;
}

function validationDetailHref(item: PendingValidation): string {
    if (item.type === "rh_action") return "/workspace/manager/rh-requests";
    if (item.type === "arbitrage" && item.project_id) {
        return `/workspace/manager/projects?openProjectId=${encodeURIComponent(item.project_id)}`;
    }
    return "/workspace/manager/decision-log";
}

export default function ValidationsPage() {
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [viewMode, setViewMode] = useState<ViewMode>("cards");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const { data, isLoading, isFetching, refetch, error } = useValidations("mine");
    const items = data?.pending_validations ?? [];
    const summary = data?.summary;

    useCopilotPage("manager_validations", {
        scope: "mine",
        categoryFilter,
        typeFilter,
        viewMode,
    });

    const filtered = useMemo(() => {
        let list = items;
        if (categoryFilter !== "all") list = list.filter((i) => i.category === categoryFilter);
        if (typeFilter !== "all") list = list.filter((i) => i.type === typeFilter);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(
                (i) =>
                    i.project_name?.toLowerCase().includes(q) ||
                    i.why?.toLowerCase().includes(q) ||
                    i.subtype?.toLowerCase().includes(q) ||
                    i.talent_name?.toLowerCase().includes(q),
            );
        }
        return list;
    }, [items, categoryFilter, typeFilter, search]);

    return (
        <WorkspacePageShell role="manager" eyebrow="" title="" omitHeader>
            <div className="mx-auto max-w-7xl space-y-4">
                <header
                    className={cx(
                        WS_CARD,
                        "bg-gradient-to-br from-white to-slate-50 p-6 dark:from-slate-900 dark:to-slate-900/80",
                    )}
                >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className={cx("flex items-center gap-2 text-xs uppercase tracking-wider", RH_TEXT_MUTED)}>
                                <span>Manager</span>
                                <span>·</span>
                                <span className="rounded bg-violet-100 px-2 py-0.5 font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                                    Agent 6
                                </span>
                            </div>
                            <h1 className={cx("mt-1 text-2xl font-bold", RH_TEXT_PRIMARY)}>Validations Copilot</h1>
                            <p className={cx("mt-1 max-w-2xl text-sm", RH_TEXT_MUTED)}>
                                File priorisée selon les règles PDF : <strong>Conflits</strong> →{" "}
                                <strong>Justifications manquantes</strong> → <strong>File standard</strong>.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <ViewToggle mode={viewMode} onChange={setViewMode} />
                            <button
                                type="button"
                                onClick={() => void refetch()}
                                disabled={isFetching}
                                className={cx(
                                    "inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800",
                                )}
                            >
                                {isFetching ? (
                                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                                ) : (
                                    <RefreshCw01 className="size-3.5" aria-hidden />
                                )}
                                Rafraîchir
                            </button>
                        </div>
                    </div>
                </header>

                {error ? (
                    <div className={cx("rounded-xl p-3 text-sm", RH_ALERT_ERROR)}>
                        Erreur de chargement.{" "}
                        <button type="button" onClick={() => void refetch()} className="underline">
                            Réessayer
                        </button>
                    </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <CompactStat
                        label="Total"
                        value={summary?.total_pending ?? 0}
                        tone="blue"
                        active={categoryFilter === "all"}
                        onClick={() => setCategoryFilter("all")}
                    />
                    <CompactStat
                        label="Conflits"
                        value={summary?.conflict_count ?? 0}
                        tone="red"
                        active={categoryFilter === "conflict"}
                        onClick={() => setCategoryFilter("conflict")}
                    />
                    <CompactStat
                        label="Justif manquante"
                        value={summary?.missing_justification_count ?? 0}
                        tone="amber"
                        active={categoryFilter === "missing_justification"}
                        onClick={() => setCategoryFilter("missing_justification")}
                    />
                    <CompactStat
                        label="File standard"
                        value={summary?.standard_count ?? 0}
                        tone="slate"
                        active={categoryFilter === "standard"}
                        onClick={() => setCategoryFilter("standard")}
                    />
                </div>

                <div
                    className={cx(
                        WS_CARD,
                        "sticky top-0 z-10 flex flex-wrap items-center gap-2 bg-white/95 p-3 backdrop-blur dark:bg-slate-900/95",
                    )}
                >
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher projet, raison…"
                        className={cx("min-w-[200px] flex-1 px-3 py-1.5 text-sm", WS_INPUT)}
                    />
                    <div className="flex flex-wrap gap-1">
                        <TypePill label="Tous" active={typeFilter === "all"} onClick={() => setTypeFilter("all")} count={items.length} />
                        <TypePill
                            label="RH"
                            active={typeFilter === "rh_action"}
                            onClick={() => setTypeFilter("rh_action")}
                            count={summary?.by_type?.rh_action ?? 0}
                        />
                        <TypePill
                            label="Arbitrage"
                            active={typeFilter === "arbitrage"}
                            onClick={() => setTypeFilter("arbitrage")}
                            count={summary?.by_type?.arbitrage ?? 0}
                        />
                        <TypePill
                            label="Décisions"
                            active={typeFilter === "decision"}
                            onClick={() => setTypeFilter("decision")}
                            count={summary?.by_type?.decision ?? 0}
                        />
                    </div>
                    <span className={cx("ml-auto text-xs", RH_TEXT_MUTED)}>
                        {filtered.length} affichée(s) / {items.length}
                    </span>
                </div>

                {isLoading && !data ? (
                    <p className={cx("p-8 text-center text-sm", RH_TEXT_MUTED)}>Chargement…</p>
                ) : null}

                {!isLoading && filtered.length === 0 ? (
                    <div className={cx(WS_CARD, "p-12 text-center")}>
                        <p className={cx("text-sm font-medium", RH_TEXT_PRIMARY)}>Aucune validation en attente</p>
                        <p className={cx("mt-1 text-xs", RH_TEXT_MUTED)}>Tu es à jour.</p>
                    </div>
                ) : null}

                {viewMode === "cards" && filtered.length > 0 ? (
                    <div className="space-y-2">
                        {filtered.map((v) => (
                            <ValidationCardPro
                                key={v.id}
                                item={v}
                                expanded={expandedId === v.id}
                                onToggle={() => setExpandedId(expandedId === v.id ? null : v.id)}
                            />
                        ))}
                    </div>
                ) : null}

                {viewMode === "table" && filtered.length > 0 ? <ValidationTable items={filtered} /> : null}
            </div>
        </WorkspacePageShell>
    );
}

type CompactStatProps = {
    label: string;
    value: number;
    tone: "blue" | "red" | "amber" | "slate";
    active: boolean;
    onClick: () => void;
};

function CompactStat({ label, value, tone, active, onClick }: CompactStatProps) {
    const tones: Record<CompactStatProps["tone"], { text: string; bg: string }> = {
        blue: { text: "text-violet-700 dark:text-violet-300", bg: "bg-violet-50 dark:bg-violet-950/30" },
        red: { text: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-950/30" },
        amber: { text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950/30" },
        slate: { text: "text-slate-700 dark:text-slate-300", bg: "bg-slate-50 dark:bg-slate-800/50" },
    };
    const t = tones[tone];

    return (
        <button
            type="button"
            onClick={onClick}
            className={cx(
                WS_CARD,
                "p-3 text-left transition-all",
                active ? cx("ring-2 ring-violet-500/30", t.bg) : "hover:bg-slate-50 dark:hover:bg-slate-800/40",
            )}
        >
            <div className="flex items-center justify-between">
                <span className={cx("text-xs", RH_TEXT_MUTED)}>{label}</span>
                {active ? <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400">filtré</span> : null}
            </div>
            <div className={cx("mt-1 text-2xl font-bold tabular-nums", t.text)}>{value}</div>
        </button>
    );
}

type TypePillProps = {
    label: string;
    active: boolean;
    onClick: () => void;
    count: number;
};

function TypePill({ label, active, onClick, count }: TypePillProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cx(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                active
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
            )}
        >
            {label} <span className="opacity-70">{count}</span>
        </button>
    );
}

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
    return (
        <div className="flex rounded-md border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
            <button
                type="button"
                onClick={() => onChange("cards")}
                className={cx(
                    "rounded px-2 py-1 text-xs transition",
                    mode === "cards"
                        ? "bg-violet-600 text-white"
                        : cx(RH_TEXT_MUTED, "hover:bg-slate-100 dark:hover:bg-slate-800"),
                )}
            >
                Cartes
            </button>
            <button
                type="button"
                onClick={() => onChange("table")}
                className={cx(
                    "rounded px-2 py-1 text-xs transition",
                    mode === "table"
                        ? "bg-violet-600 text-white"
                        : cx(RH_TEXT_MUTED, "hover:bg-slate-100 dark:hover:bg-slate-800"),
                )}
            >
                Tableau
            </button>
        </div>
    );
}

type ValidationCardProProps = {
    item: PendingValidation;
    expanded: boolean;
    onToggle: () => void;
};

function ValidationCardPro({ item, expanded, onToggle }: ValidationCardProProps) {
    const catConfig: Record<
        ValidationCategory,
        { border: string; bg: string; badge: string; label: string }
    > = {
        conflict: {
            border: "border-l-rose-500",
            bg: "bg-rose-50/30 dark:bg-rose-950/20",
            badge: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
            label: "CONFLIT",
        },
        missing_justification: {
            border: "border-l-amber-500",
            bg: "bg-amber-50/30 dark:bg-amber-950/20",
            badge: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
            label: "JUSTIF MANQUANTE",
        },
        standard: {
            border: "border-l-slate-300 dark:border-l-slate-600",
            bg: "bg-white dark:bg-slate-900",
            badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
            label: "STANDARD",
        },
    };
    const cfg = catConfig[item.category];
    const detailHref = validationDetailHref(item);
    const hasPayload = item.payload && Object.keys(item.payload).length > 0;

    return (
        <div
            className={cx(
                "group overflow-hidden rounded-xl border-2 border-l-4 transition-all hover:shadow-sm",
                cfg.border,
                cfg.bg,
                "border-slate-200 dark:border-slate-700",
            )}
        >
            <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3 p-3">
                <div className="flex w-12 shrink-0 flex-col items-center justify-center">
                    <div className={cx("text-xl font-bold", RH_TEXT_MUTED)}>#{item.suggested_order}</div>
                    <div className="text-[9px] uppercase tracking-wide text-slate-400">priorité</div>
                    <div
                        className={cx(
                            "mt-1 rounded px-1.5 py-0.5 text-[10px] font-bold",
                            item.priority_score >= 90
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200"
                                : item.priority_score >= 70
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                        )}
                    >
                        {item.priority_score}
                    </div>
                </div>

                <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span className={cx("rounded px-1.5 py-0.5 text-[10px] font-semibold", cfg.badge)}>{cfg.label}</span>
                        <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium dark:border-slate-700 dark:bg-slate-800">
                            {item.type_label}
                        </span>
                        {item.subtype ? <span className={cx("text-[10px]", RH_TEXT_MUTED)}>· {item.subtype}</span> : null}
                        {item.blocking ? (
                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-200">
                                BLOQUANT
                            </span>
                        ) : null}
                    </div>

                    <div className="text-sm">
                        <strong>{item.project_name || <em className={RH_TEXT_MUTED}>Sans projet</em>}</strong>
                        {item.talent_name ? <span className={RH_TEXT_MUTED}> · {item.talent_name}</span> : null}
                    </div>

                    <p className={cx("mt-1 line-clamp-2 text-sm", RH_TEXT_PRIMARY)}>{item.why}</p>

                    <div className={cx("mt-1.5 flex flex-wrap items-center gap-2 text-[11px]", RH_TEXT_MUTED)}>
                        {item.due_date ? (
                            <span>Échéance {new Date(item.due_date).toLocaleDateString("fr-FR")}</span>
                        ) : null}
                        <span>· {timeAgo(item.created_at)}</span>
                    </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Link
                        to={detailHref}
                        className={cx("whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium text-white", WS_BTN_PRIMARY)}
                    >
                        → Traiter
                    </Link>
                    <button type="button" onClick={onToggle} className={cx("text-[11px] hover:text-slate-900 dark:hover:text-slate-100", RH_TEXT_MUTED)}>
                        {expanded ? "▲ Réduire" : "▼ Détails"}
                    </button>
                </div>
            </div>

            {expanded && hasPayload ? (
                <div className="border-t border-slate-200 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/80">
                    <div className="mb-1 flex items-center justify-between">
                        <span className={cx("text-[10px] uppercase tracking-wide", RH_TEXT_MUTED)}>Payload</span>
                        <button
                            type="button"
                            onClick={() => void navigator.clipboard.writeText(JSON.stringify(item.payload, null, 2))}
                            className="text-[10px] text-violet-600 hover:underline dark:text-violet-400"
                        >
                            Copier
                        </button>
                    </div>
                    <pre className="max-h-48 overflow-x-auto rounded border border-slate-200 bg-slate-50 p-2 font-mono text-[11px] leading-relaxed dark:border-slate-700 dark:bg-slate-800">
                        {JSON.stringify(item.payload, null, 2)}
                    </pre>
                </div>
            ) : null}
        </div>
    );
}

function ValidationTable({ items }: { items: PendingValidation[] }) {
    return (
        <div className={cx(WS_CARD, "overflow-hidden")}>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                        <tr>
                            {["#", "Catégorie", "Type", "Projet", "Raison", "Score", ""].map((h, i) => (
                                <th
                                    key={h || "action"}
                                    className={cx(
                                        "px-2 py-2 text-[11px] font-semibold uppercase",
                                        RH_TEXT_MUTED,
                                        i >= 5 ? "text-right" : "text-left",
                                    )}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((v) => (
                            <tr key={v.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
                                <td className={cx("px-2 py-2 font-bold", RH_TEXT_MUTED)}>#{v.suggested_order}</td>
                                <td className="px-2 py-2">
                                    <CategoryBadge category={v.category} />
                                </td>
                                <td className="px-2 py-2 text-xs">
                                    {v.type_label}
                                    {v.subtype ? <span className={RH_TEXT_MUTED}> · {v.subtype}</span> : null}
                                </td>
                                <td className="px-2 py-2 text-xs font-medium">{v.project_name || "—"}</td>
                                <td className={cx("max-w-xs truncate px-2 py-2 text-xs", RH_TEXT_MUTED)} title={v.why}>
                                    {v.why}
                                </td>
                                <td className="px-2 py-2 text-right">
                                    <PriorityScoreBadge score={v.priority_score} />
                                </td>
                                <td className="px-2 py-2 text-right">
                                    <Link to={validationDetailHref(v)} className="text-xs text-violet-600 hover:underline dark:text-violet-400">
                                        Traiter →
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function PriorityScoreBadge({ score }: { score: number }) {
    return (
        <span
            className={cx(
                "inline-block rounded px-1.5 py-0.5 text-[10px] font-bold",
                score >= 90
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200"
                    : score >= 70
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
            )}
        >
            {score}
        </span>
    );
}

function CategoryBadge({ category }: { category: ValidationCategory }) {
    const map: Record<ValidationCategory, { bg: string; text: string; label: string }> = {
        conflict: { bg: "bg-rose-100 dark:bg-rose-950/50", text: "text-rose-700 dark:text-rose-200", label: "Conflit" },
        missing_justification: {
            bg: "bg-amber-100 dark:bg-amber-950/50",
            text: "text-amber-700 dark:text-amber-200",
            label: "Justif",
        },
        standard: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300", label: "Std" },
    };
    const c = map[category];
    return <span className={cx("rounded px-1.5 py-0.5 text-[10px] font-semibold", c.bg, c.text)}>{c.label}</span>;
}
