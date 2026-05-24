import { useEffect, useMemo, useRef } from "react";
import {
    getTalentAlerts,
    mapTalentAlertForDisplay,
} from "@/components/talent/talent-detail-shared";
import { isAxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { useRiskAlertAction } from "@/hooks/useNotifications";
import { useTalentDetail, useWatchdogScan } from "@/hooks/useTeam";
import { useToast } from "@/providers/toast-provider";
import { normalizeManagerTeamRouteTalentId } from "@/api/manager-team.api";
import {
    TALENT_LABEL,
    TALENT_PAGE_BG,
    TALENT_TITLE,
    TALENT_CARD,
    parseAnalyst,
} from "@/components/talent/talent-detail-shared";
import { NineBoxCard, IpiRadarCard, MobilityCard } from "@/components/talent/talent-analyst-cards";
import { TalentHeroHeader } from "@/components/talent/details/TalentHeroHeader";
import { AlertsGroupedByType } from "@/components/talent/details/AlertsGroupedByType";
import { ProjectsCardGrid } from "@/components/talent/details/ProjectsCardGrid";
import { SkillsRadarChart } from "@/components/talent/details/SkillsRadarChart";
import { ProjectTimeline } from "@/components/talent/details/ProjectTimeline";

const Box = ("di" + "v") as const;

function talentDetailLoadErrorMessage(error: unknown): string {
    if (isAxiosError(error)) {
        const st = error.response?.status;
        const body = error.response?.data as { message?: string } | undefined;
        const msg = typeof body?.message === "string" ? body.message.trim() : "";
        if (st === 404) {
            const base =
                "Talent introuvable (404). L’URL doit utiliser l’identifiant métier « talent » (liens « Détail » sur Mon équipe). Un id utilisateur, projet ou une valeur inventée par l’IA renverra cette erreur.";
            const n8nMerge =
                " Si ce talent apparaît pourtant dans « Mon équipe », le workflow n8n peut mal fusionner la branche GET_DETAIL (le `talent_id` n’atteint pas Postgres) — corriger avec le script du dépôt `copilot-ui/n8n/route-validate-claims-merger-FIX.js`.";
            if (import.meta.env.DEV) {
                return `${base}${n8nMerge} En dev, une URL en localhost:5173 indique souvent le proxy Vite : le 404 vient alors de n8n après relais. Tracer : VITE_PROXY_DEBUG=1. Axios direct (sans casser le login en fetch) : VITE_HTTP_CLIENT_N8N_BASE.`;
            }
            return `${base}${n8nMerge}`;
        }
        if (st === 401 || st === 403) {
            return "Tu n’as pas l’autorisation d’afficher ce profil.";
        }
        if (msg) return msg;
        if (st) return `Impossible de charger ce profil (erreur ${st}).`;
    }
    return "Impossible de charger ce profil (réseau ou service indisponible).";
}

export default function TalentDetailPage() {
    const { talentId: talentIdParam = "" } = useParams();
    const talentId = useMemo(() => normalizeManagerTeamRouteTalentId(talentIdParam), [talentIdParam]);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const watchdogTabHandled = useRef(false);
    const qc = useQueryClient();
    const detail = useTalentDetail(talentId);
    const watchdogScan = useWatchdogScan();
    const { push } = useToast();
    const resolveAlert = useRiskAlertAction();

    const data = detail.data;
    const activeAlerts = useMemo(
        () => getTalentAlerts(detail.data ?? detail).map((alert) => mapTalentAlertForDisplay(alert)).filter((a) => a.id),
        [detail],
    );

    useEffect(() => {
        if (import.meta.env.DEV) {
            console.log("TALENT DETAIL RESPONSE", detail);
            console.log("ACTIVE ALERTS RESTORED", activeAlerts);
        }
    }, [detail, activeAlerts]);

    const talentName = data?.talent.name ?? data?.talent.full_name ?? "Talent";
    const summary = (data?.summary ?? {}) as Record<string, unknown>;
    const totalAllocationPct = Number(summary.total_allocation_pct ?? 0) || 0;
    const projects = data?.active_assignments ?? [];
    const skills = data?.skills ?? [];
    const recentAbsences = data?.recent_absences ?? [];
    const profile = (data?.profile ?? {}) as Record<string, unknown>;
    const capacity = (data?.capacity ?? {}) as Record<string, unknown>;
    const employment = (data?.employment ?? {}) as Record<string, unknown>;

    const analyst = useMemo(() => parseAnalyst(data), [data]);

    const heroSubtitle = useMemo(() => {
        if (!data) return "Profil talent — allocation, alertes et analyse IA.";
        const role = String(employment.role ?? "—");
        const ctype = String(employment.contract_type ?? "—");
        return `${data.talent.email || "E-mail non renseigné"} — ${role} · ${ctype}`;
    }, [data, employment.contract_type, employment.role]);

    useWorkspaceTopbarMeta(talentName, heroSubtitle);

    const onScan = () => {
        watchdogScan.mutate(
            { talent_id: talentId, use_ai: true },
            {
                onSuccess: () => push(`Scan Watchdog lancé pour ${talentName}.`, "success"),
                onError: () => push("Impossible de lancer le scan Watchdog.", "error"),
            },
        );
    };

    useEffect(() => {
        if (searchParams.get("tab") !== "watchdog" || !talentId || watchdogTabHandled.current) return;
        watchdogTabHandled.current = true;
        watchdogScan.mutate(
            { talent_id: talentId, use_ai: true },
            {
                onSuccess: () => push(`Scan Watchdog lancé pour ${talentName}.`, "success"),
                onError: () => push("Impossible de lancer le scan Watchdog.", "error"),
            },
        );
        const next = new URLSearchParams(searchParams);
        next.delete("tab");
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams, talentId, talentName, push, watchdogScan]);

    const onResolveAlert = (alertId: string) => {
        resolveAlert.mutate(
            { id: alertId, body: { action: "resolve" } },
            {
                onSuccess: async () => {
                    push("Alerte résolue.", "success");
                    await qc.invalidateQueries({ queryKey: ["talent-detail", talentId] });
                    await qc.invalidateQueries({ queryKey: ["team"] });
                },
                onError: () => push("Impossible de résoudre l’alerte.", "error"),
            },
        );
    };

    return (
        <WorkspacePageShell role="manager" eyebrow="Manager" title={talentName} description={false} omitHeader>
            <div className={TALENT_PAGE_BG}>
                {detail.isLoading ? (
                    <p className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                        Chargement du profil talent…
                    </p>
                ) : null}

                {detail.isError ? (
                    <div className="mx-auto max-w-3xl px-4 py-8">
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
                            {talentDetailLoadErrorMessage(detail.error)}
                        </div>
                    </div>
                ) : null}

                {data ? (
                    <>
                        <TalentHeroHeader
                            talentName={talentName}
                            email={data.talent.email ?? ""}
                            role={String(employment.role ?? "—")}
                            contractType={String(employment.contract_type ?? "—")}
                            city={profile.city as string | null | undefined}
                            country={profile.country as string | null | undefined}
                            riskLevel={String(summary.risk_level ?? "")}
                            allocationPct={totalAllocationPct}
                            alertsCount={activeAlerts.length}
                            ipiScore={analyst.ipi?.ipi_score ?? null}
                            contractEndDate={data.talent.contract_end_date}
                            contractEndingSoon={Boolean(data.talent.contract_ending_soon)}
                            onBack={() => navigate("/workspace/manager/team")}
                            onWatchdog={onScan}
                            watchdogPending={watchdogScan.isPending}
                        />

                        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                <div className="space-y-6 lg:col-span-2">
                                    <section>
                                        <h2 className={`mb-4 ${TALENT_TITLE}`}>Analyse IA</h2>
                                        <Box className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                            <NineBoxCard nineBox={analyst.nine_box} talentName={talentName} variant="page" />
                                            <IpiRadarCard ipi={analyst.ipi} variant="page" />
                                            <MobilityCard mobility={analyst.mobility} variant="page" />
                                        </Box>
                                    </section>

                                    <AlertsGroupedByType
                                        alerts={activeAlerts}
                                        onResolve={onResolveAlert}
                                        resolvePending={resolveAlert.isPending}
                                    />

                                    <ProjectsCardGrid assignments={projects} />

                                    <ProjectTimeline assignments={projects} />
                                </div>

                                <aside className="space-y-6 lg:col-span-1">
                                    <SkillsRadarChart skills={skills} />

                                    <section className={`${TALENT_CARD} p-6`}>
                                        <h2 className={TALENT_TITLE}>Contact & capacité</h2>
                                        <dl className="mt-4 space-y-3 text-sm">
                                            <Box>
                                                <dt className={TALENT_LABEL}>Ville / pays</dt>
                                                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                                                    {[String(profile.city ?? "").trim(), String(profile.country ?? "").trim()]
                                                        .filter(Boolean)
                                                        .join(" · ") || "—"}
                                                </dd>
                                            </Box>
                                            <Box>
                                                <dt className={TALENT_LABEL}>Téléphone</dt>
                                                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                                                    {String(profile.phone ?? "").trim() || "—"}
                                                </dd>
                                            </Box>
                                            <Box>
                                                <dt className={TALENT_LABEL}>Capacité (h / semaine)</dt>
                                                <dd className="mt-0.5 tabular-nums text-slate-800 dark:text-slate-200">
                                                    {Number.isFinite(Number(capacity.capacity_hours_per_week))
                                                        ? String(capacity.capacity_hours_per_week)
                                                        : "—"}
                                                </dd>
                                            </Box>
                                            <Box>
                                                <dt className={TALENT_LABEL}>Congés restants</dt>
                                                <dd className="mt-0.5 tabular-nums text-slate-800 dark:text-slate-200">
                                                    {capacity.vacation_days_remaining == null
                                                        ? "—"
                                                        : String(capacity.vacation_days_remaining)}
                                                </dd>
                                            </Box>
                                        </dl>
                                    </section>

                                    <section className={`${TALENT_CARD} p-6`}>
                                        <h2 className={TALENT_TITLE}>Absences récentes</h2>
                                        <p className={`mt-1 ${TALENT_LABEL}`}>90 derniers jours</p>
                                        {recentAbsences.length === 0 ? (
                                            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                                                Aucune absence enregistrée.
                                            </p>
                                        ) : (
                                            <ul className="mt-3 space-y-2">
                                                {recentAbsences.map((abs, index) => (
                                                    <li
                                                        key={`${abs.id ?? index}`}
                                                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
                                                    >
                                                        {(abs.start_date || "—").toString()} → {(abs.end_date || "—").toString()} ·{" "}
                                                        {String(abs.absence_type ?? "absence")}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </section>
                                </aside>
                            </div>
                        </main>
                    </>
                ) : null}
            </div>
        </WorkspacePageShell>
    );
}
