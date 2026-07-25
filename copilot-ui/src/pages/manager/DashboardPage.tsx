import { useEffect } from "react";
import { useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { ManagerDashboardPage } from "@/features/manager/pages/Dashboard/ManagerDashboardPage";

/** Titre unique via i18n topbar — pas de second H1 dans la page. */
export default function DashboardPage() {
    const { t } = useTranslation(["common", "nav"]);
    const location = useLocation();
    useWorkspaceTopbarMeta(
        t("managerWorkspace.dashboard.heroTitle"),
        t("managerWorkspace.dashboard.heroSubtitle"),
    );
    useEffect(() => {
        if (!location.hash) return;
        const target = document.querySelector(location.hash);
        if (!target) return;
        const timer = setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
        return () => clearTimeout(timer);
    }, [location.hash]);
    return <ManagerDashboardPage />;
}
