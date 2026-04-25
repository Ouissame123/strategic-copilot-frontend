import { useMemo, useState } from "react";
import { Link, Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import { Edit01, Plus, Trash01 } from "@untitledui/icons";
import { Heading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Table, TableCard } from "@/components/application/table/table";
import { Input } from "@/components/base/input/input";
import { Button } from "@/components/base/buttons/button";
import { Select } from "@/components/base/select/select";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { TalentMatchingPanel } from "@/components/project/talent-matching-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AnalysisRefreshPanel } from "@/features/crud-common/analysis-refresh-panel";
import { useAssignments, useCreateAssignment, useDeleteAssignment } from "@/hooks/crud/assignments";
import { useProjects } from "@/hooks/crud/projects";
import { queryClient } from "@/providers/query-client-provider";
import { queryKeys } from "@/lib/query-keys";
import { useCreateSkill, useDeleteSkill, useSkills, useUpdateSkill } from "@/hooks/crud/skills";
import { useCreateTalent, useDeleteTalent, useTalents, useUpdateTalent } from "@/hooks/crud/talents";
import { useCreateTalentSkill, useDeleteTalentSkill, useTalentSkills } from "@/hooks/crud/talentSkills";
import { useToast } from "@/providers/toast-provider";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";
import { useTalentMatching } from "@/hooks/use-talent-matching";
import { useTalentsWebhookList } from "@/hooks/use-talents-webhook-list";
import { toUserMessage } from "@/hooks/crud/error-message";
import { ApiError } from "@/utils/apiClient";
import { postRhTrainingPlan } from "@/api/rh-actions.api";
import type { AnalysisRefreshPayload, Skill, Talent } from "@/types/crud-domain";

/** Affichage lisible d’un UUID manager (nom absent côté API). */
function formatManagerRef(id: string | null | undefined): { display: string; title?: string } {
    if (!id?.trim()) return { display: "—" };
    const t = id.trim();
    if (t.length <= 16) return { display: t, title: t };
    return { display: `${t.slice(0, 8)}…${t.slice(-4)}`, title: t };
}

function toLabel(v: unknown, fallback = "—"): string {
    if (v == null) return fallback;
    const t = String(v).trim();
    if (!t || t.toLowerCase() === "null") return fallback;
    return t;
}

/** Clés déjà affichées en colonnes dédiées — le reste est exposé dans « autres_champs ». */
const TALENTS_WEBHOOK_DISPLAY_KEYS = new Set([
    "id",
    "talent_id",
    "name",
    "email",
    "role",
    "contract_type",
    "city",
    "country",
    "capacity_hours_per_week",
    "manager_id",
    "skills_count",
]);

function extraTalentWebhookFields(row: Record<string, unknown>): string {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
        if (!TALENTS_WEBHOOK_DISPLAY_KEYS.has(k)) o[k] = v;
    }
    return Object.keys(o).length > 0 ? JSON.stringify(o) : "—";
}

/** Message RH lisible tout en conservant le détail renvoyé par l’API (ex. 500). Les erreurs déjà formatées (string) sont affichées telles quelles. */
function formatRhMutationError(actionLabel: string, err: unknown): string {
    if (typeof err === "string" && err.trim()) {
        return `${actionLabel} ${err.trim()}`;
    }
    const detail = toUserMessage(err);
    if (err instanceof ApiError && err.status === 500) {
        return `${actionLabel} Le serveur a renvoyé une erreur : ${detail}. Réessayez plus tard ou contactez l’équipe technique si le problème persiste.`;
    }
    return `${actionLabel} ${detail}`;
}

export function RhTalentWorkspaceLayout() {
    const { t } = useTranslation("common");
    const tabs = useMemo(
        () => [
            { href: "/workspace/rh/talent", label: t("workspace.tabOverview"), end: true },
            { href: "/workspace/rh/talent/profiles", label: t("workspace.tabProfiles") },
            { href: "/workspace/rh/talent/gaps", label: t("workspace.tabGaps") },
            { href: "/workspace/rh/talent/staffing", label: t("workspace.tabStaffing") },
        ],
        [t],
    );

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow={t("workspace.rhTalentEyebrow")}
            title={t("workspace.rhTalentTitle")}
            description={t("workspace.rhTalentDesc")}
            tabs={tabs}
        >
            <Outlet />
        </WorkspacePageShell>
    );
}

