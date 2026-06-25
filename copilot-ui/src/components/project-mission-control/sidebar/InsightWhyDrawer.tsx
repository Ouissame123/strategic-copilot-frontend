import { ArrowLeft, Check, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { Button } from "@/components/base/buttons/button";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { localeForDateFormatting } from "@/lib/ui-locale";
import {
    colorForAgent,
    getInsightActionPattern,
    iconForAgent,
    labelForAgent,
    labelForPayloadAgentKey,
    mapPayloadAgentKey,
} from "@/lib/mission-control-insight-agents";
import type { MissionControlInsightCard } from "@/lib/mission-control-insights";
import { cx } from "@/utils/cx";

type SourceAgentInfo = {
    status?: string;
    duration_ms?: number;
    workflow?: string;
    options_count?: number;
    confidence?: number;
    top_recommendation?: {
        id?: string;
        rationale?: string;
        confidence?: number;
        option_type?: string;
    };
};

type InsightWhyDrawerProps = {
    open: boolean;
    insight: MissionControlInsightCard;
    onClose: () => void;
};

function AgentIcon({ agentKey }: { agentKey: string }) {
    const mapped = mapPayloadAgentKey(agentKey);
    const Icon = iconForAgent(mapped);
    return (
        <span
            className={cx(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border",
                colorForAgent(mapped),
            )}
            aria-hidden
        >
            <Icon className="size-4" />
        </span>
    );
}

function StatusBadge({ status }: { status?: string }) {
    const st = String(status ?? "").toLowerCase();
    if (st === "success") {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                <Check className="size-3.5" aria-hidden />
                OK
            </span>
        );
    }
    if (!st) {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                <AlertTriangle className="size-3.5" aria-hidden />
                vide
            </span>
        );
    }
    return <span className="text-xs font-medium text-slate-500">{status}</span>;
}

function agentDetailLine(info: SourceAgentInfo | null | undefined): string | null {
    if (!info) return null;
    if (info.duration_ms != null) return `${info.duration_ms} ms`;
    if (info.options_count != null) return `${info.options_count} option(s) proposée(s)`;
    if (info.confidence != null) return `confiance ${info.confidence}`;
    if (info.workflow) return info.workflow;
    return null;
}

