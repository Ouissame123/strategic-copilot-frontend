import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { RecentDecisionWidget } from "@/features/manager/types/dashboard";
import {
    DASHBOARD_CARD_CLASS,
    decisionLabelFr,
    decisionStyle,
    formatDisplayValue,
    formatHelperQueueLabel,
    readRecordString,
    riskTypeLabel,
} from "@/features/manager/lib/dashboard-display";
import { formatRelativeShort } from "@/lib/format-relative-short";
import { SectionTitleWithCodename } from "./SectionTitleWithCodename";
import { cx } from "@/utils/cx";

function PanelHeader({
    title,
    codename,
    href,
    linkLabel,
}: {
    title: string;
    codename: string;
    href: string;
    linkLabel: string;
}) {
    return (
        <div className="mb-3 flex items-center justify-between gap-2">
            <SectionTitleWithCodename title={title} codename={codename} titleClassName="text-sm" />
            <Link to={href} className="shrink-0 text-xs font-medium text-brand-secondary hover:underline">
                {linkLabel}
            </Link>
        </div>
    );
}

export function DashboardTimeline({
    pendingRhActions,
    decisions,
}: {
    pendingRhActions: unknown[];
    decisions: RecentDecisionWidget[];
}) {
    const { t } = useTranslation("common");
    const latestValidations = pendingRhActions.slice(0, 4);
    const latestDecisions = decisions.slice(0, 5);

    return (
        <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <article className={cx(DASHBOARD_CARD_CLASS, "self-start")}>
                <PanelHeader
                    title={t("managerWorkspace.dashboard.validationsSectionTitle")}
                    codename="Helper"
                    href="/workspace/manager/validations"
                    linkLabel="File complète"
                />
                {latestValidations.length === 0 ? (
                    <p className="text-sm text-tertiary">Aucune validation en attente.</p>
                ) : (
                    <ul className="space-y-2">
                        {latestValidations.map((row, index) => {
                            const id = readRecordString(row, "id") ?? `rh-${index}`;
                            const label = formatHelperQueueLabel(
                                readRecordString(row, "message") ??
                                    readRecordString(row, "title") ??
                                    readRecordString(row, "type"),
                            );
                            const project = readRecordString(row, "project_name");
                            return (
                                <li key={id}>
                                    <Link
                                        to="/workspace/manager/validations"
                                        className="block rounded-lg border border-secondary px-3 py-1.5 transition hover:bg-secondary_subtle"
                                    >
                                        <p className="line-clamp-2 text-sm text-primary">{label}</p>
                                        {project ? <p className="mt-0.5 text-xs text-tertiary">{project}</p> : null}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </article>

            <article className={cx(DASHBOARD_CARD_CLASS, "self-start")}>
                <PanelHeader
                    title={t("managerWorkspace.dashboard.decisionsSectionTitle")}
                    codename="Orchestrator"
                    href="/workspace/manager/decision-log"
                    linkLabel="Journal"
                />
                {latestDecisions.length === 0 ? (
                    <p className="text-sm text-tertiary">Aucune décision récente.</p>
                ) : (
                    <ul className="space-y-2">
                        {latestDecisions.map((item) => {
                            const decision = item.decision ?? "";
                            const style = decisionStyle(decision);
                            const reason = item.reason ? riskTypeLabel(item.reason) : null;
                            return (
                                <li
                                    key={item.id}
                                    className="flex items-start gap-2 rounded-lg border border-secondary px-3 py-1.5"
                                >
                                    {decision ? (
                                        <span
                                            className={cx(
                                                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                                style.bg,
                                                style.text,
                                                style.border,
                                            )}
                                        >
                                            {decisionLabelFr(decision)}
                                        </span>
                                    ) : null}
                                    <div className="min-w-0 flex-1">
                                        {item.project_name ? (
                                            <p className="truncate text-sm font-medium text-primary">{item.project_name}</p>
                                        ) : null}
                                        {reason ? <p className="mt-0.5 text-xs text-tertiary">{reason}</p> : null}
                                        <p className="mt-1 text-[10px] text-quaternary">
                                            Score {formatDisplayValue(item.score)} · Conf. {formatDisplayValue(item.confidence)}
                                            {item.created_at ? ` · ${formatRelativeShort(item.created_at)}` : ""}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </article>
        </section>
    );
}