export function RhTalentOverviewTab() {
    const { t } = useTranslation(["common", "dataCrud"]);
    const paths = useWorkspacePaths();
    const { push } = useToast();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [trainingPlanLoading, setTrainingPlanLoading] = useState(false);
    const { projects: crudProjects, loading: projectsCrudLoading } = useProjects();
    const { assignments: crudAssignments, loading: assignmentsCrudLoading } = useAssignments();
    const {
        items: talentsList,
        total: talentsTotal,
        loading: talentsLoading,
        error: talentsError,
        refresh: refreshTalents,
    } = useTalentsWebhookList();
    const envPid = (import.meta.env as Record<string, string | undefined>).VITE_RH_TALENT_OVERVIEW_PROJECT_ID?.trim() ?? "";
    const [draft, setDraft] = useState(envPid);
    const [activeProjectId, setActiveProjectId] = useState(envPid);
    const { data: talentMatching, error: talentMatchingError, isLoading: matchingLoading, retry: retryMatching } =
        useTalentMatching(activeProjectId || undefined);
    useCopilotPage("staffing", t("workspace.rhTalentTitle"));

    const talentsTableItems = useMemo(
        () => talentsList.map((r) => ({ ...r, id: r.talent_id })),
        [talentsList],
    );

    const projectsWithoutAssignment = useMemo(() => {
        const staffed = new Set(crudAssignments.map((a) => String(a.project_id ?? "")));
        return crudProjects.filter((p) => String(p.id ?? "").trim() && !staffed.has(p.id));
    }, [crudProjects, crudAssignments]);

    const loadMatching = () => {
        const p = draft.trim();
        if (!p) {
            push("Saisissez un identifiant de projet (UUID).", "neutral");
            return;
        }
        setActiveProjectId(p);
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                    <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Validation</p>
                    <p className="mt-2 text-sm text-secondary">File de validation : pas d’endpoint dédié pour l’instant.</p>
                    <Button color="primary" size="sm" className="mt-4" onClick={() => setConfirmOpen(true)}>
                        Valider la file
                    </Button>
                </div>
                <div className="rounded-2xl border border-warning-primary/25 border-l-[3px] border-l-[#EF9F27] bg-warning-primary/[0.06] p-5 shadow-xs ring-1 ring-warning-primary/15 dark:bg-warning-primary/[0.08]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Alertes</p>
                    <p className="mt-2 text-sm text-secondary">Alertes RH : pas d’endpoint dédié pour l’instant.</p>
                    <Button color="secondary" size="sm" className="mt-4" onClick={() => push(t("workspace.actionSimulated"), "success")}>
                        Marquer comme vu
                    </Button>
                </div>
            </div>

            <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Couverture staffing</p>
                <p className="mt-1 text-sm text-secondary">
                    Projets référencés dans le CRUD sans moindre affectation enregistrée — signal à traiter côté RH (données brutes).
                </p>
                {projectsCrudLoading || assignmentsCrudLoading ? (
                    <div className="mt-4 flex min-h-24 items-center justify-center">
                        <LoadingIndicator type="line-simple" size="md" label={t("dataCrud:loading")} />
                    </div>
                ) : projectsWithoutAssignment.length === 0 ? (
                    <p className="mt-4 text-sm text-tertiary">Aucun projet sans affectation détecté dans les listes chargées.</p>
                ) : (
                    <ul className="mt-4 divide-y divide-secondary">
                        {projectsWithoutAssignment.map((p) => (
                            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                                <span className="font-medium text-primary">{toLabel(p.name, p.id)}</span>
                                <Link
                                    to={paths.project(p.id)}
                                    className="text-sm font-semibold text-brand-secondary underline"
                                >
                                    Ouvrir la fiche
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Plan de formation</p>
                <p className="mt-1 text-sm text-secondary">
                    Déclenche le workflow serveur configuré pour la création de plan (POST — corps minimal).
                </p>
                <Button
                    color="primary"
                    size="sm"
                    className="mt-4"
                    isLoading={trainingPlanLoading}
                    onClick={async () => {
                        setTrainingPlanLoading(true);
                        try {
                            await postRhTrainingPlan({});
                            push(t("workspace.saved"), "success");
                        } catch (e) {
                            push(formatRhMutationError("Impossible de lancer le plan de formation.", e), "neutral");
                        } finally {
                            setTrainingPlanLoading(false);
                        }
                    }}
                >
                    Créer un plan de formation
                </Button>
            </div>

            <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">WF_Talent_Matching</p>
                <p className="mt-1 text-sm text-secondary">
                    Analyse d’adéquation talents / projet : scores, disponibilité, actions RH (réponse n8n, sans recalcul ici).
                </p>
                <div className="mt-4 flex min-w-0 flex-row flex-wrap items-end gap-3">
                    <div className="min-w-[12rem] flex-1">
                        <Input
                            label="Identifiant projet"
                            value={draft}
                            onChange={setDraft}
                            placeholder="ex. 2af4d59f-4610-5ad9-80a7-b8a875a80474"
                        />
                    </div>
                    <Button
                        color="primary"
                        size="sm"
                        className="shrink-0 whitespace-nowrap"
                        onClick={loadMatching}
                        isLoading={matchingLoading && Boolean(activeProjectId)}
                    >
                        Charger l’analyse
                    </Button>
                </div>
                {!activeProjectId ? (
                    <p className="mt-4 text-xs text-quaternary">
                        Indiquez un <span className="font-mono">project_id</span> puis « Charger ». Optionnel : variable{" "}
                        <span className="font-mono">VITE_RH_TALENT_OVERVIEW_PROJECT_ID</span> pour préremplir et lancer au
                        chargement.
                    </p>
                ) : matchingLoading ? (
                    <div className="mt-6 flex min-h-32 items-center justify-center">
                        <LoadingIndicator type="line-simple" size="md" label="Chargement du matching…" />
                    </div>
                ) : (
                    <div className="mt-6 space-y-4">
                        <TalentMatchingPanel variant="rh" data={talentMatching} error={talentMatchingError} />
                        {(talentMatchingError || talentMatching) && (
                            <Button color="secondary" size="sm" onClick={() => void retryMatching()}>
                                Réessayer le matching
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <TableCard.Root size="md">
                <TableCard.Header
                    title="Liste des talents"
                    description={`Données workflow n8n (profil, compétences). ${talentsTotal > 0 ? `${talentsTotal} profil(s).` : ""}`}
                    contentTrailing={
                        <Button color="secondary" size="sm" onClick={() => void refreshTalents()} isLoading={talentsLoading}>
                            {t("dataCrud:retry")}
                        </Button>
                    }
                />
                {talentsLoading ? (
                    <div className="flex min-h-40 items-center justify-center bg-primary p-8">
                        <LoadingIndicator type="line-simple" size="md" label={t("dataCrud:loading")} />
                    </div>
                ) : talentsError ? (
                    <div className="bg-primary px-4 py-10 md:px-6">
                        <EmptyState size="md">
                            <EmptyState.Content>
                                <EmptyState.Title>{t("dataCrud:errorLoad")}</EmptyState.Title>
                                <EmptyState.Description>{talentsError}</EmptyState.Description>
                            </EmptyState.Content>
                            <EmptyState.Footer>
                                <Button color="secondary" onClick={() => void refreshTalents()}>
                                    {t("dataCrud:retry")}
                                </Button>
                            </EmptyState.Footer>
                        </EmptyState>
                    </div>
                ) : talentsTableItems.length === 0 ? (
                    <div className="bg-primary px-4 py-10 md:px-6">
                        <EmptyState size="md">
                            <EmptyState.Content>
                                <EmptyState.Title>{t("dataCrud:empty")}</EmptyState.Title>
                            </EmptyState.Content>
                        </EmptyState>
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto">
                        <Table aria-label="Liste des talents (workflow)" className="min-w-[1280px] [&_td]:align-top">
                            <Table.Header className="sticky top-0 z-10 bg-primary">
                                <Table.Head id="talent_id" label="talent_id" />
                                <Table.Head id="name" label="Nom" />
                                <Table.Head id="email" label="Email" />
                                <Table.Head id="role" label="Rôle" />
                                <Table.Head id="contract" label="Contrat" />
                                <Table.Head id="city" label="Ville" />
                                <Table.Head id="country" label="Pays" />
                                <Table.Head id="cap" label="h/sem" />
                                <Table.Head id="skills" label="Nb. comp." />
                                <Table.Head id="mgr" label="Manager (réf.)" />
                                <Table.Head id="extra" label="autres_champs" />
                            </Table.Header>
                            <Table.Body items={talentsTableItems}>
                                {(row) => {
                                    const mgr = formatManagerRef(row.manager_id as string | null | undefined);
                                    return (
                                        <Table.Row id={row.id}>
                                            <Table.Cell className="min-w-[140px] max-w-[220px] font-mono text-xs text-tertiary">
                                                {toLabel(row.talent_id)}
                                            </Table.Cell>
                                            <Table.Cell className="min-w-[140px] max-w-[220px]">
                                                <span className="font-medium text-primary">{toLabel(row.name)}</span>
                                            </Table.Cell>
                                            <Table.Cell className="min-w-[200px] max-w-[280px]">
                                                {row.email ? (
                                                    <span className="break-words text-sm leading-snug text-primary">{row.email}</span>
                                                ) : (
                                                    "—"
                                                )}
                                            </Table.Cell>
                                            <Table.Cell className="min-w-[100px] max-w-[160px] whitespace-normal break-words text-sm">
                                                {row.role ?? "—"}
                                            </Table.Cell>
                                            <Table.Cell className="whitespace-nowrap">{row.contract_type ?? "—"}</Table.Cell>
                                            <Table.Cell className="min-w-[80px] max-w-[120px] whitespace-normal break-words text-sm">
                                                {row.city ?? "—"}
                                            </Table.Cell>
                                            <Table.Cell className="min-w-[90px] whitespace-normal break-words text-sm">
                                                {row.country ?? "—"}
                                            </Table.Cell>
                                            <Table.Cell className="whitespace-nowrap tabular-nums">
                                                {row.capacity_hours_per_week ?? "—"}
                                            </Table.Cell>
                                            <Table.Cell className="whitespace-nowrap text-center tabular-nums">{row.skills_count}</Table.Cell>
                                            <Table.Cell className="min-w-[120px] max-w-[200px]">
                                                <span
                                                    className="inline-block font-mono text-xs leading-snug text-tertiary"
                                                    title={mgr.title}
                                                >
                                                    {mgr.display}
                                                </span>
                                            </Table.Cell>
                                            <Table.Cell className="max-w-[min(24rem,30vw)] whitespace-pre-wrap break-words font-mono text-[11px] text-tertiary">
                                                {extraTalentWebhookFields(row as Record<string, unknown>)}
                                            </Table.Cell>
                                        </Table.Row>
                                    );
                                }}
                            </Table.Body>
                        </Table>
                    </div>
                )}
            </TableCard.Root>

            <ConfirmDialog
                isOpen={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Validation groupée"
                body={t("workspace.confirmSensitive")}
                confirmLabel="Confirmer"
                cancelLabel="Annuler"
                onConfirm={() => push(t("workspace.saved"), "success")}
            />
        </div>
    );
}

export function RhTalentProfilesTab() {
    const { t } = useTranslation(["common", "dataCrud"]);
    const { push } = useToast();
    useCopilotPage("none", t("workspace.rhProfilesTitle"));
    const { talents, loading, error, refresh } = useTalents();
    const {
        items: talentCards,
        meta: cardsMeta,
        raw: cardsRaw,
        loading: cardsLoading,
        error: cardsError,
        refresh: refreshCards,
    } = useTalentsWebhookList();
    const { create, loading: creating } = useCreateTalent();
    const { update, loading: updating } = useUpdateTalent();
    const { remove, loading: deleting } = useDeleteTalent();
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Talent | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Talent | null>(null);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("");
    const [status, setStatus] = useState("");
    const [analysisRefresh, setAnalysisRefresh] = useState<AnalysisRefreshPayload | null>(null);
    const editableTalentIds = useMemo(() => new Set(talents.map((tTalent) => tTalent.id)), [talents]);

    const openCreate = () => {
        setEditing(null);
        setFullName("");
        setEmail("");
        setRole("");
        setStatus("");
        setFormOpen(true);
    };

    const openEdit = (talent: Talent) => {
        setEditing(talent);
        setFullName(String(talent.full_name ?? talent.name ?? ""));
        setEmail(String(talent.email ?? ""));
        setRole(String(talent.role ?? ""));
        setStatus(String(talent.status ?? ""));
        setFormOpen(true);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName.trim() && !email.trim()) {
            push("Nom complet ou email requis.", "neutral");
            return;
        }
        try {
            if (editing) {
                const res = await update(editing.id, {
                    full_name: fullName.trim() || null,
                    email: email.trim() || null,
                    role: role.trim() || null,
                    status: status.trim() || null,
                });
                setAnalysisRefresh(res.analysisRefresh ?? null);
                push(res.message ?? t("dataCrud:save"), "success");
            } else {
                const res = await create({
                    full_name: fullName.trim() || null,
                    email: email.trim() || null,
                    role: role.trim() || null,
                    status: status.trim() || null,
                });
                setAnalysisRefresh(res.analysisRefresh ?? null);
                push(res.message ?? t("dataCrud:createdSuccess"), "success");
            }
            setFormOpen(false);
            await Promise.all([refresh(), refreshCards()]);
        } catch (e) {
            push(`Modification impossible: ${toLabel((e as Error | undefined)?.message, "vérifiez le backend talents.")}`, "error");
        }
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        try {
            const res = await remove(pendingDelete.id);
            setAnalysisRefresh(res.analysisRefresh ?? null);
            push(res.message ?? t("dataCrud:deletedSuccess"), "success");
            setPendingDelete(null);
            await Promise.all([refresh(), refreshCards()]);
        } catch (e) {
            push(`Suppression impossible: ${toLabel((e as Error | undefined)?.message, "vérifiez le backend talents.")}`, "error");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button size="sm" color="primary" iconLeading={Plus} onClick={openCreate}>
                    {t("dataCrud:newTalent")}
                </Button>
            </div>
            {analysisRefresh ? <AnalysisRefreshPanel payload={analysisRefresh} /> : null}
            {Object.keys(cardsMeta).length > 0 ? (
                <div className="rounded-2xl border border-secondary bg-secondary/30 p-4 shadow-xs ring-1 ring-secondary/80 dark:bg-secondary/20">
                    <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Métadonnées réponse (technique)</p>
                    <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-primary/80 p-3 font-mono text-xs leading-relaxed text-secondary ring-1 ring-secondary/60 dark:bg-primary_alt/40">
                        {JSON.stringify(cardsMeta, null, 2)}
                    </pre>
                </div>
            ) : null}
            {cardsRaw != null ? (
                <details className="rounded-2xl border border-secondary bg-primary p-4 text-sm shadow-xs ring-1 ring-secondary/80">
                    <summary className="cursor-pointer font-medium text-secondary">JSON brut (API talents)</summary>
                    <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-tertiary">
                        {JSON.stringify(cardsRaw, null, 2)}
                    </pre>
                </details>
            ) : null}
            <TableCard.Root size="md">
                <TableCard.Header
                    title={t("workspace.rhProfilesTitle")}
                    description="Vue RH des profils : identité, rôle, localisation, contrat et rattachement."
                />
                {cardsLoading ? (
                    <div className="flex min-h-40 items-center justify-center bg-primary p-8">
                        <LoadingIndicator type="line-simple" size="md" label={t("dataCrud:loading")} />
                    </div>
                ) : cardsError ? (
                    <div className="bg-primary px-4 py-10 md:px-6">
                        <EmptyState size="md">
                            <EmptyState.Content>
                                <EmptyState.Title>{t("dataCrud:errorLoad")}</EmptyState.Title>
                                <EmptyState.Description>{cardsError}</EmptyState.Description>
                            </EmptyState.Content>
                            <EmptyState.Footer>
                                <Button color="secondary" onClick={() => void refreshCards()}>
                                    {t("dataCrud:retry")}
                                </Button>
                            </EmptyState.Footer>
                        </EmptyState>
                    </div>
                ) : talentCards.length === 0 ? (
                    <div className="bg-primary px-4 py-10 md:px-6">
                        <EmptyState size="md">
                            <EmptyState.Content>
                                <EmptyState.Title>{t("dataCrud:empty")}</EmptyState.Title>
                            </EmptyState.Content>
                        </EmptyState>
                    </div>
                ) : (
                    <Table aria-label={t("workspace.rhProfilesTitle")} className="min-w-[1100px]">
                        <Table.Header className="sticky top-0 z-10">
                            <Table.Head id="talent_id" label="talent_id" />
                            <Table.Head id="name" label="Talent" />
                            <Table.Head id="email" label={t("dataCrud:email")} />
                            <Table.Head id="role" label={t("dataCrud:role")} />
                            <Table.Head id="location" label="Localisation" />
                            <Table.Head id="contract" label="Contrat" />
                            <Table.Head id="skills" label="Compétences" />
                            <Table.Head id="manager" label="Manager" />
                            <Table.Head id="extra" label="autres_champs" />
                            <Table.Head id="actions" label="Actions" />
                        </Table.Header>
                        <Table.Body items={talentCards.map((x) => ({ ...x, id: x.talent_id }))}>
                            {(row) => (
                                <Table.Row id={row.id}>
                                    <Table.Cell className="min-w-[130px] font-mono text-xs text-tertiary">{toLabel(row.talent_id)}</Table.Cell>
                                    <Table.Cell className="min-w-[150px]">
                                        <span className="font-medium text-primary">{toLabel(row.name)}</span>
                                    </Table.Cell>
                                    <Table.Cell className="min-w-[220px] break-words">{toLabel(row.email)}</Table.Cell>
                                    <Table.Cell>{toLabel(row.role)}</Table.Cell>
                                    <Table.Cell>{`${toLabel(row.city)}${row.city || row.country ? " / " : ""}${toLabel(row.country)}`.replace("— / —", "—")}</Table.Cell>
                                    <Table.Cell>{toLabel(row.contract_type)}</Table.Cell>
                                    <Table.Cell className="text-center tabular-nums">{toLabel(row.skills_count)}</Table.Cell>
                                    <Table.Cell>
                                        <span className="font-mono text-xs text-tertiary" title={row.manager_id ?? undefined}>
                                            {formatManagerRef(row.manager_id as string | null | undefined).display}
                                        </span>
                                    </Table.Cell>
                                    <Table.Cell className="max-w-[min(24rem,30vw)] whitespace-pre-wrap break-words font-mono text-[11px] text-tertiary">
                                        {extraTalentWebhookFields(row as Record<string, unknown>)}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div className="flex items-center gap-2">
                                            {(() => {
                                                const canMutate = editableTalentIds.has(String(row.talent_id));
                                                return (
                                                    <>
                                            <Button
                                                size="sm"
                                                color="secondary"
                                                iconLeading={Edit01}
                                                isDisabled={!canMutate}
                                                onClick={() =>
                                                    canMutate
                                                        ? openEdit(
                                                              (talents.find((tTalent) => tTalent.id === row.talent_id) as Talent | undefined) ??
                                                                  ({ id: row.talent_id, full_name: row.name, email: row.email, role: row.role } as Talent),
                                                          )
                                                        : push("Modification indisponible: ce profil n'est pas exposé par l'API CRUD talents.", "neutral")
                                                }
                                            >
                                                {t("dataCrud:edit")}
                                            </Button>
                                            <Button
                                                size="sm"
                                                color="tertiary"
                                                iconLeading={Trash01}
                                                isDisabled={!canMutate}
                                                onClick={() =>
                                                    canMutate
                                                        ? setPendingDelete(
                                                              (talents.find((tTalent) => tTalent.id === row.talent_id) as Talent | undefined) ??
                                                                  ({ id: row.talent_id, full_name: row.name } as Talent),
                                                          )
                                                        : push("Suppression indisponible: ce profil n'est pas exposé par l'API CRUD talents.", "neutral")
                                                }
                                            >
                                                {t("dataCrud:delete")}
                                            </Button>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            )}
                        </Table.Body>
                    </Table>
                )}
            </TableCard.Root>

            <ModalOverlay isOpen={formOpen} onOpenChange={setFormOpen} isDismissable>
                <Modal>
                    <Dialog className="w-full max-w-xl p-4 sm:p-6">
                        <form className="w-full rounded-2xl border border-secondary bg-primary p-6 shadow-xl ring-1 ring-secondary/80" onSubmit={submit}>
                            <Heading slot="title" className="text-lg font-semibold text-primary">
                                {editing ? t("dataCrud:edit") : t("dataCrud:newTalent")}
                            </Heading>
                            <div className="mt-6 space-y-4">
                                <Input label={t("dataCrud:fullName")} value={fullName} onChange={setFullName} />
                                <Input label={t("dataCrud:email")} value={email} onChange={setEmail} />
                                <Input label={t("dataCrud:role")} value={role} onChange={setRole} />
                                <Input label={t("dataCrud:status")} value={status} onChange={setStatus} />
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <Button type="button" color="secondary" onClick={() => setFormOpen(false)}>
                                    {t("dataCrud:cancel")}
                                </Button>
                                <Button type="submit" color="primary" isLoading={creating || updating}>
                                    {editing ? t("dataCrud:save") : t("dataCrud:create")}
                                </Button>
                            </div>
                        </form>
                    </Dialog>
                </Modal>
            </ModalOverlay>

            <ConfirmDialog
                isOpen={pendingDelete != null}
                onOpenChange={(open) => !open && setPendingDelete(null)}
                title={t("dataCrud:confirmDeleteTitle")}
                body={t("dataCrud:confirmDeleteBody")}
                confirmLabel={t("dataCrud:delete")}
                cancelLabel={t("dataCrud:cancel")}
                onConfirm={confirmDelete}
                isConfirmLoading={deleting}
            />
            {loading || error ? (
                <p className="text-xs text-quaternary">Note: certaines actions CRUD peuvent être indisponibles si l’API profils répond en erreur.</p>
            ) : null}
        </div>
    );
}

export function RhTalentGapsTab() {
    const { t } = useTranslation(["common", "dataCrud"]);
    useCopilotPage("none", t("workspace.rhGapsTitle"));
    const { push } = useToast();
    const { skills, loading, error, refresh } = useSkills();
    const { talentSkills } = useTalentSkills();
    const { create, loading: creating } = useCreateSkill();
    const { update, loading: updating } = useUpdateSkill();
    const { remove, loading: deleting } = useDeleteSkill();
    const [editing, setEditing] = useState<Skill | null>(null);
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");

    const invalidateTalentWorkspace = () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.talent.workspace() });
    };

    const save = async () => {
        if (!name.trim()) {
            push("Nom de compétence requis.", "neutral");
            return;
        }
        try {
            if (editing) {
                await update(editing.id, { name: name.trim(), category: category.trim() || null });
                push(t("dataCrud:save"), "success");
            } else {
                await create({ name: name.trim(), category: category.trim() || null });
                push(t("dataCrud:createdSuccess"), "success");
            }
            setEditing(null);
            setName("");
            setCategory("");
            await refresh();
            invalidateTalentWorkspace();
        } catch {
            /* handled by hooks */
        }
    };

    const skillsUsage = useMemo(() => {
        const map = new Map<string, number>();
        for (const link of talentSkills) {
            const key = String(link.skill_id ?? "");
            if (!key) continue;
            map.set(key, (map.get(key) ?? 0) + 1);
        }
        return map;
    }, [talentSkills]);

    return (
        <div className="space-y-4 rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
            <p className="text-sm font-semibold text-primary">{t("workspace.rhGapsTitle")}</p>
            <p className="text-sm text-tertiary">
                Vue compétences et besoins: chaque ligne représente une compétence exploitable pour l’analyse des écarts.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
                <Input label="Compétence" value={name} onChange={setName} />
                <Input label="Catégorie métier" value={category} onChange={setCategory} />
                <div className="flex items-end gap-2">
                    <Button color="primary" size="sm" onClick={save} isLoading={creating || updating}>
                        {editing ? t("dataCrud:save") : t("dataCrud:create")}
                    </Button>
                    {editing ? (
                        <Button
                            color="secondary"
                            size="sm"
                            onClick={() => {
                                setEditing(null);
                                setName("");
                                setCategory("");
                            }}
                        >
                            {t("dataCrud:cancel")}
                        </Button>
                    ) : null}
                </div>
            </div>
            {loading ? (
                <LoadingIndicator type="line-simple" size="md" label={t("dataCrud:loading")} />
            ) : error ? (
                <div className="rounded-lg border border-error-secondary bg-error-primary/10 px-4 py-3 text-sm text-error-primary">
                    Impossible de charger les écarts/compétences: {error}
                </div>
            ) : skills.length === 0 ? (
                <div className="text-sm text-tertiary">Aucune donnée compétence disponible pour l’analyse des écarts.</div>
            ) : (
                <Table aria-label="Compétences et écarts" className="min-w-[720px]">
                    <Table.Header>
                        <Table.Head id="skill" label="Compétence" />
                        <Table.Head id="cat" label="Catégorie" />
                        <Table.Head id="impact" label="Talents liés" />
                        <Table.Head id="actions" label="Actions" />
                    </Table.Header>
                    <Table.Body items={skills}>
                        {(row) => (
                            <Table.Row id={row.id}>
                                <Table.Cell>
                                    <span className="font-medium text-primary">{toLabel(row.name)}</span>
                                </Table.Cell>
                                <Table.Cell>{toLabel(row.category)}</Table.Cell>
                                <Table.Cell className="tabular-nums text-center">{skillsUsage.get(row.id) ?? 0}</Table.Cell>
                                <Table.Cell>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            color="secondary"
                                            iconLeading={Edit01}
                                            onClick={() => {
                                                setEditing(row);
                                                setName(String(row.name ?? ""));
                                                setCategory(String(row.category ?? ""));
                                            }}
                                        >
                                            {t("dataCrud:edit")}
                                        </Button>
                                        <Button
                                            size="sm"
                                            color="tertiary"
                                            iconLeading={Trash01}
                                            isLoading={deleting}
                                            onClick={async () => {
                                                await remove(row.id);
                                                await refresh();
                                                invalidateTalentWorkspace();
                                            }}
                                        >
                                            {t("dataCrud:delete")}
                                        </Button>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table>
            )}
        </div>
    );
}

export function RhTalentStaffingTab() {
    const { t } = useTranslation(["common", "dataCrud"]);
    const { push } = useToast();
    useCopilotPage("staffing", t("workspace.rhStaffingTitle"));
    const { assignments, loading: aLoading, error: assignmentsError, refresh: refreshAssignments } = useAssignments();
    const { projects, loading: projectsLoading } = useProjects();
    const { items: talents, loading: talentsLoading } = useTalentsWebhookList();
    const { skills, loading: skillsLoading } = useSkills();
    const { create: createAssignment, loading: creatingAssignment } = useCreateAssignment();
    const { remove: deleteAssignment, loading: deletingAssignment } = useDeleteAssignment();
    const { talentSkills, loading: tsLoading, error: talentSkillsError, refresh: refreshTalentSkills } = useTalentSkills();
    const { create: createTalentSkill, loading: creatingTalentSkill } = useCreateTalentSkill();
    const { remove: deleteTalentSkill, loading: deletingTalentSkill } = useDeleteTalentSkill();
    const [projectId, setProjectId] = useState("");
    const [talentId, setTalentId] = useState("");
    const [role, setRole] = useState("");
    const [skillTalentId, setSkillTalentId] = useState("");
    const [skillId, setSkillId] = useState("");
    const [level, setLevel] = useState("");

    const projectLabelById = useMemo(() => {
        const m = new Map<string, string>();
        for (const p of projects) m.set(p.id, toLabel(p.name, p.id));
        return m;
    }, [projects]);
    const talentLabelById = useMemo(() => {
        const m = new Map<string, string>();
        for (const r of talents) m.set(r.talent_id, toLabel(r.name, r.talent_id));
        return m;
    }, [talents]);
    const skillLabelById = useMemo(() => {
        const m = new Map<string, string>();
        for (const s of skills) m.set(s.id, toLabel(s.name, s.id));
        return m;
    }, [skills]);

    const projectSelectItems = useMemo(
        () =>
            [...projects]
                .map((p) => ({ id: p.id, label: toLabel(p.name, p.id) }))
                .sort((a, b) => a.label.localeCompare(b.label, "fr")),
        [projects],
    );
    /** La liste workflow peut renvoyer plusieurs lignes pour le même talent_id. */
    const talentSelectItems = useMemo(() => {
        const seen = new Set<string>();
        const rows: { id: string; label: string }[] = [];
        for (const tal of talents) {
            const id = String(tal.talent_id ?? "").trim();
            if (!id || seen.has(id)) continue;
            seen.add(id);
            rows.push({ id, label: toLabel(tal.name, tal.talent_id) });
        }
        return rows.sort((a, b) => a.label.localeCompare(b.label, "fr"));
    }, [talents]);
    const skillSelectItems = useMemo(
        () =>
            [...skills]
                .map((s) => ({ id: s.id, label: toLabel(s.name, s.id) }))
                .sort((a, b) => a.label.localeCompare(b.label, "fr")),
        [skills],
    );

    const refSelectHint = (loading: boolean, empty: boolean) => {
        if (loading) return "Chargement de la liste…";
        if (empty) return "Aucune entrée disponible pour le moment.";
        return undefined;
    };

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                <p className="text-sm font-semibold text-primary">{t("dataCrud:listTitleAssignments")}</p>
                <p className="mt-1 text-sm text-tertiary">
                    Affectations projet: afficher les noms métier (projet, talent, rôle), IDs gardés seulement en référence.
                </p>
                {assignmentsError ? (
                    <p className="mt-3 text-sm text-utility-error-700">
                        {formatRhMutationError("Impossible de charger les affectations.", assignmentsError)}
                    </p>
                ) : null}
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <Select
                        label="Projet"
                        placeholder="Sélectionner un projet"
                        selectedKey={projectId || undefined}
                        onSelectionChange={(key) => setProjectId(key != null ? String(key) : "")}
                        items={projectSelectItems}
                        isDisabled={projectsLoading || projectSelectItems.length === 0}
                        hint={refSelectHint(projectsLoading, projectSelectItems.length === 0)}
                        size="sm"
                    >
                        {(item) => <Select.Item {...item} />}
                    </Select>
                    <Select
                        label="Talent"
                        placeholder="Sélectionner un talent"
                        selectedKey={talentId || undefined}
                        onSelectionChange={(key) => setTalentId(key != null ? String(key) : "")}
                        items={talentSelectItems}
                        isDisabled={talentsLoading || talentSelectItems.length === 0}
                        hint={refSelectHint(talentsLoading, talentSelectItems.length === 0)}
                        size="sm"
                    >
                        {(item) => <Select.Item {...item} />}
                    </Select>
                    <Input label={t("dataCrud:role")} value={role} onChange={setRole} placeholder="Ex. développeur, lead…" />
                    <div className="flex items-end">
                        <Button color="primary" size="sm" isLoading={creatingAssignment} onClick={async () => {
                            if (!projectId.trim() || !talentId.trim()) {
                                push("Sélectionnez un projet et un talent.", "neutral");
                                return;
                            }
                            try {
                                await createAssignment({
                                    project_id: projectId.trim(),
                                    talent_id: talentId.trim(),
                                    role: role.trim() || null,
                                });
                                setProjectId("");
                                setTalentId("");
                                setRole("");
                                await refreshAssignments();
                                void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
                                void queryClient.invalidateQueries({ queryKey: queryKeys.talent.workspace() });
                                push(t("workspace.saved"), "success");
                            } catch (e) {
                                push(
                                    formatRhMutationError(
                                        "Impossible d’enregistrer l’affectation.",
                                        e,
                                    ),
                                    "neutral",
                                );
                            }
                        }}>
                            {t("dataCrud:create")}
                        </Button>
                    </div>
                </div>
                {projectsLoading || talentsLoading ? (
                    <p className="mt-3 text-xs text-quaternary">Chargement des référentiels projets/talents…</p>
                ) : null}
                <ul className="mt-4 divide-y divide-secondary">
                    {aLoading ? <li className="py-3 text-sm text-tertiary">{t("dataCrud:loading")}</li> : assignments.map((row) => (
                        <li key={row.id} className="flex items-center justify-between py-3">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-primary">
                                    {toLabel(projectLabelById.get(String(row.project_id ?? "")), "Projet inconnu")}
                                    {" -> "}
                                    {toLabel(talentLabelById.get(String(row.talent_id ?? "")), "Talent inconnu")}
                                </p>
                                <p className="text-xs text-tertiary">
                                    Rôle: {toLabel(row.role)} · Réf: {formatManagerRef(String(row.id)).display}
                                </p>
                            </div>
                            <Button size="sm" color="tertiary" iconLeading={Trash01} isLoading={deletingAssignment} onClick={async () => {
                                try {
                                    await deleteAssignment(row.id);
                                    await refreshAssignments();
                                    void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
                                    void queryClient.invalidateQueries({ queryKey: queryKeys.talent.workspace() });
                                } catch (e) {
                                    push(
                                        formatRhMutationError(
                                            "Impossible de supprimer cette affectation.",
                                            e,
                                        ),
                                        "neutral",
                                    );
                                }
                            }}>
                                {t("dataCrud:delete")}
                            </Button>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                <p className="text-sm font-semibold text-primary">{t("dataCrud:listTitleTalentSkills")}</p>
                <p className="mt-1 text-sm text-tertiary">
                    Liens talents - compétences: privilégier les noms pour la lecture RH.
                </p>
                {talentSkillsError ? (
                    <p className="mt-3 text-sm text-utility-error-700">
                        {formatRhMutationError("Impossible de charger les liaisons talent–compétence.", talentSkillsError)}
                    </p>
                ) : null}
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <Select
                        label="Talent"
                        placeholder="Sélectionner un talent"
                        selectedKey={skillTalentId || undefined}
                        onSelectionChange={(key) => setSkillTalentId(key != null ? String(key) : "")}
                        items={talentSelectItems}
                        isDisabled={talentsLoading || talentSelectItems.length === 0}
                        hint={refSelectHint(talentsLoading, talentSelectItems.length === 0)}
                        size="sm"
                    >
                        {(item) => <Select.Item {...item} />}
                    </Select>
                    <Select
                        label="Compétence"
                        placeholder="Sélectionner une compétence"
                        selectedKey={skillId || undefined}
                        onSelectionChange={(key) => setSkillId(key != null ? String(key) : "")}
                        items={skillSelectItems}
                        isDisabled={skillsLoading || skillSelectItems.length === 0}
                        hint={refSelectHint(skillsLoading, skillSelectItems.length === 0)}
                        size="sm"
                    >
                        {(item) => <Select.Item {...item} />}
                    </Select>
                    <Input label={t("dataCrud:level")} value={level} onChange={setLevel} placeholder="Ex. confirmé, senior…" />
                    <div className="flex items-end">
                        <Button color="primary" size="sm" isLoading={creatingTalentSkill} onClick={async () => {
                            if (!skillTalentId.trim() || !skillId.trim()) {
                                push("Sélectionnez un talent et une compétence.", "neutral");
                                return;
                            }
                            try {
                                await createTalentSkill({
                                    talent_id: skillTalentId.trim(),
                                    skill_id: skillId.trim(),
                                    level: level.trim() || null,
                                });
                                setSkillTalentId("");
                                setSkillId("");
                                setLevel("");
                                await refreshTalentSkills();
                                void queryClient.invalidateQueries({ queryKey: queryKeys.talent.workspace() });
                                push(t("workspace.saved"), "success");
                            } catch (e) {
                                push(
                                    formatRhMutationError(
                                        "Impossible d’enregistrer la liaison talent–compétence.",
                                        e,
                                    ),
                                    "neutral",
                                );
                            }
                        }}>
                            {t("dataCrud:create")}
                        </Button>
                    </div>
                </div>
                {talentsLoading || skillsLoading ? (
                    <p className="mt-3 text-xs text-quaternary">Chargement des référentiels talents/compétences…</p>
                ) : null}
                <ul className="mt-4 divide-y divide-secondary">
                    {tsLoading ? <li className="py-3 text-sm text-tertiary">{t("dataCrud:loading")}</li> : talentSkills.map((row) => (
                        <li key={row.id} className="flex items-center justify-between py-3">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-primary">
                                    {toLabel(talentLabelById.get(String(row.talent_id ?? "")), "Talent inconnu")}
                                    {" -> "}
                                    {toLabel(skillLabelById.get(String(row.skill_id ?? "")), "Compétence inconnue")}
                                </p>
                                <p className="text-xs text-tertiary">Niveau: {toLabel(row.level)}</p>
                            </div>
                            <Button size="sm" color="tertiary" iconLeading={Trash01} isLoading={deletingTalentSkill} onClick={async () => {
                                try {
                                    await deleteTalentSkill(row.id);
                                    await refreshTalentSkills();
                                    void queryClient.invalidateQueries({ queryKey: queryKeys.talent.workspace() });
                                } catch (e) {
                                    push(
                                        formatRhMutationError(
                                            "Impossible de supprimer cette liaison.",
                                            e,
                                        ),
                                        "neutral",
                                    );
                                }
                            }}>
                                {t("dataCrud:delete")}
                            </Button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
