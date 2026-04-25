import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { buildAgentTraces } from "@/features/manager/project-detail/agent-trace";
import { useRecomputeAgent } from "@/features/manager/project-detail/use-recompute-agent";
import type { AgentKey, AgentTrace, ProjectDetailModel } from "@/features/manager/project-detail/types";
import { cx } from "@/utils/cx";

type AgentTracePanelProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    project: ProjectDetailModel;
    focusAgent?: AgentKey | null;
};

function ageText(lastRunAt: string | null): string {
    if (!lastRunAt) return "—";
    const ts = new Date(lastRunAt).getTime();
    if (!Number.isFinite(ts)) return "—";
    const days = Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
    return `${days}j`;
}

function freshnessLabel(trace: AgentTrace): { text: string; className: string } {
    if (trace.freshness === "fresh") return { text: "🟢 à jour", className: "bg-success-secondary text-success-primary" };
    if (trace.freshness === "aging") return { text: `🟡 il y a ${ageText(trace.last_run_at)}`, className: "bg-warning-secondary text-warning-primary" };
    return { text: trace.last_run_at ? `🔴 périmé ${ageText(trace.last_run_at)}` : "🔴 périmé", className: "bg-error-secondary text-error-primary" };
}

export function AgentTracePanel({ isOpen, onOpenChange, project, focusAgent }: AgentTracePanelProps) {
    const { t } = useTranslation("common");
    const [collapsed, setCollapsed] = useState(false);
    const [highlighted, setHighlighted] = useState<AgentKey | null>(null);
    const listRef = useRef<Record<AgentKey, HTMLDivElement | null>>({
        analyst: null,
        watchdog: null,
        strategist: null,
        talent: null,
        helper: null,
    });
    const recompute = useRecomputeAgent(project.id);
    const [bulkRunning, setBulkRunning] = useState(false);
    const traces = useMemo(() => buildAgentTraces(project), [project]);

    useEffect(() => {
        if (!isOpen || !focusAgent) return;
        const node = listRef.current[focusAgent];
        if (!node) return;
        node.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlighted(focusAgent);
        const timer = window.setTimeout(() => setHighlighted(null), 2000);
        return () => window.clearTimeout(timer);
    }, [focusAgent, isOpen]);

    const rerunAll = async () => {
        setBulkRunning(true);
        const rerunnable = traces.filter((trace) => trace.can_rerun && trace.key !== "helper");
        await Promise.allSettled(rerunnable.map((trace) => recompute.mutateAsync(trace.key)));
        setBulkRunning(false);
    };

    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable>
            <Modal className="items-stretch justify-end p-0">
                <Dialog className={cx("h-dvh bg-primary shadow-2xl transition-[width] duration-200", collapsed ? "w-20" : "w-[380px]")}>
                    <div className="flex items-center justify-between border-b border-secondary px-4 py-3">
                        {collapsed ? <span className="text-lg">🤖</span> : <h2 className="text-sm font-semibold text-primary">Agents · Projet {project.name}</h2>}
                        <div className="flex items-center gap-2">
                            {!collapsed ? (
                                <Button size="sm" color="secondary" isLoading={bulkRunning} onClick={() => void rerunAll()}>
                                    {t("managerProjectDetail.agents.rerunAll", { defaultValue: "Tout relancer" })}
                                </Button>
                            ) : null}
                            <Button size="sm" color="tertiary" onClick={() => setCollapsed((v) => !v)}>
                                {collapsed ? "»" : "«"}
                            </Button>
                        </div>
                    </div>
                    {!collapsed ? (
                        <div className="space-y-3 overflow-y-auto p-4">
                            {traces.map((trace) => {
                                const freshness = freshnessLabel(trace);
                                const isRunning = recompute.isPending && recompute.variables === trace.key;
                                return (
                                    <div
                                        key={trace.key}
                                        ref={(node) => {
                                            listRef.current[trace.key] = node;
                                        }}
                                        className={cx(
                                            "rounded-xl border border-secondary p-3",
                                            highlighted === trace.key && "ring-2 ring-brand-solid",
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-semibold text-primary">🤖 {trace.label}</p>
                                                <p className="font-mono text-xs text-tertiary">{trace.workflow}</p>
                                            </div>
                                            <span className={cx("rounded-full px-2 py-0.5 text-xs", freshness.className)}>{freshness.text}</span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {trace.contributes_to.map((item) => (
                                                <span key={item} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary">
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="mt-3 flex items-center justify-between">
                                            <p className="text-xs text-tertiary">{trace.last_run_at ? new Date(trace.last_run_at).toLocaleString("fr-FR") : "—"}</p>
                                            <Button
                                                size="sm"
                                                color="secondary"
                                                disabled={!trace.can_rerun || bulkRunning || recompute.isPending}
                                                isLoading={isRunning}
                                                onClick={() => void recompute.mutateAsync(trace.key)}
                                            >
                                                {isRunning ? "Relance en cours…" : "Relancer"}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : null}
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
