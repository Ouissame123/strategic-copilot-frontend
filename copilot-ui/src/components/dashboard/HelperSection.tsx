import { useMemo } from "react";
import { Link } from "react-router";
import { CheckCircle, ChevronRight } from "@untitledui/icons";

export type HelperListItem = {
    id: string;
    title?: string;
    summary?: string;
    message?: string;
    type?: string;
    priority?: string;
    bucket?: string;
    conflict_reason?: string;
    missing_reason?: string;
    project_name?: string;
    age_days?: number;
    sla_overdue?: boolean;
};

export type HelperStats = {
    total_pending?: number;
    conflicts_count?: number;
    missing_count?: number;
    standard_count?: number;
    sla_overdue_count?: number;
    urgent_count?: number;
    avg_age_days?: number;
};

export type HelperData = {
    stats?: HelperStats;
    kpis?: Record<string, unknown>;
    conflicts?: unknown[];
    missing_justif?: unknown[];
    standard_queue?: unknown[];
    incomplete?: unknown[];
    standard?: unknown[];
    missing_justification?: unknown[];
    priority_order?: string[];
};

const DEFAULT_VIEW_ALL_HREF = "/workspace/manager/hr-requests";
const VISIBLE_LIMIT = 5;

function readItemId(raw: unknown): string | null {
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    const id = String(o.id ?? o.action_id ?? o.request_id ?? "").trim();
    return id || null;
}

function readNum(v: unknown): number | undefined {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
    }
    return undefined;
}

function readStr(v: unknown): string | undefined {
    if (typeof v === "string") {
        const s = v.trim();
        return s || undefined;
    }
    return undefined;
}

function readSlaOverdue(o: Record<string, unknown>): boolean {
    if (o.sla_overdue === true || o.is_sla_overdue === true || o.sla_breached === true) return true;
    const st = readStr(o.sla_status)?.toLowerCase();
    if (st === "overdue" || st === "breached") return true;
    return false;
}

function normalizeList(raw: unknown): HelperListItem[] {
    if (!Array.isArray(raw)) return [];
    const out: HelperListItem[] = [];
    for (const row of raw) {
        if (!row || typeof row !== "object") continue;
        const o = row as Record<string, unknown>;
        const id = readItemId(o);
        if (!id) continue;
        const title = readStr(o.title) || readStr(o.subject) || readStr(o.type) || undefined;
        const message = readStr(o.message);
        const summary = readStr(o.summary);
        const type = readStr(o.type);
        const priority = readStr(o.priority)?.toLowerCase();
        const bucket = readStr(o.bucket);
        const conflict_reason = readStr(o.conflict_reason);
        const missing_reason = readStr(o.missing_reason);
        const project_name = readStr(o.project_name);
        const age_days = readNum(o.age_days);
        const sla_overdue = readSlaOverdue(o);
        out.push({
            id,
            title,
            summary,
            message,
            type,
            priority,
            bucket,
            conflict_reason,
            missing_reason,
            project_name,
            age_days,
            sla_overdue,
        });
    }
    return out;
}

function readStatNum(stats: HelperStats | Record<string, unknown> | null | undefined, key: string): number {
    if (!stats || typeof stats !== "object") return 0;
    const v = (stats as Record<string, unknown>)[key];
    return readNum(v) ?? 0;
}

function itemLabel(item: HelperListItem): string {
    return (
        item.title ||
        item.summary ||
        item.message ||
        item.type ||
        (item.id.length > 12 ? `${item.id.slice(0, 8)}…` : item.id)
    );
}

function formatTypeLabel(type: string | undefined): string | undefined {
    if (!type) return undefined;
    return type.replace(/_/g, " ");
}

function formatAgeLine(ageDays: number | undefined): string | null {
    if (ageDays == null || !Number.isFinite(ageDays)) return null;
    if (ageDays < 1) {
        const h = Math.round(ageDays * 24);
        return `${Math.max(1, h)}h`;
    }
    const rounded = Math.round(ageDays * 10) / 10;
    const s = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/\.0$/, "");
    return `${s}j`;
}

