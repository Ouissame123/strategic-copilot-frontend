import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, HelpCircle, Loader2 } from "lucide-react";
import type { ServiceHealth, ServiceStatus } from "./types";
import { cn, formatRelativeDate, STATUS_COLOR } from "./utils";

interface Props {
    services: ServiceHealth[];
    onRefresh?: () => void | Promise<void>;
    loading?: boolean;
    showHeader?: boolean;
    compact?: boolean;
}

const STATUS_ICON: Record<ServiceStatus, typeof CheckCircle2> = {
    ok: CheckCircle2,
    degraded: AlertTriangle,
    down: XCircle,
    unknown: HelpCircle,
};

const STATUS_LABEL: Record<ServiceStatus, string> = {
    ok: "Opérationnel",
    degraded: "Dégradé",
    down: "Indisponible",
    unknown: "Inconnu",
};

function ServiceRow({ svc, compact }: { svc: ServiceHealth; compact?: boolean }) {
    const Icon = STATUS_ICON[svc.status];
    const color = STATUS_COLOR[svc.status];

    return (
        <div
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50",
                compact ? "border-b border-slate-100 last:border-0" : "border border-slate-200 bg-white",
            )}
        >
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", color.bg)}>
                <Icon className={cn("h-4 w-4", color.text)} aria-hidden />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-900">{svc.label}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                        <span className={cn("inline-block h-1.5 w-1.5 rounded-full", color.dot)} />
                        <span className={cn("text-xs font-medium", color.text)}>{STATUS_LABEL[svc.status]}</span>
                    </div>
                </div>

                <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                    {svc.latencyMs != null ? (
                        <span className="tabular-nums">
                            {svc.latencyMs < 1000 ? `${svc.latencyMs} ms` : `${(svc.latencyMs / 1000).toFixed(2)} s`}
                        </span>
                    ) : null}
                    {svc.details ? <span className="truncate">{svc.details}</span> : null}
                    {svc.lastCheckAt ? (
                        <span className="ml-auto whitespace-nowrap" title={new Date(svc.lastCheckAt).toLocaleString("fr-FR")}>
                            {formatRelativeDate(svc.lastCheckAt)}
                        </span>
                    ) : null}
                </div>

                {svc.meta && Object.keys(svc.meta).length > 0 ? (
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                        {Object.entries(svc.meta).map(([k, v]) => (
                            <span key={k}>
                                <span className="text-slate-400">{k} : </span>
                                <span className="font-medium text-slate-700 tabular-nums">{v}</span>
                            </span>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export function SystemStatusPanel({
    services,
    onRefresh,
    loading = false,
    showHeader = true,
    compact = false,
}: Props) {
    const downCount = services.filter((s) => s.status === "down").length;
    const degradedCount = services.filter((s) => s.status === "degraded").length;

    let globalStatus: ServiceStatus = "ok";
    if (downCount > 0) globalStatus = "down";
    else if (degradedCount > 0) globalStatus = "degraded";
    else if (services.some((s) => s.status === "unknown")) globalStatus = "unknown";

    const globalColor = STATUS_COLOR[globalStatus];

    return (
        <section className={cn("overflow-hidden rounded-xl border border-slate-200 bg-white", compact ? "" : "shadow-sm")}>
            {showHeader ? (
                <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                        <span className={cn("inline-block h-2 w-2 animate-pulse rounded-full", globalColor.dot)} />
                        <h3 className="text-sm font-semibold text-slate-900">Statut système</h3>
                        <span className="text-xs text-slate-500">
                            {services.length} service{services.length > 1 ? "s" : ""}
                            {downCount > 0 ? (
                                <span className="ml-1 font-medium text-rose-600">
                                    · {downCount} indisponible{downCount > 1 ? "s" : ""}
                                </span>
                            ) : null}
                            {degradedCount > 0 ? (
                                <span className="ml-1 font-medium text-amber-600">
                                    · {degradedCount} dégradé{degradedCount > 1 ? "s" : ""}
                                </span>
                            ) : null}
                        </span>
                    </div>
                    {onRefresh ? (
                        <button
                            type="button"
                            onClick={() => void onRefresh()}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                            aria-label="Rafraîchir le statut"
                        >
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            <span>Rafraîchir</span>
                        </button>
                    ) : null}
                </header>
            ) : null}

            <div className={cn(compact ? "px-2 py-1" : "space-y-2 p-3")}>
                {services.length === 0 ? (
                    <p className="py-4 text-center text-sm italic text-slate-500">Aucun service configuré</p>
                ) : (
                    services.map((svc) => <ServiceRow key={svc.name} svc={svc} compact={compact} />)
                )}
            </div>
        </section>
    );
}
