import { Link } from "react-router";
import { Clock, FolderKanban, User, X } from "lucide-react";
import type { NotificationItem } from "@/types/api.types";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { RH_PRIMARY_CTA_CLASSES } from "@/components/rh-requests/rh-requests-styles";
import { SeverityBadge } from "./SeverityBadge";
import {
    alertDisplayMessage,
    alertDisplayTitle,
    alertShowsReopen,
    alertShowsResolveIgnore,
    formatDetectedLabel,
    inferAlertKind,
    inferTalentName,
    readRiskAlertPatchId,
} from "./notification-alert-utils";

type AlertDetailsDrawerProps = {
    alert: NotificationItem | null;
    open: boolean;
    onClose: () => void;
    sevLabel: (s: string) => string;
    fallbackTitle: string;
    t: (key: string, opts?: Record<string, string | number>) => string;
    onResolve?: () => void;
    onIgnore?: () => void;
    onReopen?: () => void;
    isActing?: boolean;
    labels: {
        summary: string;
        project: string;
        talent: string;
        context: string;
        history: string;
        actions: string;
        resolve: string;
        ignore: string;
        reopen: string;
        openTalent: string;
        openProject: string;
        createRh: string;
        close: string;
    };
};

function QuickActions({ kind, projectId, talentId }: { kind: ReturnType<typeof inferAlertKind>; projectId?: string; talentId?: string }) {
    const rhBase = "/workspace/manager/rh-requests";
    const items: { label: string; to: string }[] = [];

    switch (kind) {
        case "overload":
            items.push({ label: "Réallouer", to: `${rhBase}?intent=reallocation` });
            items.push({ label: "Créer demande RH", to: rhBase });
            break;
        case "contract":
            items.push({ label: "Renouveler contrat", to: talentId ? `/workspace/manager/team/${encodeURIComponent(talentId)}` : "/workspace/manager/team" });
            items.push({ label: "Lancer recrutement", to: `${rhBase}?intent=recruitment` });
            break;
        case "skill_gap":
            items.push({ label: "Formation", to: `${rhBase}?intent=training` });
            items.push({ label: "Recrutement", to: `${rhBase}?intent=recruitment` });
            break;
        case "dependency":
            items.push({ label: "Identifier backup", to: projectId ? `/workspace/manager/projects?project_id=${encodeURIComponent(projectId)}` : "/workspace/manager/projects" });
            items.push({ label: "Former remplaçant", to: `${rhBase}?intent=training` });
            break;
        default:
            items.push({ label: "Créer demande RH", to: rhBase });
            break;
    }

    return (
        <ul className="flex flex-wrap gap-2">
            {items.map((item) => (
                <li key={item.label}>
                    <Link
                        to={item.to}
                        className="inline-flex rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/60"
                    >
                        {item.label}
                    </Link>
                </li>
            ))}
        </ul>
    );
}