function priorityTier(item: HelperListItem): number {
    const b = (item.bucket ?? "").toLowerCase();
    if (b === "conflict") return 0;
    if (b === "missing_justification" || b === "missing_justif") return 1;
    if (item.priority === "urgent") return 2;
    if (item.sla_overdue) return 3;
    return 4;
}

function mergeQueues(conflicts: HelperListItem[], missing: HelperListItem[], standard: HelperListItem[]): HelperListItem[] {
    const seen = new Set<string>();
    const out: HelperListItem[] = [];
    for (const list of [conflicts, missing, standard]) {
        for (const item of list) {
            if (seen.has(item.id)) continue;
            seen.add(item.id);
            out.push(item);
        }
    }
    return out;
}

function sortPending(a: HelperListItem, b: HelperListItem): number {
    const ta = priorityTier(a);
    const tb = priorityTier(b);
    if (ta !== tb) return ta - tb;
    const ageA = a.age_days ?? 0;
    const ageB = b.age_days ?? 0;
    return ageB - ageA;
}

function metaSubtitle(item: HelperListItem): string {
    const parts: string[] = [];
    const ty = formatTypeLabel(item.type);
    if (ty) parts.push(ty);
    if (item.project_name) parts.push(item.project_name);
    const age = formatAgeLine(item.age_days);
    if (age) parts.push(`il y a ${age}`);
    return parts.join(" · ");
}

function priorityDotClass(item: HelperListItem): string {
    const t = priorityTier(item);
    if (t === 0) return "bg-rose-500";
    if (t === 1) return "bg-amber-500";
    if (t === 2) return "bg-orange-500";
    if (t === 3) return "bg-violet-500";
    return "bg-slate-300 dark:bg-slate-600";
}

function PriorityBadge({ item }: { item: HelperListItem }) {
    if (item.priority === "urgent") {
        return (
            <span className="inline-flex shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1 ring-rose-200/80 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-800/50">
                Urgent
            </span>
        );
    }
    if (item.priority && item.priority !== "normal") {
        return (
            <span className="inline-flex shrink-0 rounded border border-secondary/70 bg-secondary_subtle/30 px-1 py-0.5 text-[9px] font-medium uppercase text-tertiary">
                {item.priority}
            </span>
        );
    }
    return null;
}

function SlaBadge() {
    return (
        <span
            title="SLA dépassé"
            className="inline-flex shrink-0 rounded border border-amber-200/70 bg-amber-50/90 px-1 py-0.5 text-[9px] font-semibold text-amber-900/90 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200/90"
        >
            SLA
        </span>
    );
}

export type HelperSectionProps = {
    data: HelperData | null;
    loading: boolean;
    onItemClick: (item: HelperListItem) => void;
    onResolve: (item: HelperListItem) => void | Promise<void>;
    /** Cible du bouton « Voir tout » / « Voir les X autres » (défaut : demandes RH manager). */
    viewAllHref?: string;
};

