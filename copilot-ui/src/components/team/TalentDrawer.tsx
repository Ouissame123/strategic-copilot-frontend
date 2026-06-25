// Drawer talent réutilisable depuis l'onglet Équipe manager
// PDF Agent 5 (Analyst) : 9-Box + IPI Radar + Mobilité + drill-down complet
//
// Usage :
//   <TalentDrawer talentId={selectedTalentId} onClose={() => setSelectedTalentId(null)} />

import { useEffect, useMemo, useState } from "react";
import {
    cleanAlertMessage,
    getTalentAlerts,
    mapTalentAlertForDisplay,
    parseAnalyst,
    type TalentDetailData,
} from "@/components/talent/talent-detail-shared";
import {
    X,
    Loader2,
    AlertTriangle,
    Mail,
    MapPin,
    Calendar,
    Briefcase,
    UserCheck,
    ChevronRight,
    ExternalLink,
    Sparkles,
    Clock,
} from "lucide-react";
import { normalizeManagerTeamRouteTalentId } from "@/api/manager-team.api";
import { MobilityCard } from "@/components/talent/talent-analyst-cards";
import { getManagerTeamTalentDetailUrl } from "@/config/manager-team-api.config";

// ===== Types alignés sur GET détail talent (WF wmt-detail-v1 / VITE_MANAGER_TEAM_DETAIL_URL) =====

export interface TalentDetailResponse {
    talent: {
        id: string;
        name: string;
        email: string;
        contract_end_date: string | null;
        contract_ending_soon: boolean;
    };
    employment?: {
        role: string | null;
        contract_type: string | null;
        integration_date: string | null;
    };
    capacity?: {
        capacity_hours_per_week: number | null;
    };
    profile?: {
        city: string | null;
        country: string | null;
    };
    skills: Array<{
        skill_id: string;
        skill_name: string;
        skill_type: "hard" | "soft" | null;
        level: number | null;
        years_experience: number | null;
        is_certified: boolean | null;
    }>;
    active_assignments: Array<{
        id: string;
        project_id: string;
        project_name: string | null;
        project_status: string | null;
        project_priority: number | null;
        allocation_pct: number;
        role_on_project: string | null;
    }>;
    active_alerts: Array<{
        id: string;
        severity: "low" | "medium" | "high" | "critical";
        risk_type: string;
        message: string;
        risk_score: number | null;
        detected_at: string;
    }>;
    analyst?: {
        nine_box?: {
            performance_score: number;
            potential_score: number;
            box_label: string;
            rationale: string | null;
            computed_at: string;
        } | null;
        ipi?: {
            ipi_score: number;
            tech_score: number;
            exp_score: number;
            stability_score: number;
            band: "low" | "average" | "high" | string;
            computed_at: string;
        } | null;
        mobility?: {
            mobility_flag: "stable" | "mobile" | "at_risk" | string;
            mobility_score: number;
            drivers: Array<string | { key: string; value: string | number }> | null;
            computed_at: string;
            total_skills?: number | null;
        } | null;
    };
    summary?: {
        total_allocation_pct: number;
        overload: boolean;
        tension: boolean;
        active_projects_count: number;
        skills_count: number;
        active_alerts_count: number;
        absences_last_90d: number;
        contract_ending_soon: boolean;
        risk_level: "low" | "medium" | "high";
    };
}

type AnalystNineBox = NonNullable<NonNullable<TalentDetailResponse["analyst"]>["nine_box"]>;
type AnalystIpi = NonNullable<NonNullable<TalentDetailResponse["analyst"]>["ipi"]>;
interface Props {
    talentId: string | null;
    /** Contrôle d’affichage explicite (ex. fermeture animée côté parent) */
    open?: boolean;
    onClose: () => void;
    /** Token JWT — si géré ailleurs (auth context), peut être omis */
    accessToken?: string;
    /** Callback bonus : ouvrir un projet depuis la liste */
    onProjectClick?: (projectId: string) => void;
}

