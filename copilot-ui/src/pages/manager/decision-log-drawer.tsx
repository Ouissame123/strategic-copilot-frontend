import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { localeForDateFormatting } from "@/lib/ui-locale";
import { formatUserFacingExplanation, stripTechnicalScoringSegments } from "@/lib/business-explanation";
import type { CopilotDecision } from "@/services/decisions.api";
import { confidencePercent } from "@/utils/decisionLogHelpers";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";
import { cx } from "@/utils/cx";

const MANAGER_RH_REQUESTS_PATH = "/workspace/manager/rh-requests";
const MANAGER_REPORTS_PATH = "/workspace/manager/reports";

function scoreDisplay(score: number | null | undefined): string {
    const n = Number(score ?? 0);
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(1)} / 10`;
}

function decisionBadgeClass(decision: string): string {
    const k = String(decision ?? "").trim().toLowerCase();
    if (k === "continue") return "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100";
    if (k === "adjust") return "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100";
    if (k === "stop") return "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100";
    return "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-600 dark:bg-violet-950/45 dark:text-violet-100";
}

function recommendedAction(d: CopilotDecision): string {
    const k = String(d.decision ?? "").trim().toLowerCase();
    if (k === "stop") return "Arbitrage managérial urgent : sécuriser le périmètre et les ressources.";
    if (k === "adjust") return "Planifier une revue courte et ajuster jalons ou capacité.";
    if (k === "continue") return "Maintenir le pilotage et surveiller les indicateurs clés.";
    return "Consolider le contexte et valider la suite avec l'équipe.";
}

export function DecisionLogDrawer({
    open,
    decision,
    onClose,
    onCopied,
    onCopyFailed,
}: {
    open: boolean;
    decision: CopilotDecision | null;
    onClose: () => void;
    onCopied: () => void;
    onCopyFailed: () => void;
}) {
    const { t } = useTranslation("common");
    if (!open || !decision) return null;

    const summaryText = [
        decision.project_name ?? "Projet",
        decision.decision,
        `Score ${scoreDisplay(decision.score)}`,
        `Confiance ${confidencePercent(decision.confidence)} %`,
        stripTechnicalScoringSegments(decision.reason ?? "").slice(0, 400),
    ].join("\n");

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(summaryText);
            onCopied();
        } catch {
            onCopyFailed();
        }
    };

    const pid = decision.project_id?.trim();
    const createdLabel = new Date(decision.created_at).toLocaleString(localeForDateFormatting(i18n.language), {
        dateStyle: "medium",
        timeStyle: "short",
    });

    return (
        <div className="fixed inset-0 z-50">
            <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-label={t("managerWorkspace.decisionLogPage.drawerCloseAria")} />
            <aside className="absolute right-0 top-0 flex h-full w-full max-w-full flex-col overflow-hidden border-l border-secondary/80 bg-primary shadow-2xl sm:max-w-lg">
                <header className="border-b border-secondary/80 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-secondary">{t("managerWorkspace.decisionLogPage.drawerEyebrow")}</p>
                            <h2 className="mt-1 truncate text-lg font-semibold text-primary">{decision.project_name?.trim() || "—"}</h2>
                            <span className={cx("mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase", decisionBadgeClass(decision.decision))}>
                                {decision.decision}
                            </span>
                        </div>
                        <button type="button" className="rounded-xl border border-secondary/80 px-3 py-1.5 text-xs font-medium text-secondary hover:bg-secondary_subtle" onClick={onClose}>
                            {t("managerWorkspace.decisionLogPage.drawerClose")}
                        </button>
                    </div>
                </header>
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                    <dl className="grid gap-2 text-xs">
                        <DrawerRow label={t("managerWorkspace.decisionLogPage.timelineScore")} value={scoreDisplay(decision.score)} />
                        <DrawerRow label={t("managerWorkspace.decisionLogPage.timelineConfidence")} value={`${confidencePercent(decision.confidence)} %`} />
                        <DrawerRow label={t("managerWorkspace.decisionLogPage.drawerSource")} value={decision.scope || "—"} />
                        <DrawerRow label={t("managerWorkspace.decisionLogPage.drawerTimestamp")} value={createdLabel} />
                    </dl>
                    <section>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">{t("managerWorkspace.decisionLogPage.drawerRecommended")}</h3>
                        <p className="mt-2 text-sm font-medium text-brand-secondary">{recommendedAction(decision)}</p>
                    </section>
                    <section>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">{t("managerWorkspace.decisionLogPage.drawerExplanation")}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-secondary">
                            {formatUserFacingExplanation(decision.reason ?? "", {
                                score: Number(decision.score ?? 0),
                                decision: decision.decision,
                            })}
                        </p>
                    </section>
                    <section>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">{t("managerWorkspace.decisionLogPage.drawerLinks")}</h3>
                        <div className="mt-2 flex flex-col gap-2">
                            {pid ? (
                                <Link to={managerProjectsOpenModalPath(pid)} className="rounded-xl border border-brand-secondary/35 bg-brand-primary/10 px-3 py-2.5 text-center text-xs font-semibold text-brand-secondary hover:bg-brand-primary/18">
                                    {t("managerWorkspace.decisionLogPage.drawerLinkProject")}
                                </Link>
                            ) : null}
                            <Link to={MANAGER_RH_REQUESTS_PATH} className="rounded-xl border border-secondary/80 px-3 py-2.5 text-center text-xs font-semibold text-secondary hover:bg-secondary_subtle">
                                {t("managerWorkspace.decisionLogPage.drawerLinkRh")}
                            </Link>
                            <Link to={MANAGER_REPORTS_PATH} className="rounded-xl border border-secondary/80 px-3 py-2.5 text-center text-xs font-semibold text-secondary hover:bg-secondary_subtle">
                                {t("managerWorkspace.decisionLogPage.drawerLinkReports")}
                            </Link>
                        </div>
                    </section>
                </div>
                <footer className="border-t border-secondary/80 px-5 py-4">
                    <button type="button" className="w-full rounded-xl border border-secondary px-3 py-2.5 text-xs font-medium text-secondary hover:bg-secondary_subtle" onClick={() => void copy()}>
                        {t("managerWorkspace.decisionLogPage.drawerCopy")}
                    </button>
                </footer>
            </aside>
        </div>
    );
}

function DrawerRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-2 rounded-lg border border-secondary bg-primary_alt px-3 py-2">
            <dt className="text-tertiary">{label}</dt>
            <dd className="max-w-[65%] text-right font-medium text-primary">{value}</dd>
        </div>
    );
}
