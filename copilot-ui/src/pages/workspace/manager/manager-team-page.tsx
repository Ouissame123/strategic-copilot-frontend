import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getManagerTeam } from "@/api/workspace-manager.api";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Table, TableCard } from "@/components/application/table/table";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { toUserMessage } from "@/hooks/crud/error-message";
import { useCopilotPage } from "@/hooks/use-copilot-page";

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function loadStatusColor(raw: unknown): "error" | "warning" | "success" | "gray" {
    const s = String(raw ?? "").trim().toLowerCase();
    if (s === "overloaded") return "error";
    if (s === "high") return "warning";
    if (s === "normal") return "success";
    if (s === "idle") return "gray";
    return "gray";
}

function nineBoxColor(raw: unknown): "error" | "warning" | "success" | "gray-blue" {
    const s = String(raw ?? "").trim().toLowerCase();
    if (s.includes("underperform")) return "warning";
    if (s.includes("star")) return "success";
    if (s.includes("dependable")) return "gray-blue";
    return "gray-blue";
}

function ipiColor(raw: unknown): "error" | "warning" | "success" | "gray" {
    const s = String(raw ?? "").trim().toLowerCase();
    if (s === "at_risk") return "error";
    if (s === "watch") return "warning";
    if (s === "healthy") return "success";
    return "gray";
}

function mobilityColor(raw: unknown): "error" | "warning" | "success" | "gray" {
    const s = String(raw ?? "").trim().toLowerCase();
    if (s === "at_risk") return "warning";
    if (s === "ready") return "success";
    return "gray";
}

type AiRecommendationTone = "critical" | "warning" | "success" | "neutral";

function recommendationColor(tone: AiRecommendationTone): "error" | "warning" | "success" | "gray-blue" {
    if (tone === "critical") return "error";
    if (tone === "warning") return "warning";
    if (tone === "success") return "success";
    return "gray-blue";
}

function getAiRecommendation(talent: Record<string, unknown>): { label: string; tone: AiRecommendationTone } {
    const allocation = Number(talent.total_allocation_pct ?? 0);
    const loadStatus = String(talent.load_status ?? "").trim().toLowerCase();
    const ipiBand = String(asRecord(talent.ipi).band ?? "").trim().toLowerCase();
    const mobilityFlag = String(asRecord(talent.mobility).flag ?? "").trim().toLowerCase();
    const nineBoxLabel = String(asRecord(talent.nine_box).label ?? "").trim().toLowerCase();

    if (allocation > 100 || loadStatus === "overloaded") {
        return { label: "Rééquilibrer la charge", tone: "critical" };
    }
    if (loadStatus === "high") {
        return { label: "Surveiller la charge", tone: "warning" };
    }
    if (ipiBand === "at_risk" && mobilityFlag === "at_risk") {
        return { label: "Plan d’accompagnement", tone: "critical" };
    }
    if (nineBoxLabel === "underperformer") {
        return { label: "Suivi performance", tone: "warning" };
    }
    if (allocation === 0 && mobilityFlag !== "anchored") {
        return { label: "Candidat mobilisable", tone: "success" };
    }
    return { label: "Situation stable", tone: "neutral" };
}

function recommendationPriority(talent: Record<string, unknown>): number {
    const allocation = Number(talent.total_allocation_pct ?? 0);
    const loadStatus = String(talent.load_status ?? "").trim().toLowerCase();
    const ipiBand = String(asRecord(talent.ipi).band ?? "").trim().toLowerCase();
    const mobilityFlag = String(asRecord(talent.mobility).flag ?? "").trim().toLowerCase();
    const reco = getAiRecommendation(talent);

    if (allocation > 100 || loadStatus === "overloaded" || reco.tone === "critical") return 0;
    if (loadStatus === "high") return 1;
    if (ipiBand === "at_risk") return 2;
    if (loadStatus === "idle" && mobilityFlag !== "anchored") return 3;
    return 4;
}

function TeamKpiCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80">
            <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-primary">{value}</p>
        </div>
    );
}

