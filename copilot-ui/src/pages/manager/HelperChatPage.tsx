import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { PageHero } from "@/components/layout/PageHero";
import { ManagerProjectCopilotPanel } from "@/components/copilot/ManagerProjectCopilotPanel";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";

function readProjectNameParam(raw: string | null): string | undefined {
    if (raw == null || raw === "") return undefined;
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

/** Conseiller IA projet — route dédiée (lien direct ou favori). Depuis Mes projets, le Copilot est dans le modal Détail. */
export default function HelperChatPage() {
    const { t } = useTranslation("common");
    const [searchParams] = useSearchParams();
    const projectId = (searchParams.get("project_id") ?? "").trim() || null;
    const projectName = readProjectNameParam(searchParams.get("project_name"));

    const backLink = (
        <Link
            to="/workspace/manager/projects"
            className="rounded-xl border border-secondary/80 bg-primary px-4 py-2 text-sm font-semibold text-fg-secondary shadow-sm transition hover:border-brand-secondary/40 hover:bg-brand-primary/5 hover:text-fg-primary"
        >
            {t("managerWorkspace.helper.backProjects")}
        </Link>
    );

    if (!projectId) {
        return (
            <WorkspacePageShell
                role="manager"
                eyebrow={t("workspaceRoles.manager")}
                title={t("managerWorkspace.helper.title")}
                description={false}
                omitHeader
            >
                <PageHero
                    eyebrow={t("workspaceRoles.manager")}
                    title={t("managerWorkspace.helper.title")}
                    subtitle={t("managerWorkspace.helper.emptyHint")}
                    badge={t("workspaceRoles.manager")}
                    actions={backLink}
                />
                <div className="rounded-2xl border border-dashed border-secondary bg-secondary_subtle/30 p-6 text-center">
                    <p className="text-sm text-fg-secondary">Ajoutez <span className="font-mono text-xs">?project_id=…</span> à l’URL ou ouvrez un projet depuis Mes projets.</p>
                </div>
            </WorkspacePageShell>
        );
    }

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("managerWorkspace.helper.titleAi")}
            description={false}
            omitHeader
        >
            <PageHero
                eyebrow={t("workspaceRoles.manager")}
                title={t("managerWorkspace.helper.titleAi")}
                subtitle={
                    projectName
                        ? projectName
                        : "Projet lié via l’URL : le panneau ci-dessous utilise le paramètre project_id."
                }
                badge={t("workspaceRoles.manager")}
                actions={backLink}
            />
            <div className="relative isolate min-h-[calc(100dvh-11rem)] w-full min-w-0">
                <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(99,102,241,0.18),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(14,165,233,0.08),transparent_50%)] opacity-90 dark:opacity-60"
                />
                <div className="rounded-3xl border border-secondary/50 bg-gradient-to-b from-primary via-primary to-brand-primary_alt/[0.06] p-1 shadow-xl shadow-secondary/10 ring-1 ring-secondary/30 sm:p-2">
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-primary/95 p-2 shadow-inner backdrop-blur-sm dark:border-white/5 sm:p-4">
                        <ManagerProjectCopilotPanel projectId={projectId} projectName={projectName} />
                    </div>
                </div>
            </div>
        </WorkspacePageShell>
    );
}
