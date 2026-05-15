import { useMemo } from "react";
import { isAxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { useRiskAlertAction } from "@/hooks/useNotifications";
import { useTalentDetail, useWatchdogScan } from "@/hooks/useTeam";
import { useToast } from "@/providers/toast-provider";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";
import { normalizeManagerTeamRouteTalentId } from "@/api/manager-team.api";

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
    const qc = useQueryClient();
    const detail = useTalentDetail(talentId);
    const watchdogScan = useWatchdogScan();
    const { push } = useToast();
    const resolveAlert = useRiskAlertAction();

    const talentName = detail.data?.talent.name ?? detail.data?.talent.full_name ?? "Talent";
    const summary = detail.data?.summary ?? {};
    const totalAllocationPct = Number(summary.total_allocation_pct ?? 0) || 0;
    const alerts = detail.data?.active_alerts ?? [];
    const projects = detail.data?.active_assignments ?? [];
    const skills = detail.data?.skills ?? [];
    const recentAbsences = detail.data?.recent_absences ?? [];
    const profile = (detail.data?.profile ?? {}) as Record<string, unknown>;
    const capacity = (detail.data?.capacity ?? {}) as Record<string, unknown>;

    const analyst = (detail.data?.analyst ?? {}) as {
        nine_box?: { box_label?: string };
        ipi?: { ipi_score?: number; ipi_band?: string; band?: string };
        mobility?: { mobility_flag?: string };
        [k: string]: unknown;
    };
    const nineBox = analyst.nine_box?.box_label ?? "—";
    const ipi = analyst.ipi?.ipi_score;
    const ipiBand = analyst.ipi?.ipi_band ?? analyst.ipi?.band ?? "—";
    const mobility = analyst.mobility?.mobility_flag ?? "—";

    const riskTone = (() => {
        const fromColor = String((summary as { status_color?: string }).status_color ?? "").toLowerCase();
        if (fromColor === "red") return "red";
        if (fromColor === "orange") return "orange";
        if (fromColor === "green") return "green";
        if (totalAllocationPct >= 160 || alerts.length >= 3) return "red";
        if (totalAllocationPct >= 100 || alerts.length >= 1) return "orange";
        return "green";
    })();

    const heroSubtitle = useMemo(() => {
        const d = detail.data;
        if (!d) return "Profil complet pour décisions RH et arbitrages d’allocation.";
        const role = String((d.employment as { role?: string })?.role ?? "—");
        const ctype = String((d.employment as { contract_type?: string })?.contract_type ?? "—");
        const end = d.talent.contract_end_date
            ? ` · Contrat jusqu’au ${new Date(d.talent.contract_end_date).toLocaleDateString("fr-FR")}`
            : "";
        return `${d.talent.email || "E-mail non renseigné"} — ${role} · ${ctype}${end}`;
    }, [detail.data]);

    const onScan = () => {
        watchdogScan.mutate(
            { talent_id: talentId, use_ai: true },
            {
                onSuccess: () => push(`Scan Watchdog lancé pour ${talentName}.`, "success"),
                onError: () => push("Impossible de lancer le scan Watchdog.", "error"),
            },
        );
    };

    useWorkspaceTopbarMeta(talentName, heroSubtitle);

    return (
        <WorkspacePageShell role="manager" eyebrow="Manager" title={talentName} description={false} omitHeader>
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    className="rounded-lg border border-secondary bg-primary_alt px-3 py-2 text-xs font-semibold text-secondary hover:bg-secondary_subtle"
                    onClick={() => navigate("/workspace/manager/team")}
                >
                    ← Retour équipe
                </button>
                <button
                    type="button"
                    className="rounded-lg border border-secondary bg-primary_alt px-3 py-2 text-xs font-semibold text-secondary hover:bg-secondary_subtle disabled:opacity-60"
                    disabled={watchdogScan.isPending}
                    onClick={onScan}
                >
                    {watchdogScan.isPending ? "Scan…" : "Watchdog"}
                </button>
            </div>
            {detail.isLoading ? <p className="p-6">Chargement du profil talent…</p> : null}
            {detail.isError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
                    {talentDetailLoadErrorMessage(detail.error)}
                </div>
            ) : null}
            {detail.data ? (
                <div className="space-y-4">
                    <section
                        className={`rounded-xl border-l-4 p-4 ${
                            riskTone === "red"
                                ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                                : riskTone === "orange"
                                  ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                                  : "border-green-500 bg-green-50 dark:bg-green-950/30"
                        }`}
                    >
                        <h2 className="text-sm font-semibold">
                            {riskTone === "red" ? "🔴 Risque élevé" : riskTone === "orange" ? "🟠 Sous tension" : "🟢 Sain"}
                        </h2>
                        <p className="mt-1 text-sm">
                            Allocation {Math.round(totalAllocationPct)}% · {alerts.length} alerte(s) ouverte(s) · IPI {ipi != null ? ipi.toFixed(1) : "—"}/10
                            {String((summary as { risk_level?: string }).risk_level ?? "").trim()
                                ? ` · Niveau de risque : ${String((summary as { risk_level?: string }).risk_level)}`
                                : ""}
                        </p>
                    </section>

                    <section className="rounded-xl border border-secondary bg-primary p-4">
                        <h2 className="mb-2 text-sm font-semibold">Contact & capacité</h2>
                        <dl className="grid gap-2 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-xs font-medium text-tertiary">Ville / pays</dt>
                                <dd className="mt-0.5">
                                    {[String(profile.city ?? "").trim(), String(profile.country ?? "").trim()].filter(Boolean).join(" · ") || "—"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-tertiary">Téléphone</dt>
                                <dd className="mt-0.5">{String(profile.phone ?? "").trim() || "—"}</dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-xs font-medium text-tertiary">Adresse</dt>
                                <dd className="mt-0.5">{String(profile.address ?? "").trim() || "—"}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-tertiary">Capacité (h / semaine)</dt>
                                <dd className="mt-0.5 tabular-nums">
                                    {Number.isFinite(Number(capacity.capacity_hours_per_week))
                                        ? String(capacity.capacity_hours_per_week)
                                        : "—"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-tertiary">Jours de congé restants</dt>
                                <dd className="mt-0.5 tabular-nums">
                                    {capacity.vacation_days_remaining == null ? "—" : String(capacity.vacation_days_remaining)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-tertiary">Rémunération (réf.)</dt>
                                <dd className="mt-0.5 tabular-nums">
                                    {(() => {
                                        const sal = (detail.data?.employment as { salary?: number } | undefined)?.salary;
                                        return sal != null && Number.isFinite(sal)
                                            ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(sal)
                                            : "—";
                                    })()}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <section className="rounded-xl border border-secondary bg-primary p-4">
                        <h2 className="mb-2 text-sm font-semibold">Alertes actives ({alerts.length})</h2>
                        {alerts.length === 0 ? <p className="text-sm text-tertiary">Aucune alerte active.</p> : null}
                        <div className="space-y-2">
                            {alerts.map((a) => (
                                <div key={a.id} className="flex items-center justify-between rounded-lg border border-secondary p-3">
                                    <div>
                                        <p className="text-sm font-medium">{a.message || a.title || "Alerte"}</p>
                                        <p className="text-xs text-tertiary">
                                            {(a.severity || "low").toUpperCase()} · {a.risk_type || a.category || "risque"} ·{" "}
                                            {a.detected_at ? new Date(a.detected_at).toLocaleString("fr-FR") : "date inconnue"}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className="rounded-md border border-secondary px-2 py-1 text-xs hover:bg-secondary_subtle disabled:opacity-60"
                                        disabled={!a.id || resolveAlert.isPending}
                                        onClick={() =>
                                            resolveAlert.mutate(
                                                { id: a.id, body: { action: "resolve" } },
                                                {
                                                    onSuccess: async () => {
                                                        push("Alerte résolue.", "success");
                                                        await qc.invalidateQueries({ queryKey: ["talent-detail", talentId] });
                                                        await qc.invalidateQueries({ queryKey: ["team"] });
                                                    },
                                                    onError: () => push("Impossible de résoudre l’alerte.", "error"),
                                                },
                                            )
                                        }
                                    >
                                        Résoudre
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-xl border border-secondary bg-primary p-4">
                        <h2 className="mb-2 text-sm font-semibold">Projets actifs ({projects.length})</h2>
                        <div className="-mx-1 overflow-x-auto">
                        <div className="min-w-[min(100%,22rem)] space-y-2">
                            {projects.map((assignment, index) => (
                                <Link
                                    key={`${assignment.project_id}-${index}`}
                                    to={managerProjectsOpenModalPath(assignment.project_id)}
                                    className="flex items-center justify-between rounded-lg border border-secondary p-3 transition-colors hover:bg-secondary_subtle/30"
                                >
                                    <div>
                                        <p className="font-medium">{assignment.project_name ?? assignment.project_id}</p>
                                        <p className="text-xs text-tertiary">{assignment.role_on_project ?? "Membre"}</p>
                                    </div>
                                    <div className="text-sm font-medium tabular-nums">{assignment.allocation_pct}%</div>
                                </Link>
                            ))}
                            {projects.length === 0 ? <p className="text-sm text-tertiary">Aucun projet actif.</p> : null}
                        </div>
                        </div>
                    </section>

                    <div className="grid gap-4 md:grid-cols-2">
                        <section className="rounded-xl border border-secondary bg-primary p-4">
                            <h2 className="mb-2 text-sm font-semibold">Compétences</h2>
                            <div className="space-y-2">
                                {skills.map((skill, index) => (
                                    <div key={`${skill.skill_id ?? skill.skill_name ?? index}`} className="flex items-center justify-between rounded-lg border border-secondary p-2">
                                        <div className="min-w-0">
                                            <span className="text-sm">{skill.skill_name ?? skill.skill_id ?? "Compétence"}</span>
                                            {skill.skill_type ? (
                                                <span className="ml-2 text-[10px] uppercase text-tertiary">({String(skill.skill_type)})</span>
                                            ) : null}
                                        </div>
                                        <SkillLevel level={skill.level ?? 0} />
                                    </div>
                                ))}
                                {skills.length === 0 ? <p className="text-sm text-tertiary">Aucune compétence remontée.</p> : null}
                            </div>
                        </section>

                        <section className="rounded-xl border border-secondary bg-primary p-4">
                            <h2 className="mb-2 text-sm font-semibold">Analyse IA</h2>
                            <div className="space-y-2 text-sm">
                                <p className="flex items-center justify-between"><span className="text-tertiary">9-box</span><span className="font-medium">{nineBox}</span></p>
                                <p className="flex items-center justify-between"><span className="text-tertiary">IPI</span><span className="font-medium">{ipi != null ? `${ipi.toFixed(1)}/10` : "—"}</span></p>
                                <p className="flex items-center justify-between"><span className="text-tertiary">Bande IPI</span><span className="font-medium">{ipiBand}</span></p>
                                <p className="flex items-center justify-between"><span className="text-tertiary">Mobilité</span><span className="font-medium">{String(mobility)}</span></p>
                            </div>
                        </section>
                    </div>

                    <section className="rounded-xl border border-secondary bg-primary p-4">
                        <h2 className="mb-2 text-sm font-semibold">Absences récentes (90 j)</h2>
                        {recentAbsences.length === 0 ? (
                            <p className="text-sm text-tertiary">Aucune absence enregistrée.</p>
                        ) : (
                            <div className="space-y-2">
                                {recentAbsences.map((abs, index) => (
                                    <div key={`${abs.id ?? index}`} className="rounded-lg border border-secondary p-2 text-sm">
                                        {(abs.start_date || "—").toString()} → {(abs.end_date || "—").toString()} ·{" "}
                                        {String(abs.absence_type ?? "absence")}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="rounded-xl border border-secondary bg-primary p-4">
                        <h2 className="mb-2 text-sm font-semibold">Actions manager</h2>
                        <div className="flex flex-wrap gap-2">
                            <button
                                className="rounded-md border border-secondary px-3 py-2 text-xs hover:bg-secondary_subtle disabled:opacity-60"
                                disabled={watchdogScan.isPending}
                                onClick={onScan}
                            >
                                📊 Lancer scan Watchdog
                            </button>
                            <Link
                                to="/workspace/manager/projects"
                                className="rounded-md border border-secondary px-3 py-2 text-xs hover:bg-secondary_subtle"
                            >
                                💬 Demander au Copilot
                            </Link>
                        </div>
                    </section>

                    <section className="rounded-xl border border-secondary bg-primary p-4">
                        <h2 className="mb-2 text-sm font-semibold">Historique projets (12 derniers mois)</h2>
                        <div className="space-y-2">
                            {projects.slice(0, 6).map((assignment, index) => (
                                <div key={`${assignment.project_id}-${index}-history`} className="rounded-lg border border-secondary p-2 text-sm">
                                    {(assignment.end_date || assignment.start_date || "Periode inconnue").toString()} ·{" "}
                                    {String(assignment.project_name ?? assignment.project_id ?? "Projet inconnu")} · {assignment.role_on_project || "Role non precise"}
                                </div>
                            ))}
                            {projects.length === 0 ? <p className="text-sm text-tertiary">Historique indisponible pour ce talent.</p> : null}
                        </div>
                    </section>
                </div>
            ) : null}
        </WorkspacePageShell>
    );
}

function SkillLevel({ level }: { level: number | string }) {
    const n = typeof level === "number" ? Math.max(0, Math.min(5, Math.round(level))) : 0;
    return (
        <div className="flex gap-0.5" aria-label={`Niveau ${n}/5`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={`inline-block h-2 w-2 rounded-full ${i <= n ? "bg-brand-secondary" : "bg-secondary"}`} />
            ))}
        </div>
    );
}