export function ManagerTeamPage() {
    const { t } = useTranslation(["common", "nav"]);
    useCopilotPage("staffing", t("nav:managerNavTeam"));
    const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [error, setError] = useState<string | null>(null);
    const [team, setTeam] = useState<Record<string, unknown>[]>([]);

    const reload = useCallback(async () => {
        setState("loading");
        setError(null);
        try {
            const raw = await getManagerTeam();
            const payload = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
            const teamRaw = Array.isArray(payload.items) ? payload.items : [];
            setTeam(
                teamRaw.map((entry) =>
                    entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {},
                ),
            );
            setState("success");
        } catch (e) {
            setTeam([]);
            setError(toUserMessage(e));
            setState("error");
        }
    }, []);

    useEffect(() => {
        void reload();
    }, [reload]);

    useEffect(() => {
        const id = window.setInterval(() => void reload(), 30_000);
        return () => window.clearInterval(id);
    }, [reload]);

    const rows = useMemo(() => {
        const normalized = team.map((row, i) => ({
                ...row,
                id: String(row.talent_id ?? row.id ?? `team-${i}`),
                name: String(row.name ?? row.talent_name ?? "—"),
                email: String(row.email ?? row.talent_email ?? "—"),
                role: row.role != null && String(row.role).trim().toLowerCase() !== "null" ? String(row.role) : "—",
                allocation_pct:
                    typeof row.total_allocation_pct === "number" ? row.total_allocation_pct : Number(row.total_allocation_pct ?? 0),
                capacity_hours_per_week:
                    typeof row.capacity_hours_per_week === "number" ? row.capacity_hours_per_week : 40,
                assignments: Array.isArray(row.assignments)
                    ? row.assignments.map((entry) => asRecord(entry))
                    : [],
                projects_count:
                    typeof row.projects_count === "number"
                        ? row.projects_count
                        : Array.isArray(row.assignments)
                          ? row.assignments.length
                          : 0,
                projects_list: Array.isArray(row.assignments)
                    ? row.assignments
                          .map((assignment) => {
                              if (!assignment || typeof assignment !== "object") return "";
                              const a = assignment as Record<string, unknown>;
                              return String(a.project_name ?? "").trim();
                          })
                          .filter((name) => name.length > 0)
                          .join(", ")
                    : "",
                nine_box: asRecord(row.nine_box),
                ipi: asRecord(row.ipi),
                mobility: asRecord(row.mobility),
                load_status: String(row.load_status ?? "unknown"),
            }));
        return normalized.sort((a, b) => {
            const pa = recommendationPriority(a);
            const pb = recommendationPriority(b);
            if (pa !== pb) return pa - pb;
            return String(a.name).localeCompare(String(b.name), "fr", { sensitivity: "base" });
        });
    }, [team]);

    const kpis = useMemo(() => {
        const total = rows.length;
        const idle = rows.filter((row) => String(row.load_status).toLowerCase() === "idle").length;
        const highLoad = rows.filter((row) => {
            const s = String(row.load_status).toLowerCase();
            return s === "high" || s === "overloaded";
        }).length;
        const ipiRisk = rows.filter((row) => String(asRecord(row.ipi).band ?? "").toLowerCase() === "at_risk").length;
        const mobilityRisk = rows.filter((row) => String(asRecord(row.mobility).flag ?? "").toLowerCase() === "at_risk").length;
        return { total, idle, highLoad, ipiRisk, mobilityRisk };
    }, [rows]);

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("common:workspace.managerMonEyebrow")}
            title={t("nav:managerNavTeam")}
            description="Membres, charge et affectations — données issues du GET /api/workspace/manager/team."
        >
            {state === "loading" ? (
                <div className="flex min-h-48 items-center justify-center rounded-2xl border border-secondary bg-primary p-8">
                    <LoadingIndicator type="line-simple" size="md" label={t("common:loading")} />
                </div>
            ) : null}

            {state === "error" ? (
                <div className="rounded-2xl border border-secondary bg-primary p-6">
                    <EmptyState size="md">
                        <EmptyState.Content>
                            <EmptyState.Title>Données indisponibles</EmptyState.Title>
                            <EmptyState.Description>{error}</EmptyState.Description>
                        </EmptyState.Content>
                        <EmptyState.Footer>
                            <Button color="secondary" size="sm" onClick={() => void reload()}>
                                {t("common:retry")}
                            </Button>
                        </EmptyState.Footer>
                    </EmptyState>
                </div>
            ) : null}

            {state === "success" ? (
                <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <TeamKpiCard label="Total membres" value={kpis.total} />
                        <TeamKpiCard label="Idle" value={kpis.idle} />
                        <TeamKpiCard label="Charge élevée" value={kpis.highLoad} />
                        <TeamKpiCard label="IPI à risque" value={kpis.ipiRisk} />
                        <TeamKpiCard label="Mobilité à risque" value={kpis.mobilityRisk} />
                    </div>
                    <TableCard.Root size="md">
                        <TableCard.Header
                            title="Équipe & allocations"
                            description="Réponse de /webhook/api/workspace/manager/team."
                        />
                        {rows.length === 0 ? (
                            <div className="px-4 py-8 md:px-6">
                                <EmptyState size="sm">
                                    <EmptyState.Content>
                                        <EmptyState.Title>Aucun membre retourné.</EmptyState.Title>
                                        <EmptyState.Description>Le backend n’a renvoyé aucune ligne pour cette équipe.</EmptyState.Description>
                                    </EmptyState.Content>
                                </EmptyState>
                            </div>
                        ) : (
                            <Table aria-label="Équipe manager" className="min-w-full">
                                <Table.Header>
                                    <Table.Head id="n" label="Talent" isRowHeader />
                                    <Table.Head id="r" label="Email" />
                                    <Table.Head id="a" label="Allocation" />
                                    <Table.Head id="c" label="Capacité" />
                                    <Table.Head id="p" label="Projets" />
                                    <Table.Head id="ia" label="Diagnostic IA" />
                                    <Table.Head id="rec" label="Recommandation IA" />
                                    <Table.Head id="s" label="Status" />
                                </Table.Header>
                                <Table.Body items={rows}>
                                    {(row) => {
                                        const allocation = typeof row.allocation_pct === "number" ? Math.max(0, row.allocation_pct) : 0;
                                        const assignmentRows = Array.isArray(row.assignments)
                                            ? row.assignments.map((entry) => asRecord(entry))
                                            : [];
                                        const shownAssignments = assignmentRows.slice(0, 2);
                                        const remainingAssignments = Math.max(0, assignmentRows.length - shownAssignments.length);
                                        const nineBox = asRecord(row.nine_box);
                                        const ipi = asRecord(row.ipi);
                                        const mobility = asRecord(row.mobility);
                                        const ipiBand = String(ipi.band ?? "unknown");
                                        const mobilityFlag = String(mobility.flag ?? "unknown");
                                        const recommendation = getAiRecommendation(row);
                                        return (
                                            <Table.Row id={String(row.id)}>
                                                <Table.Cell>
                                                    <div>
                                                        <p className="font-medium text-primary">{String(row.name)}</p>
                                                        <p className="text-xs text-tertiary">{String(row.role)}</p>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell>{String(row.email)}</Table.Cell>
                                                <Table.Cell>
                                                    <p className="text-sm tabular-nums text-secondary">{allocation}%</p>
                                                    <div className="mt-1 h-1.5 w-24 rounded-full bg-secondary">
                                                        <div
                                                            className="h-full rounded-full bg-brand-secondary transition-all"
                                                            style={{ width: `${Math.max(0, Math.min(100, allocation))}%` }}
                                                        />
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <span className="text-sm tabular-nums text-secondary">
                                                        {typeof row.capacity_hours_per_week === "number"
                                                            ? `${row.capacity_hours_per_week}h`
                                                            : "40h"}
                                                    </span>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <div className="space-y-1">
                                                        <span className="text-sm text-secondary">
                                                            {typeof row.projects_count === "number" ? String(row.projects_count) : "0"}
                                                        </span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {shownAssignments.map((assignment, index) => (
                                                                <Badge key={`pr-${String(row.id)}-${index}`} type="pill-color" size="sm" color="gray-blue">
                                                                    {String(assignment.project_name ?? "—")}
                                                                </Badge>
                                                            ))}
                                                            {remainingAssignments > 0 ? (
                                                                <Badge type="pill-color" size="sm" color="gray">
                                                                    +{remainingAssignments}
                                                                </Badge>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <Badge type="pill-color" size="sm" color={nineBoxColor(nineBox.label)}>
                                                            {String(nineBox.label ?? "nine-box: —")}
                                                        </Badge>
                                                        <Badge type="pill-color" size="sm" color={ipiColor(ipiBand)}>
                                                            IPI {String(ipi.score ?? "—")} ({ipiBand})
                                                        </Badge>
                                                        <Badge type="pill-color" size="sm" color={mobilityColor(mobilityFlag)}>
                                                            Mobilité {mobilityFlag}
                                                        </Badge>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Badge type="pill-color" size="sm" color={recommendationColor(recommendation.tone)}>
                                                        {recommendation.label}
                                                    </Badge>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Badge type="pill-color" size="sm" color={loadStatusColor(row.load_status)}>
                                                        {String(row.load_status)}
                                                    </Badge>
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    }}
                                </Table.Body>
                            </Table>
                        )}
                    </TableCard.Root>
                </div>
            ) : null}
        </WorkspacePageShell>
    );
}
