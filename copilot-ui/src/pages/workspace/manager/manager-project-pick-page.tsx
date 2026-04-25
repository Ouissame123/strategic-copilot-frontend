import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
    getManagerProjectDetail,
    getManagerWorkspaceProjects,
    parseManagerWorkspaceProjectsResponse,
} from "@/api/workspace-manager.api";
import type { ProjectDetail } from "@/api/workspace-manager.api";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { ManagerProjectDetailBody } from "@/components/project/manager-project-detail-body";
import { RequestRhActionModal } from "@/components/project/request-rh-action-modal";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { toUserMessage } from "@/hooks/crud/error-message";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { usePostRhActionMutation } from "@/hooks/use-rh-actions-query";
import { useAuth } from "@/providers/auth-provider";
import { useCopilot } from "@/providers/copilot-provider";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";

type DetailState = ProjectDetail | null;

export function ManagerProjectPickPage() {
    const { t } = useTranslation(["common", "nav", "copilot"]);
    const { user } = useAuth();
    const paths = useWorkspacePaths();
    const navigate = useNavigate();
    const { setIsOpen: _setIsOpen } = useCopilot();
    const postRhAction = usePostRhActionMutation();
    useCopilotPage("projects_list", t("nav:managerNavProjectDetail"));

    const [projectId, setProjectId] = useState("");
    const [options, setOptions] = useState<Array<{ id: string; name: string }>>([]);
    const [rawItems, setRawItems] = useState<Record<string, unknown>[]>([]);
    const [load, setLoad] = useState<"idle" | "loading" | "ok" | "err">("idle");
    const [error, setError] = useState<string | null>(null);

    const [detail, setDetail] = useState<DetailState>(null);
    const [detailLoad, setDetailLoad] = useState<"idle" | "loading" | "ok" | "err">("idle");
    const [detailError, setDetailError] = useState<string | null>(null);

    const [rhActionOpen, setRhActionOpen] = useState(false);

    const enterpriseId =
        user?.enterpriseId?.trim() ??
        (import.meta.env.VITE_MANAGER_ENTERPRISE_ID as string | undefined)?.trim() ??
        "";

    // Charge la liste des projets (une fois).
    useEffect(() => {
        let c = false;
        (async () => {
            setLoad("loading");
            setError(null);
            try {
                const raw = await getManagerWorkspaceProjects({
                    page: 1,
                    limit: 200,
                    enterprise_id: enterpriseId,
                });
                const parsed = parseManagerWorkspaceProjectsResponse(raw);
                const opts = parsed.items.map((row, i) => ({
                    id: String(row.id ?? row.project_id ?? `p-${i}`),
                    name: String(row.name ?? row.title ?? row.project_name ?? row.id ?? "—"),
                }));
                if (!c) {
                    setOptions(opts);
                    setRawItems(parsed.items);
                    setLoad("ok");
                    // pré-sélectionne le premier projet pour correspondre à la maquette.
                    if (opts.length > 0 && !projectId) setProjectId(opts[0].id);
                }
            } catch (e) {
                if (!c) {
                    setError(toUserMessage(e));
                    setLoad("err");
                }
            }
        })();
        return () => {
            c = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enterpriseId]);

    // Charge le détail quand un projet est sélectionné.
    useEffect(() => {
        if (!projectId.trim()) {
            setDetail(null);
            setDetailLoad("idle");
            return;
        }
        let c = false;
        (async () => {
            setDetailLoad("loading");
            setDetailError(null);
            try {
                const raw = await getManagerProjectDetail(projectId.trim());
                if (!c) {
                    setDetail(raw);
                    setDetailLoad("ok");
                }
            } catch (e) {
                if (!c) {
                    setDetailError(toUserMessage(e));
                    setDetailLoad("err");
                }
            }
        })();
        return () => {
            c = true;
        };
    }, [enterpriseId, projectId]);

    // Ligne brute du projet sélectionné dans la liste — utilisée comme fallback quand le détail échoue.
    const selectedRow = useMemo(() => {
        if (!projectId.trim()) return null;
        return (
            rawItems.find((row) => {
                const id = String(row.id ?? row.project_id ?? "").trim();
                return id === projectId.trim();
            }) ?? null
        );
    }, [rawItems, projectId]);

    const effectiveDetail = detail;

    const openDetailRoute = () => {
        const id = projectId.trim();
        if (!id) return;
        void navigate(paths.project(id));
    };

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("common:workspace.managerWsEyebrow")}
            title={t("nav:managerNavProjectDetail")}
            description="Sélectionnez un projet pour voir sa fiche complète · santé · talents · risques · décision IA"
        >
            {load === "loading" ? (
                <div className="flex min-h-40 items-center justify-center rounded-2xl border border-secondary bg-primary p-8">
                    <LoadingIndicator type="line-simple" size="md" label={t("common:loading")} />
                </div>
            ) : null}

            {load === "err" ? (
                <div className="rounded-2xl border border-secondary bg-primary p-6">
                    <EmptyState size="md">
                        <EmptyState.Content>
                            <EmptyState.Title>Liste indisponible</EmptyState.Title>
                            <EmptyState.Description>{error}</EmptyState.Description>
                        </EmptyState.Content>
                    </EmptyState>
                </div>
            ) : null}

            {load === "ok" ? (
                <>
                    {/* Picker card */}
                    <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80 md:p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">
                            Choisir un projet à analyser
                        </p>
                        <div className="mt-3 flex flex-wrap items-end gap-3">
                            <div className="min-w-[16rem] flex-1">
                                <NativeSelect
                                    aria-label="Projet"
                                    value={projectId}
                                    onChange={(e) => setProjectId(e.target.value)}
                                    options={[
                                        { label: "— Choisir —", value: "" },
                                        ...options.map((o) => ({ label: o.name, value: o.id })),
                                    ]}
                                />
                            </div>
                            <Button color="secondary" size="md" onClick={openDetailRoute} disabled={!projectId.trim()}>
                                Ouvrir le détail
                            </Button>
                            <Button color="tertiary" size="md" href={paths.projects}>
                                Voir la liste complète
                            </Button>
                        </div>
                    </section>

                    {/* Detail inline */}
                    {detailLoad === "loading" && !effectiveDetail ? (
                        <div className="flex min-h-40 items-center justify-center rounded-2xl border border-secondary bg-primary p-8">
                            <LoadingIndicator type="line-simple" size="md" label="Chargement de la fiche…" />
                        </div>
                    ) : null}

                    {detailLoad === "err" && effectiveDetail ? (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            <span className="font-semibold">Fiche partielle</span> — les détails complets sont
                            indisponibles ({detailError ?? "workflow en erreur"}). Les informations affichées
                            proviennent de la liste projets.
                        </div>
                    ) : null}

                    {detailLoad === "err" && !effectiveDetail ? (
                        <div className="rounded-2xl border border-secondary bg-primary p-6">
                            <EmptyState size="md">
                                <EmptyState.Content>
                                    <EmptyState.Title>Fiche projet indisponible</EmptyState.Title>
                                    <EmptyState.Description>{detailError}</EmptyState.Description>
                                </EmptyState.Content>
                            </EmptyState>
                        </div>
                    ) : null}

                    {effectiveDetail ? (
                        <ManagerProjectDetailBody
                            project={effectiveDetail}
                            onOpenRh={() => setRhActionOpen(true)}
                        />
                    ) : null}

                    <RequestRhActionModal
                        open={rhActionOpen}
                        onOpenChange={setRhActionOpen}
                        projectId={projectId}
                        onSubmit={async (body) => {
                            await postRhAction.mutateAsync(body);
                        }}
                    />
                </>
            ) : null}
        </WorkspacePageShell>
    );
}
