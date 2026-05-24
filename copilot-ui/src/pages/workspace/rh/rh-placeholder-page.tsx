import { useTranslation } from "react-i18next";
import { RhPageShell } from "@/components/rh/rh-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";

/** Segments routés sous `/workspace/rh/*` (hors `manager-requests`). */
export type RhPageKey =
    | "dashboard"
    | "employees"
    | "accounts"
    | "skills-catalog"
    | "critical-gaps"
    | "training-plans"
    | "mobility"
    | "org-alerts"
    | "profile";

const TITLE_KEYS: Record<RhPageKey, string> = {
    dashboard: "nav:rhNavDashboard",
    employees: "nav:rhNavEmployees",
    accounts: "nav:rhNavAccounts",
    "skills-catalog": "nav:rhNavSkills",
    "critical-gaps": "nav:rhNavGaps",
    "training-plans": "nav:rhNavTraining",
    mobility: "nav:rhNavMobility",
    "org-alerts": "nav:rhNavAlerts",
    profile: "nav:profile",
};

type RhPlaceholderPageProps = {
    pageKey: RhPageKey;
};

/** Page RH vide — base pour la prochaine génération d’écrans SaaS. */
export function RhPlaceholderPage({ pageKey }: RhPlaceholderPageProps) {
    const { t } = useTranslation("nav");
    const title = t(TITLE_KEYS[pageKey]);

    useCopilotPage(`rh_${pageKey}`, { page: pageKey, status: "placeholder" });

    return <RhPageShell title={title} />;
}
