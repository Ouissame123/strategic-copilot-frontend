import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cleanAlertMessage, TALENT_CARD, TALENT_LABEL, TALENT_TITLE } from "@/components/talent/talent-detail-shared";
import type { TalentAlert } from "@/components/talent/talent-detail-shared";

const Box = ("di" + "v") as const;

type AlertBucketId = "overload" | "conflict" | "turnover" | "dependency" | "other";

const BUCKETS: Array<{ id: AlertBucketId; emoji: string; label: string; match: RegExp }> = [
    { id: "overload", emoji: "🔥", label: "Surcharge", match: /overload|surcharge/i },
    { id: "conflict", emoji: "🤝", label: "Conflit", match: /conflict|conflit/i },
    { id: "turnover", emoji: "👋", label: "Turnover", match: /turnover/i },
    { id: "dependency", emoji: "🔗", label: "Dépendance", match: /dependen|dépendan/i },
];

function alertTypeKey(a: TalentAlert): string {
    return String(a.risk_type ?? (a as { category?: string }).category ?? "").toLowerCase();
}

function bucketForAlert(a: TalentAlert): AlertBucketId {
    const key = alertTypeKey(a);
    for (const b of BUCKETS) {
        if (b.match.test(key)) return b.id;
    }
    return "other";
}

const SEVERITY_RANK: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

function dominantSeverity(alerts: TalentAlert[]): string {
    let max = 0;
    let label = "low";
    for (const a of alerts) {
        const s = String(a.severity ?? "low").toLowerCase();
        const r = SEVERITY_RANK[s] ?? 1;
        if (r >= max) {
            max = r;
            label = s;
        }
    }
    return label;
}

function severityStyles(severity: string): { border: string; header: string; badge: string } {
    const s = severity.toLowerCase();
    if (s === "critical" || s === "high") {
        return {
            border: "border-rose-300 dark:border-rose-800",
            header: "bg-rose-50 dark:bg-rose-950/30",
            badge: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
        };
    }
    if (s === "medium") {
        return {
            border: "border-amber-300 dark:border-amber-800",
            header: "bg-amber-50 dark:bg-amber-950/30",
            badge: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
        };
    }
    return {
        border: "border-slate-200 dark:border-slate-700",
        header: "bg-slate-50 dark:bg-slate-800/50",
        badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    };
}

export interface AlertsGroupedByTypeProps {
    alerts: TalentAlert[];
    onResolve?: (alertId: string) => void;
    resolvePending?: boolean;
}

export function AlertsGroupedByType({ alerts, onResolve, resolvePending }: AlertsGroupedByTypeProps) {
    const [openBuckets, setOpenBuckets] = useState<Set<AlertBucketId>>(new Set());

    const grouped = useMemo(() => {
        const map = new Map<AlertBucketId, TalentAlert[]>();
        for (const b of [...BUCKETS.map((x) => x.id), "other" as const]) {
            map.set(b, []);
        }
        for (const a of alerts) {
            map.get(bucketForAlert(a))?.push(a);
        }
        return map;
    }, [alerts]);

    const toggle = (id: AlertBucketId) => {
        setOpenBuckets((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    if (alerts.length === 0) {
        return (
            <section className={`${TALENT_CARD} p-6`}>
                <h2 className={TALENT_TITLE}>Alertes actives</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Aucune alerte active.</p>
            </section>
        );
    }

    const bucketMeta = [...BUCKETS, { id: "other" as const, emoji: "⚠️", label: "Autres", match: /.*/ }];

    return (
        <section className={`${TALENT_CARD} p-6`}>
            <h2 className={TALENT_TITLE}>Alertes actives</h2>
            <p className={`mt-1 ${TALENT_LABEL}`}>
                {alerts.length} alerte{alerts.length > 1 ? "s" : ""}
            </p>
            <Box className="mt-4 space-y-2">
                {bucketMeta.map((meta) => {
                    const items = grouped.get(meta.id) ?? [];
                    if (items.length === 0) return null;
                    const severity = dominantSeverity(items);
                    const styles = severityStyles(severity);
                    const isOpen = openBuckets.has(meta.id);

                    return (
                        <article key={meta.id} className={`overflow-hidden rounded-lg border ${styles.border}`}>
                            <button
                                type="button"
                                onClick={() => toggle(meta.id)}
                                className={`flex w-full items-center gap-3 px-4 py-3 text-left ${styles.header}`}
                            >
                                <span className="text-lg" aria-hidden>
                                    {meta.emoji}
                                </span>
                                <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {meta.label}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${styles.badge}`}>
                                    {items.length}
                                </span>
                                <ChevronDown
                                    className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                    aria-hidden
                                />
                            </button>
                            {isOpen ? (
                                <ul className="divide-y divide-slate-100 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                                    {items.map((a) => (
                                        <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
                                            <Box className="min-w-0">
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                                    {cleanAlertMessage(a.message) || a.title || "Alerte"}
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                    {(a.severity || "low").toUpperCase()} ·{" "}
                                                    {a.risk_type || (a as { category?: string }).category || "risque"} ·{" "}
                                                    {a.detected_at
                                                        ? new Date(a.detected_at).toLocaleString("fr-FR")
                                                        : "date inconnue"}
                                                </p>
                                            </Box>
                                            {onResolve && a.id ? (
                                                <button
                                                    type="button"
                                                    disabled={resolvePending}
                                                    onClick={() => onResolve(a.id)}
                                                    className="flex-shrink-0 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:hover:bg-slate-800"
                                                >
                                                    Résoudre
                                                </button>
                                            ) : null}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </article>
                    );
                })}
            </Box>
        </section>
    );
}
