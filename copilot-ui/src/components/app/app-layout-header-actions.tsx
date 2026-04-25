import { Plus } from "@untitledui/icons";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";

/** CTA globaux (recommandations Copilot + « Nouveau projet » sur la liste projets). */
export function AppLayoutHeaderActions() {
    const { t: tData } = useTranslation("dataCrud");
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const paths = useWorkspacePaths();
    const isManagerPortfolio = pathname === "/workspace/manager/portfolio";
    const isProjectsList = pathname === paths.projects || isManagerPortfolio || pathname === "/projects";
    const newProjectBase = isManagerPortfolio ? "/workspace/manager/portfolio" : paths.projects;

    return (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {isProjectsList ? (
                <Button
                    color="primary"
                    size="sm"
                    iconLeading={Plus}
                    onClick={() => navigate(`${newProjectBase}?action=new`, { replace: false })}
                >
                    {tData("newProject")}
                </Button>
            ) : null}
        </div>
    );
}
