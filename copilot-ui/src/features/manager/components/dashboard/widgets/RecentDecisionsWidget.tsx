import type { RecentDecisionWidget } from "@/features/manager/types/dashboard";
import { decisionStyle, formatDisplayValue } from "@/features/manager/lib/dashboard-display";
import { formatRelativeShort } from "@/lib/format-relative-short";
import { cx } from "@/utils/cx";

export function RecentDecisionsWidget({ decisions }: { decisions: RecentDecisionWidget[] }) {
    const latest = decisions.slice(0, 5);

    return (
        <article className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Décisions récentes</h3>
            {latest.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune décision récente.</p>
            ) : (
                <div className="space-y-3">
                    {latest.map((item) => {
                        const decision = item.decision ?? "";
                        const style = decisionStyle(decision);
                        return (
                            <div key={item.id} className="flex flex-wrap items-start gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                {decision ? (
                                    <span
                                        className={cx(
                                            "shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold",
                                            style.bg,
                                            style.text,
                                            style.border,
                                        )}
                                    >
                                        {decision}
                                    </span>
                                ) : null}
                                <div className="min-w-0 flex-1">
                                    {item.project_name ? <p className="text-sm font-medium text-gray-900">{item.project_name}</p> : null}
                                    {item.reason ? <p className="mt-0.5 text-sm text-gray-600">{item.reason}</p> : null}
                                    <p className="mt-1 text-xs text-gray-400">
                                        Score {formatDisplayValue(item.score)} · Confiance {formatDisplayValue(item.confidence)}
                                        {item.created_at ? ` · ${formatRelativeShort(item.created_at)}` : ""}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </article>
    );
}
