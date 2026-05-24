import { RhPlaceholderPage, type RhPageKey } from "@/pages/workspace/rh/rh-placeholder-page";

function createRhPlaceholderPage(pageKey: RhPageKey) {
    return function RhRoutePage() {
        return <RhPlaceholderPage pageKey={pageKey} />;
    };
}

export { default as RhDashboardPage } from "./rh-dashboard-page";
export { default as RhEmployeesPage } from "./rh-employees-page";
export const RhAccountsPage = createRhPlaceholderPage("accounts");
export const RhSkillsCatalogPage = createRhPlaceholderPage("skills-catalog");
export const RhCriticalGapsPage = createRhPlaceholderPage("critical-gaps");
export const RhTrainingPlansPage = createRhPlaceholderPage("training-plans");
export { default as RhMobilityPage } from "./rh-mobility-page";
export const RhOrgAlertsPage = createRhPlaceholderPage("org-alerts");
export const RhProfilePage = createRhPlaceholderPage("profile");