function formatInsightDate(iso: string | undefined): string {
    if (!iso) return "—";
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return iso;
    return new Date(t).toLocaleString(localeForDateFormatting(i18n.language), {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

export function InsightWhyDrawer({ open, insight, onClose }: InsightWhyDrawerProps) {
    const { t } = useTranslation("common");
    const tm = (key: string, opts?: Record<string, string | number>) =>
        String(
            opts
                ? t(`managerWorkspace.missionControl.${key}`, opts as never)
                : t(`managerWorkspace.missionControl.${key}`),
        );

    useLockBodyScroll(open);

    if (!open) return null;

    const pattern = getInsightActionPattern(insight);
    const copilot = insight.copilot;
    const p = copilot?.payload ?? {};
    const explanation = typeof p.explanation === "string" ? p.explanation : null;
    const agentsRaw = p.source_agents;
    const agents: Record<string, SourceAgentInfo> =
        agentsRaw && typeof agentsRaw === "object" && !Array.isArray(agentsRaw)
            ? (agentsRaw as Record<string, SourceAgentInfo>)
            : {};
    const strategistAgent = agents.strategist ?? null;
    const topRec = strategistAgent?.top_recommendation;

    return (
        <div className="fixed inset-0 z-50">
            <button
                type="button"
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                onClick={onClose}
                aria-label={tm("insightWhyCloseAria")}
            />
            <aside className="absolute right-0 top-0 flex h-full w-full max-w-full flex-col overflow-hidden border-l border-secondary/80 bg-primary shadow-2xl sm:max-w-md">
                <header className="flex items-center gap-3 border-b border-secondary/80 px-5 py-4">
                    <Button type="button" color="tertiary" size="sm" iconLeading={ArrowLeft} onClick={onClose} aria-label={tm("insightWhyBackAria")} />
                    <h2 className="text-base font-semibold text-fg-primary">{tm("insightWhyTitle")}</h2>
                </header>

                <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
                    <section>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            VIA {labelForAgent(insight.source_agent)}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-fg-primary">{insight.title}</p>
                    </section>

                    {pattern === "copilot" && copilot ? (
                        <>
                            <section>
                                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{tm("insightWhyDecisionLabel")}</h3>
                                <p className="mt-1 text-base font-semibold text-fg-primary">{copilot.decision}</p>
                                {Number.isFinite(copilot.confidence) && (
                                    <p className="text-sm text-fg-secondary">
                                        {tm("insightWhyConfidence")} : {Math.round(copilot.confidence * 100)} %
                                    </p>
                                )}
                                {copilot.reasonCode ? (
                                    <span className="mt-2 inline-flex rounded-full border border-secondary bg-secondary/30 px-2.5 py-0.5 text-xs font-medium text-fg-secondary">
                                        {copilot.reasonCode}
                                    </span>
                                ) : null}
                            </section>
                            <section>
                                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{tm("insightWhyExplanationTitle")}</h3>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg-secondary">
                                    {explanation ?? tm("insightWhyExplanationEmpty")}
                                </p>
                            </section>
                            {Object.keys(agents).length > 0 ? (
                                <section>
                                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                                        {tm("insightWhyAgentsTitle")}
                                    </h3>
                                    <ul className="space-y-2">
                                        {Object.entries(agents).map(([name, info]) => {
                                            const detail = agentDetailLine(info);
                                            return (
                                                <li key={name} className="flex items-center gap-3 rounded-md border border-secondary/80 p-2">
                                                    <AgentIcon agentKey={name} />
                                                    <span className="text-sm font-medium text-fg-primary">{labelForPayloadAgentKey(name)}</span>
                                                    <StatusBadge status={info?.status} />
                                                    {detail ? <span className="ml-auto text-xs text-fg-tertiary">{detail}</span> : null}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </section>
                            ) : null}
                            {topRec ? (
                                <section className="rounded-md border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                                    <h3 className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                                        {tm("insightWhyStrategistTitle")}
                                    </h3>
                                    {topRec.option_type ? (
                                        <p className="mt-1 text-sm text-fg-secondary">
                                            <strong>{tm("insightWhyStrategistType")} :</strong> {topRec.option_type}
                                        </p>
                                    ) : null}
                                    {topRec.rationale ? <p className="mt-1 text-sm text-fg-secondary">{topRec.rationale}</p> : null}
                                </section>
                            ) : null}
                        </>
                    ) : null}

                    {pattern === "watchdog" && insight.watchdog ? (
                        <section>
                            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{tm("insightWhyWatchdogTitle")}</h3>
                            {insight.watchdog.risk_type ? (
                                <p className="mt-2 text-sm text-fg-secondary">
                                    <strong>{tm("insightWhyWatchdogType")} :</strong> {insight.watchdog.risk_type}
                                </p>
                            ) : null}
                            {insight.watchdog.severity ? (
                                <p className="mt-1 text-sm text-fg-secondary">
                                    <strong>{tm("insightWhyWatchdogSeverity")} :</strong> {insight.watchdog.severity}
                                </p>
                            ) : null}
                            {insight.watchdog.message ? (
                                <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
                                    <strong>{tm("insightWhyWatchdogMessage")} :</strong> {insight.watchdog.message}
                                </p>
                            ) : null}
                            {insight.watchdog.risk_score != null ? (
                                <p className="mt-1 text-sm text-fg-secondary">
                                    <strong>{tm("insightWhyWatchdogScore")} :</strong> {insight.watchdog.risk_score} / 10
                                </p>
                            ) : null}
                            <p className="mt-2 text-xs text-fg-tertiary">
                                {tm("insightWhyWatchdogDetected")} {formatInsightDate(insight.watchdog.detected_at)}
                            </p>
                        </section>
                    ) : null}

                    {pattern === "analyst" && insight.analyst ? (
                        <section>
                            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{tm("insightWhyAnalystTitle")}</h3>
                            {insight.analyst.viability_score != null ? (
                                <p className="mt-2 text-sm text-fg-secondary">
                                    <strong>{tm("insightWhyAnalystScore")} :</strong> {insight.analyst.viability_score} / 10
                                </p>
                            ) : null}
                            {insight.analyst.decision ? (
                                <p className="mt-1 text-sm text-fg-secondary">
                                    <strong>{tm("insightWhyDecisionLabel")} :</strong> {insight.analyst.decision}
                                </p>
                            ) : null}
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg-secondary">
                                {insight.analyst.explanation?.trim() || insight.why_detail?.trim() || tm("insightWhyExplanationEmpty")}
                            </p>
                        </section>
                    ) : null}

                    {(pattern === "matchmaker" || pattern === "strategist" || pattern === "unknown") && (
                        <section>
                            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{tm("insightWhySummaryTitle")}</h3>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg-secondary">
                                {insight.why_detail?.trim() || insight.explanation || tm("insightWhyExplanationEmpty")}
                            </p>
                            {pattern === "strategist" && insight.strategist?.option_type ? (
                                <p className="mt-2 text-sm text-fg-secondary">
                                    <strong>{tm("insightWhyStrategistType")} :</strong> {insight.strategist.option_type}
                                </p>
                            ) : null}
                            {pattern === "matchmaker" && insight.matchmaker?.skill_name ? (
                                <p className="mt-2 text-sm text-fg-secondary">
                                    <strong>{tm("insightWhyMatchmakerSkill")} :</strong> {insight.matchmaker.skill_name}
                                </p>
                            ) : null}
                        </section>
                    )}
                </div>

                <footer className="border-t border-secondary/80 px-5 py-4">
                    <Button type="button" color="tertiary" size="sm" onClick={onClose}>
                        {tm("insightWhyClose")}
                    </Button>
                </footer>
            </aside>
        </div>
    );
}