export function HelperSection({ data, loading, onResolve, onItemClick, viewAllHref }: HelperSectionProps) {
    const stats = data?.stats;
    const allHref = viewAllHref ?? DEFAULT_VIEW_ALL_HREF;

    const conflicts = useMemo(() => normalizeList(data?.conflicts), [data?.conflicts]);
    const missing = useMemo(
        () => normalizeList(data?.missing_justif ?? data?.missing_justification ?? data?.incomplete),
        [data?.missing_justif, data?.missing_justification, data?.incomplete],
    );
    const standard = useMemo(
        () => normalizeList(data?.standard_queue ?? data?.standard),
        [data?.standard_queue, data?.standard],
    );

    const merged = useMemo(() => mergeQueues(conflicts, missing, standard), [conflicts, missing, standard]);
    const sorted = useMemo(() => [...merged].sort(sortPending), [merged]);

    const pendingCount = readStatNum(stats, "total_pending") || merged.length;
    const validationWord = pendingCount === 1 ? "validation" : "validations";
    const topItems = sorted.slice(0, VISIBLE_LIMIT);
    const hiddenCount = Math.max(0, merged.length - VISIBLE_LIMIT);

    if (loading) {
        return (
            <section className="rounded-3xl border border-secondary/60 bg-primary p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.03] dark:border-secondary dark:shadow-none dark:ring-white/[0.04]">
                <div className="flex animate-pulse items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                        <div className="h-4 w-28 rounded bg-secondary_subtle" />
                        <div className="h-3 w-44 rounded bg-secondary_subtle/70" />
                    </div>
                    <div className="h-8 w-20 shrink-0 rounded-lg bg-secondary_subtle" />
                </div>
                <ul className="mt-3 divide-y divide-secondary/50 border-t border-secondary/50 pt-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <li key={`h-skel-${i}`} className="flex items-center gap-3 py-2.5">
                            <div className="size-2 shrink-0 rounded-full bg-secondary_subtle" />
                            <div className="min-w-0 flex-1 space-y-1.5">
                                <div className="h-3.5 w-48 max-w-[55%] rounded bg-secondary_subtle/80" />
                                <div className="h-3 w-56 max-w-[70%] rounded bg-secondary_subtle/50" />
                            </div>
                            <div className="h-7 w-16 shrink-0 rounded-md bg-secondary_subtle/60" />
                        </li>
                    ))}
                </ul>
            </section>
        );
    }

    return (
        <section className="rounded-3xl border border-secondary/60 bg-primary p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.03] dark:border-secondary dark:bg-primary dark:shadow-none dark:ring-white/[0.04]">
            <header className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold tracking-tight text-primary sm:text-base">Agent Helper</h2>
                    <p className="mt-0.5 text-xs text-secondary sm:text-[13px]">
                        {pendingCount} {validationWord} en attente
                    </p>
                </div>
                <Link
                    to={allHref}
                    className="shrink-0 rounded-lg border border-secondary/80 bg-primary px-2.5 py-1.5 text-xs font-semibold text-secondary shadow-sm transition hover:bg-secondary_subtle/50"
                >
                    Voir tout
                </Link>
            </header>

            {merged.length === 0 ? (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-emerald-200/60 bg-emerald-50/25 px-3 py-3 dark:border-emerald-900/35 dark:bg-emerald-950/20">
                    <CheckCircle className="size-8 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    <p className="text-sm font-semibold text-primary">Tout est traité</p>
                </div>
            ) : (
                <>
                    <ul className="mt-3 divide-y divide-secondary/55 border-t border-secondary/50">
                        {topItems.map((item) => (
                            <li key={item.id} className="flex max-h-[4.5rem] min-h-[3.75rem] items-center gap-2 py-2 sm:gap-3 sm:py-2.5">
                                <span className={`mt-0.5 size-1.5 shrink-0 self-start rounded-full sm:mt-1 ${priorityDotClass(item)}`} aria-hidden />
                                <div className="min-w-0 flex-1 pr-1">
                                    <p className="line-clamp-1 text-sm font-medium leading-tight text-primary">{itemLabel(item)}</p>
                                    <p className="mt-0.5 line-clamp-1 text-[11px] leading-tight text-tertiary">{metaSubtitle(item)}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                                    {item.priority === "urgent" ? <PriorityBadge item={item} /> : null}
                                    {item.sla_overdue ? <SlaBadge /> : null}
                                    <button
                                        type="button"
                                        className="rounded-md bg-brand-solid px-2 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-brand-solid_hover"
                                        onClick={() => void onResolve(item)}
                                    >
                                        Résoudre
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex size-8 items-center justify-center rounded-md border border-secondary/80 text-secondary transition hover:bg-secondary_subtle/60"
                                        onClick={() => onItemClick(item)}
                                        aria-label="Voir détail"
                                    >
                                        <ChevronRight className="size-3.5" aria-hidden />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                    {hiddenCount > 0 ? (
                        <div className="mt-2 border-t border-secondary/40 pt-2 text-center">
                            <Link to={allHref} className="text-xs font-semibold text-brand-secondary hover:underline">
                                {hiddenCount === 1 ? "Voir l'autre" : `Voir les ${hiddenCount} autres`}
                            </Link>
                        </div>
                    ) : null}
                </>
            )}
        </section>
    );
}