export function AlertDetailsDrawer({
    alert,
    open,
    onClose,
    sevLabel,
    fallbackTitle,
    t,
    onResolve,
    onIgnore,
    onReopen,
    isActing,
    labels,
}: AlertDetailsDrawerProps) {
    if (!open || !alert) return null;

    const patchId = readRiskAlertPatchId(alert);
    const canPatch = Boolean(patchId);
    const showResolveIgnore = alertShowsResolveIgnore(alert);
    const showReopen = alertShowsReopen(alert);
    const talentName = inferTalentName(alert);
    const projectId = String(alert.project_id ?? "").trim();
    const talentId = String(alert.talent_id ?? "").trim();
    const kind = inferAlertKind(alert.risk_type, alert.message);
    const title = alertDisplayTitle(alert, fallbackTitle);
    const message = alertDisplayMessage(alert);

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px]"
                aria-label={labels.close}
                onClick={onClose}
            />
            <aside
                className="fixed top-0 right-0 z-50 flex h-screen w-full max-w-[480px] flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                role="dialog"
                aria-modal="true"
            >
                <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                    <div className="min-w-0">
                        <SeverityBadge severity={alert.severity} label={sevLabel(alert.severity)} />
                        <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-50">{title}</h2>
                        {alert.risk_type ? (
                            <p className="mt-1 text-xs font-medium text-slate-500">{alert.risk_type}</p>
                        ) : null}
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={labels.close}>
                        <X className="size-5" />
                    </button>
                </header>

                <div className="flex-1 overflow-x-hidden overflow-y-auto px-5 py-4 space-y-5">
                    <section>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{labels.summary}</h3>
                        <p className="mt-2 break-words whitespace-normal text-sm text-slate-700 dark:text-slate-300">{message}</p>
                        {typeof alert.risk_score === "number" ? (
                            <p className="mt-2 text-xs text-slate-500">
                                Score risque : <strong className="text-slate-800 dark:text-slate-200">{alert.risk_score}</strong>/10
                            </p>
                        ) : null}
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                        <h3 className="text-xs font-semibold uppercase text-slate-500">{labels.project}</h3>
                        <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                            <FolderKanban className="size-4 shrink-0 text-slate-400" aria-hidden />
                            {alert.project_name?.trim() || "—"}
                        </p>
                        {projectId ? (
                            <Link
                                to={`/workspace/manager/projects?project_id=${encodeURIComponent(projectId)}`}
                                className="mt-2 inline-block text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400"
                            >
                                {labels.openProject}
                            </Link>
                        ) : null}
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                        <h3 className="text-xs font-semibold uppercase text-slate-500">{labels.talent}</h3>
                        <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                            <User className="size-4 shrink-0 text-slate-400" aria-hidden />
                            {talentName || "—"}
                        </p>
                        {talentId ? (
                            <Link
                                to={`/workspace/manager/team/${encodeURIComponent(talentId)}`}
                                className="mt-2 inline-block text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400"
                            >
                                {labels.openTalent}
                            </Link>
                        ) : null}
                    </section>

                    <section>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{labels.context}</h3>
                        <p className="mt-2 break-words whitespace-normal rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                            Statut : {alert.status || "—"}
                            {alert.risk_type ? ` · Type : ${alert.risk_type}` : ""}
                        </p>
                    </section>

                    <section>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{labels.history}</h3>
                        <p className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="size-3.5" aria-hidden />
                            {formatDetectedLabel(alert, t)}
                            {alert.created_at ? ` · ${new Date(alert.created_at).toLocaleString("fr-FR")}` : ""}
                        </p>
                    </section>

                    <section>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{labels.actions}</h3>
                        <div className="mt-3">
                            <QuickActions kind={kind} projectId={projectId || undefined} talentId={talentId || undefined} />
                        </div>
                    </section>
                </div>

                <footer className="flex flex-wrap gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
                    {showResolveIgnore && onResolve ? (
                        <button
                            type="button"
                            className={cx(RH_PRIMARY_CTA_CLASSES, "px-3 py-2 text-xs")}
                            disabled={!canPatch || isActing}
                            onClick={onResolve}
                        >
                            {labels.resolve}
                        </button>
                    ) : null}
                    {showResolveIgnore && onIgnore ? (
                        <Button type="button" color="secondary" size="sm" disabled={!canPatch || isActing} onClick={onIgnore}>
                            {labels.ignore}
                        </Button>
                    ) : null}
                    {showReopen && onReopen ? (
                        <button
                            type="button"
                            className={cx(RH_PRIMARY_CTA_CLASSES, "px-3 py-2 text-xs")}
                            disabled={!canPatch || isActing}
                            onClick={onReopen}
                        >
                            {labels.reopen}
                        </button>
                    ) : null}
                    {showResolveIgnore ? (
                        <Link
                            to="/workspace/manager/rh-requests"
                            className="inline-flex items-center rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200"
                        >
                            {labels.createRh}
                        </Link>
                    ) : null}
                    <Button type="button" color="secondary" size="sm" className="ml-auto" onClick={onClose}>
                        {labels.close}
                    </Button>
                </footer>
            </aside>
        </>
    );
}