function normalizeDrawerPayload(json: unknown): TalentDetailResponse {
    if (!json || typeof json !== "object") throw new Error("Réponse invalide");
    const root = json as Record<string, unknown>;
    if (root.status === "error") {
        throw new Error(String(root.message ?? root.error ?? "Erreur API"));
    }
    const rawTalent = root.talent;
    if (!rawTalent || typeof rawTalent !== "object") throw new Error("Réponse invalide (talent manquant)");
    const t = rawTalent as Record<string, unknown>;
    const name = String(t.name ?? t.full_name ?? "—").trim() || "—";

    return {
        talent: {
            id: String(t.id ?? t.talent_id ?? "").trim(),
            name,
            email: String(t.email ?? ""),
            contract_end_date: t.contract_end_date == null ? null : String(t.contract_end_date),
            contract_ending_soon: Boolean(t.contract_ending_soon),
        },
        employment: root.employment as TalentDetailResponse["employment"],
        capacity: root.capacity as TalentDetailResponse["capacity"],
        profile: root.profile as TalentDetailResponse["profile"],
        skills: (Array.isArray(root.skills) ? root.skills : []) as TalentDetailResponse["skills"],
        active_assignments: (Array.isArray(root.active_assignments) ? root.active_assignments : []) as TalentDetailResponse["active_assignments"],
        active_alerts: getTalentAlerts(root).map((alert) => {
            const mapped = mapTalentAlertForDisplay(alert);
            return {
                id: mapped.id,
                severity: (mapped.severity as TalentDetailResponse["active_alerts"][number]["severity"]) || "medium",
                risk_type: String(mapped.risk_type ?? mapped.category ?? "risque"),
                message: mapped.message || cleanAlertMessage(mapped.title) || "Alerte",
                risk_score: mapped.risk_score ?? null,
                detected_at: String(mapped.detected_at ?? ""),
            };
        }) as TalentDetailResponse["active_alerts"],
        analyst: root.analyst as TalentDetailResponse["analyst"],
        summary: root.summary as TalentDetailResponse["summary"],
    };
}

