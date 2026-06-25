import { Clock, FolderKanban, User } from "lucide-react";
import { useNavigate } from "react-router";
import { RootCauseHint, type AlertRootCauseTargetTab } from "@/components/risks/root-cause-hint";
import type { NotificationItem } from "@/types/api.types";
import { managerProjectMissionControlPath } from "@/utils/workspace-routes";
import { cx } from "@/utils/cx";
import { SeverityBadge } from "./SeverityBadge";
import {
    alertDisplayMessage,
    alertDisplayTitle,
    alertShowsReopen,
    alertShowsResolveIgnore,
    formatDetectedLabel,
    inferTalentName,
    normalizeAlertSeverity,
    severityBorderClass,
} from "./notification-alert-utils";

type AlertCardProps = {
    alert: NotificationItem;
    sevLabel: (s: string) => string;
    fallbackTitle: string;
    t: (key: string, opts?: Record<string, string | number>) => string;
    onOpen: () => void;
    onResolve?: () => void;
    onIgnore?: () => void;
    onReopen?: () => void;
    onOpenTalent?: () => void;
    onOpenProject?: () => void;
    acting?: boolean;
    canPatch: boolean;
    labels: {
        resolve: string;
        ignore: string;
        reopen: string;
        viewTalent: string;
        viewProject: string;
    };
};

export function AlertCard({
    alert,
    sevLabel,
    fallbackTitle,
    t,
    onOpen,
    onResolve,
    onIgnore,
    onReopen,
    onOpenTalent,
    onOpenProject,
    acting,
    canPatch,
    labels,
}: AlertCardProps) {
    const navigate = useNavigate();
    const severity = normalizeAlertSeverity(alert.severity);
    const projectId = alert.project_id?.trim() || null;

    const navigateToTab = (tab: AlertRootCauseTargetTab) => {
        if (!projectId) return;
        navigate(managerProjectMissionControlPath(projectId, tab));
    };
    const talentName = inferTalentName(alert);
    const projectName = alert.project_name?.trim() || null;
    const title = alertDisplayTitle(alert, fallbackTitle);
    const message = alertDisplayMessage(alert);
    const showResolveIgnore = alertShowsResolveIgnore(alert);
    const showReopen = alertShowsReopen(alert);

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen();
                }
            }}
            className={cx(
                "w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-900",
                severityBorderClass(severity),
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={alert.severity} label={sevLabel(alert.severity)} />
                        {projectName ? (
                            <span className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{projectName}</span>
                        ) : null}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{message}</p>
                </div>
            </div>

            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                {talentName ? (
                    <li className="inline-flex items-center gap-1">
                        <User className="size-3.5 shrink-0" aria-hidden />
                        {talentName}
                    </li>
                ) : null}
                {projectName ? (
                    <li className="inline-flex items-center gap-1">
                        <FolderKanban className="size-3.5 shrink-0" aria-hidden />
                        {projectName}
                    </li>
                ) : null}
                <li className="inline-flex items-center gap-1">
                    <Clock className="size-3.5 shrink-0" aria-hidden />
                    {formatDetectedLabel(alert, t)}
                </li>
            </ul>

            <div onClick={(e) => e.stopPropagation()}>
                <RootCauseHint riskType={alert.risk_type} onNavigateTab={projectId ? navigateToTab : undefined} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                {onOpenTalent ? (
                    <button
                        type="button"
                        onClick={onOpenTalent}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        {labels.viewTalent}
                    </button>
                ) : null}
                {onOpenProject ? (
                    <button
                        type="button"
                        onClick={onOpenProject}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        {labels.viewProject}
                    </button>
                ) : null}
                {showResolveIgnore && onResolve ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onResolve();
                        }}
                        disabled={!canPatch || acting}
                        title={!canPatch ? "Identifiant risk_alert introuvable" : undefined}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-violet-500 dark:hover:bg-violet-600"
                    >
                        {labels.resolve}
                    </button>
                ) : null}
                {showResolveIgnore && onIgnore ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onIgnore();
                        }}
                        disabled={!canPatch || acting}
                        title={!canPatch ? "Identifiant risk_alert introuvable" : undefined}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        {labels.ignore}
                    </button>
                ) : null}
                {showReopen && onReopen ? (
                    <button
                        type="button"
                        onClick={onReopen}
                        disabled={!canPatch || acting}
                        className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/60"
                    >
                        {labels.reopen}
                    </button>
                ) : null}
            </div>
        </article>
    );
}