export function TalentDrawer({ talentId, open = true, onClose, accessToken, onProjectClick }: Props) {
    const [data, setData] = useState<TalentDetailResponse | null>(null);
    const [detailResponse, setDetailResponse] = useState<unknown>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analystView = useMemo(
        () => parseAnalyst(data as TalentDetailData | undefined),
        [data],
    );

    const activeAlerts = useMemo(() => {
        const list = getTalentAlerts(detailResponse ?? data);
        return list
            .map((alert) => {
                const mapped = mapTalentAlertForDisplay(alert);
                return {
                    id: mapped.id,
                    severity: (mapped.severity as TalentDetailResponse["active_alerts"][number]["severity"]) || "medium",
                    risk_type: String(mapped.risk_type ?? mapped.category ?? "risque"),
                    message: mapped.message || cleanAlertMessage(mapped.title) || "Alerte",
                    risk_score: mapped.risk_score ?? null,
                    detected_at: String(mapped.detected_at ?? ""),
                };
            })
            .filter((a) => Boolean(a.id));
    }, [detailResponse, data]);

    useEffect(() => {
        if (!talentId) {
            setData(null);
            setDetailResponse(null);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);

        const id = normalizeManagerTeamRouteTalentId(talentId);
        const url = getManagerTeamTalentDetailUrl(encodeURIComponent(id));
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

        fetch(url, { headers })
            .then(async (r) => {
                const json: unknown = await r.json();
                if (!r.ok) {
                    const msg =
                        json && typeof json === "object" && "message" in json
                            ? String((json as { message?: string }).message)
                            : `Erreur HTTP ${r.status}`;
                    throw new Error(msg || `Erreur HTTP ${r.status}`);
                }
                return json;
            })
            .then((json) => {
                if (cancelled) return;
                setDetailResponse(json);
                setData(normalizeDrawerPayload(json));
            })
            .catch((e: unknown) => {
                if (!cancelled) setError(e instanceof Error ? e.message : "Erreur inconnue");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [talentId, accessToken]);

    if (!talentId || !open) return null;

    return (
        <>
            <DrawerBackdrop onClose={onClose} />
            <aside
                className="fixed top-0 right-0 z-50 h-screen w-full max-w-[640px] overflow-y-auto bg-white shadow-2xl dark:bg-primary"
                role="dialog"
                aria-label="Fiche talent"
            >
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-secondary dark:bg-primary">
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">Fiche talent</p>
                        <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-primary">
                            {data?.talent.name || (loading ? "Chargement…" : "—")}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-secondary_subtle"
                        aria-label="Fermer"
                    >
                        <X className="h-5 w-5 text-slate-600" />
                    </button>
                </div>

                <div className="space-y-6 p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-slate-500">
                            <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Chargement…
                        </div>
                    ) : null}

                    {error ? (
                        <div className="flex items-start gap-3 rounded-lg border border-rose-300 bg-rose-50 p-4">
                            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
                            <div className="text-sm text-rose-900">
                                <p className="font-semibold">Impossible de charger le talent</p>
                                <p className="mt-1 text-xs">{error}</p>
                            </div>
                        </div>
                    ) : null}

                    {data && !loading && !error ? (
                        <>
                            <IdentityCard
                                talent={data.talent}
                                employment={data.employment}
                                profile={data.profile}
                                capacity={data.capacity}
                                summary={data.summary}
                            />

                            {data.summary ? <RiskBadge summary={data.summary} /> : null}

                            <section>
                                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                                    Analyse IA (Agent Analyst)
                                </h3>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <NineBoxCard nineBox={analystView.nine_box ?? undefined} talentName={data.talent.name} />
                                    <IpiRadarCard ipi={analystView.ipi ?? undefined} />
                                </div>
                                {analystView.mobility ? (
                                    <div className="mt-3">
                                        <MobilityCard mobility={analystView.mobility} variant="drawer" />
                                    </div>
                                ) : null}
                            </section>

                            <section>
                                <h3 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    <span>Projets actifs ({data.active_assignments.length})</span>
                                    {data.summary?.overload ? (
                                        <span className="rounded border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                                            surchargé {data.summary.total_allocation_pct}%
                                        </span>
                                    ) : null}
                                </h3>
                                <ul className="space-y-1.5">
                                    {data.active_assignments.length === 0 ? (
                                        <li className="py-2 text-xs italic text-slate-500">Aucun projet en cours</li>
                                    ) : (
                                        data.active_assignments.map((a) => (
                                            <li key={a.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => onProjectClick?.(a.project_id)}
                                                    disabled={!onProjectClick}
                                                    className="flex w-full items-center justify-between rounded border border-slate-200 p-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 disabled:cursor-default disabled:hover:bg-white"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium text-slate-800">
                                                            {a.project_name || "—"}
                                                        </p>
                                                        {a.role_on_project ? (
                                                            <p className="truncate text-[11px] text-slate-500">{a.role_on_project}</p>
                                                        ) : null}
                                                    </div>
                                                    <div className="flex flex-shrink-0 items-center gap-2">
                                                        {a.project_priority != null && a.project_priority <= 3 ? (
                                                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                                                                P{a.project_priority}
                                                            </span>
                                                        ) : null}
                                                        <span className="text-sm font-semibold tabular-nums text-slate-700">
                                                            {a.allocation_pct}%
                                                        </span>
                                                        {onProjectClick ? <ChevronRight className="h-3.5 w-3.5 text-slate-400" /> : null}
                                                    </div>
                                                </button>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </section>

                            {data.skills.length > 0 ? (
                                <section>
                                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                        Compétences clés
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {data.skills
                                            .slice()
                                            .sort((a, b) => (b.level || 0) - (a.level || 0))
                                            .slice(0, 6)
                                            .map((s) => (
                                                <SkillChip key={s.skill_id} skill={s} />
                                            ))}
                                    </div>
                                </section>
                            ) : null}

                            {activeAlerts.length > 0 ? (
                                <section>
                                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                        Alertes actives ({activeAlerts.length})
                                    </h3>
                                    <ul className="space-y-1.5">
                                        {activeAlerts.slice(0, 5).map((a) => (
                                            <li key={a.id} className="flex items-start gap-2 rounded border border-slate-200 p-2 text-xs">
                                                <span
                                                    className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                                        a.severity === "critical"
                                                            ? "bg-rose-600 text-white"
                                                            : a.severity === "high"
                                                              ? "border border-rose-300 bg-rose-100 text-rose-700"
                                                              : a.severity === "medium"
                                                                ? "border border-amber-300 bg-amber-100 text-amber-800"
                                                                : "bg-slate-100 text-slate-700"
                                                    }`}
                                                >
                                                    {a.severity}
                                                </span>
                                                <span className="leading-snug text-slate-700">{a.message}</span>
                                            </li>
                                        ))}
                                        {activeAlerts.length > 5 ? (
                                            <li className="pl-2 text-[11px] text-slate-500">
                                                + {activeAlerts.length - 5} autres alertes…
                                            </li>
                                        ) : null}
                                    </ul>
                                </section>
                            ) : (
                                <p className="text-xs text-slate-500">Aucune alerte active.</p>
                            )}

                            <section className="border-t border-slate-200 pt-2">
                                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Actions manager
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    <a
                                        href={`/workspace/manager/team/${data.talent.id}`}
                                        className="inline-flex items-center gap-1.5 rounded border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Voir fiche complète
                                    </a>
                                </div>
                            </section>
                        </>
                    ) : null}
                </div>
            </aside>
        </>
    );
}

function DrawerBackdrop({ onClose }: { onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-40 bg-slate-900/40 transition-opacity"
            onClick={onClose}
            aria-hidden="true"
        />
    );
}

function IdentityCard({
    talent,
    employment,
    profile,
    capacity,
    summary,
}: {
    talent: TalentDetailResponse["talent"];
    employment?: TalentDetailResponse["employment"];
    profile?: TalentDetailResponse["profile"];
    capacity?: TalentDetailResponse["capacity"];
    summary?: TalentDetailResponse["summary"];
}) {
    const contractEndDate = talent.contract_end_date ? new Date(talent.contract_end_date) : null;
    const daysToEnd = contractEndDate ? Math.ceil((contractEndDate.getTime() - Date.now()) / 86400000) : null;

    return (
        <section className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    {employment?.role ? (
                        <p className="text-sm font-medium text-slate-700">
                            <Briefcase className="mr-1 inline h-3.5 w-3.5 text-slate-500" />
                            {employment.role}
                            {employment.contract_type ? (
                                <span className="ml-2 text-xs text-slate-500">· {employment.contract_type}</span>
                            ) : null}
                        </p>
                    ) : null}
                    {talent.email ? (
                        <p className="mt-1 text-xs text-slate-600">
                            <Mail className="mr-1 inline h-3 w-3" />
                            {talent.email}
                        </p>
                    ) : null}
                    {profile?.city ? (
                        <p className="text-xs text-slate-600">
                            <MapPin className="mr-1 inline h-3 w-3" />
                            {profile.city}
                            {profile.country ? `, ${profile.country}` : ""}
                        </p>
                    ) : null}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-2">
                <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-500">Capacité</p>
                    <p className="text-sm font-semibold tabular-nums">
                        {capacity?.capacity_hours_per_week ? `${capacity.capacity_hours_per_week}h/sem` : "—"}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-500">Allocation</p>
                    <p
                        className={`text-sm font-semibold tabular-nums ${
                            summary?.overload ? "text-rose-700" : summary?.tension ? "text-amber-700" : "text-slate-700"
                        }`}
                    >
                        {summary?.total_allocation_pct ?? 0}%
                    </p>
                </div>
                <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-500">Contrat</p>
                    <p className="flex items-center gap-1 text-sm font-semibold tabular-nums">
                        {contractEndDate ? (
                            <>
                                <Calendar className="h-3 w-3" />
                                <span className={daysToEnd != null && daysToEnd <= 90 ? "text-amber-700" : "text-slate-700"}>
                                    {daysToEnd != null && daysToEnd >= 0 ? `${daysToEnd}j` : "—"}
                                </span>
                            </>
                        ) : (
                            <span className="text-slate-400">indéterminé</span>
                        )}
                    </p>
                </div>
            </div>
        </section>
    );
}

function RiskBadge({ summary }: { summary: NonNullable<TalentDetailResponse["summary"]> }) {
    const config = {
        high: { bg: "border-rose-300 bg-rose-50", text: "text-rose-900", label: "Risque élevé", Icon: AlertTriangle },
        medium: { bg: "border-amber-300 bg-amber-50", text: "text-amber-900", label: "À surveiller", Icon: Clock },
        low: { bg: "border-emerald-300 bg-emerald-50", text: "text-emerald-900", label: "Stable", Icon: UserCheck },
    }[summary.risk_level];
    const Icon = config.Icon;

    return (
        <div className={`flex items-center gap-3 rounded-lg border p-3 ${config.bg}`}>
            <Icon className={`h-5 w-5 flex-shrink-0 ${config.text}`} />
            <div className="flex-1 text-sm">
                <p className={`font-semibold ${config.text}`}>{config.label}</p>
                <p className={`text-xs opacity-80 ${config.text}`}>
                    Allocation {summary.total_allocation_pct}% · {summary.active_alerts_count} alerte(s) ·{" "}
                    {summary.active_projects_count} projet(s)
                    {summary.contract_ending_soon ? " · contrat <90j" : ""}
                </p>
            </div>
        </div>
    );
}

function NineBoxCard({ nineBox, talentName }: { nineBox?: AnalystNineBox; talentName: string }) {
    if (!nineBox) {
        return (
            <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-slate-200 p-3 text-center text-xs italic text-slate-500">
                9-Box non calculé
            </div>
        );
    }

    const col = nineBox.performance_score >= 7 ? 2 : nineBox.performance_score >= 4 ? 1 : 0;
    const row = nineBox.potential_score >= 7 ? 0 : nineBox.potential_score >= 4 ? 1 : 2;

    const W = 200;
    const H = 160;
    const cellSize = 38;
    const gridStartX = 30;
    const gridStartY = 14;

    return (
        <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-1 flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-700">9-Box</h4>
                <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-700">
                    {nineBox.box_label}
                </span>
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`9-Box position pour ${talentName}`}>
                <text x="6" y="20" fontSize="8" fill="#64748b" transform="rotate(-90, 6, 80)">
                    Potentiel
                </text>
                {[0, 1, 2].map((r) =>
                    [0, 1, 2].map((c) => {
                        const x = gridStartX + c * cellSize;
                        const y = gridStartY + r * cellSize;
                        const isTarget = c === col && r === row;
                        const fill = isTarget
                            ? "#7c3aed"
                            : r === 0 && c === 2
                              ? "#dcfce7"
                              : r === 2 && c === 0
                                ? "#fee2e2"
                                : "#f8fafc";
                        const stroke = isTarget ? "#5b21b6" : "#cbd5e1";
                        return (
                            <g key={`${r}-${c}`}>
                                <rect
                                    x={x}
                                    y={y}
                                    width={cellSize - 2}
                                    height={cellSize - 2}
                                    fill={fill}
                                    stroke={stroke}
                                    strokeWidth={isTarget ? 2 : 1}
                                    rx="3"
                                />
                                {isTarget ? (
                                    <text
                                        x={x + (cellSize - 2) / 2}
                                        y={y + (cellSize - 2) / 2 + 4}
                                        textAnchor="middle"
                                        fontSize="14"
                                        fontWeight="700"
                                        fill="white"
                                    >
                                        ★
                                    </text>
                                ) : null}
                            </g>
                        );
                    }),
                )}
                <text x={gridStartX + (cellSize * 3) / 2} y={H - 4} textAnchor="middle" fontSize="8" fill="#64748b">
                    Performance →
                </text>
                <text x={gridStartX + 4} y={gridStartY + 10} fontSize="6" fill="#94a3b8">
                    faible
                </text>
                <text
                    x={gridStartX + cellSize * 2 + cellSize - 4}
                    y={gridStartY + 10}
                    fontSize="6"
                    fill="#94a3b8"
                    textAnchor="end"
                >
                    élevé
                </text>
            </svg>

            <div className="mt-1 flex justify-between text-[11px] tabular-nums text-slate-600">
                <span>
                    Perf : <b>{nineBox.performance_score.toFixed(1)}</b>/10
                </span>
                <span>
                    Pot : <b>{nineBox.potential_score.toFixed(1)}</b>/10
                </span>
            </div>
        </div>
    );
}

function IpiRadarCard({ ipi }: { ipi?: AnalystIpi }) {
    if (!ipi) {
        return (
            <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-slate-200 p-3 text-center text-xs italic text-slate-500">
                IPI non calculé
            </div>
        );
    }

    const W = 200;
    const H = 160;
    const cx = W / 2;
    const cy = H / 2 + 6;
    const radius = 50;

    const axes = [
        { label: "Tech", angle: -90, value: ipi.tech_score },
        { label: "Exp", angle: 150, value: ipi.exp_score },
        { label: "Stabilité", angle: 30, value: ipi.stability_score },
    ];

    function pointAt(angleDeg: number, distance: number): [number, number] {
        const rad = (angleDeg * Math.PI) / 180;
        return [cx + Math.cos(rad) * distance, cy + Math.sin(rad) * distance];
    }

    const polygonPoints = axes
        .map((a) => pointAt(a.angle, (a.value / 10) * radius))
        .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
        .join(" ");

    const fillColor = ipi.band === "high" ? "#10b981" : ipi.band === "low" ? "#ef4444" : "#f59e0b";
    const bandBadgeClass =
        ipi.band === "high"
            ? "bg-emerald-100 text-emerald-700"
            : ipi.band === "low"
              ? "bg-rose-100 text-rose-700"
              : "bg-amber-100 text-amber-700";

    return (
        <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-1 flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-700">IPI · {ipi.ipi_score.toFixed(1)}/10</h4>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${bandBadgeClass}`}>{ipi.band}</span>
            </div>

            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="h-auto w-full"
                role="img"
                aria-label={`Radar IPI : tech ${ipi.tech_score}, exp ${ipi.exp_score}, stabilité ${ipi.stability_score}`}
            >
                {[0.33, 0.66, 1].map((r, i) => (
                    <circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r={radius * r}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="0.5"
                        strokeDasharray={i < 2 ? "2,2" : ""}
                    />
                ))}
                {axes.map((a) => {
                    const [x, y] = pointAt(a.angle, radius);
                    return <line key={a.label} x1={cx} y1={cy} x2={x} y2={y} stroke="#cbd5e1" strokeWidth="0.5" />;
                })}
                <polygon points={polygonPoints} fill={fillColor} fillOpacity="0.25" stroke={fillColor} strokeWidth="1.5" />
                {axes.map((a) => {
                    const [x, y] = pointAt(a.angle, (a.value / 10) * radius);
                    return <circle key={a.label} cx={x} cy={y} r="3" fill={fillColor} stroke="white" strokeWidth="1" />;
                })}
                {axes.map((a) => {
                    const [x, y] = pointAt(a.angle, radius + 12);
                    return (
                        <text key={a.label} x={x} y={y} textAnchor="middle" fontSize="9" fontWeight="600" fill="#475569">
                            {a.label}
                        </text>
                    );
                })}
            </svg>

            <div className="mt-1 flex justify-around text-[10px] tabular-nums text-slate-500">
                <span>
                    T: <b>{ipi.tech_score.toFixed(1)}</b>
                </span>
                <span>
                    E: <b>{ipi.exp_score.toFixed(1)}</b>
                </span>
                <span>
                    S: <b>{ipi.stability_score.toFixed(1)}</b>
                </span>
            </div>
        </div>
    );
}

function SkillChip({ skill }: { skill: TalentDetailResponse["skills"][number] }) {
    const level = Math.max(0, Math.min(5, skill.level || 0));
    const isHard = skill.skill_type === "hard";

    return (
        <div
            className={`flex items-center justify-between gap-2 rounded border p-2 ${
                isHard ? "border-indigo-200 bg-indigo-50/50" : "border-fuchsia-200 bg-fuchsia-50/50"
            }`}
        >
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">{skill.skill_name}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    {skill.skill_type || "skill"}
                    {skill.years_experience != null && skill.years_experience > 0 ? ` · ${skill.years_experience}a` : ""}
                </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                    <span
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full ${i <= level ? (isHard ? "bg-indigo-600" : "bg-fuchsia-600") : "bg-slate-200"}`}
                    />
                ))}
            </div>
        </div>
    );
}
