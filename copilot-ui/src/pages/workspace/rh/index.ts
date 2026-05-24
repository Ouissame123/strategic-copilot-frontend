/**
 * Workspace RH — pages placeholder (refonte premium).
 * APIs : `@/api/rh-dashboard.api`, `@/api/rh-workspace.api`, `@/api/rh-actions.api`, hooks `use-rh-*`.
 * File active : `/workspace/rh/manager-requests` → `pages/rh/ManagerRequestsPage`.
 */
export { DashboardRH } from "@/components/rh/DashboardRH";
export {
    RhDashboardPage,
    RhEmployeesPage,
    RhAccountsPage,
    RhSkillsCatalogPage,
    RhCriticalGapsPage,
    RhTrainingPlansPage,
    RhMobilityPage,
    RhOrgAlertsPage,
    RhProfilePage,
} from "./rh-route-pages";

export { default as RhWorkforceArbitrationPage } from "./rh-workforce-arbitration-page";

export { RhPlaceholderPage, type RhPageKey } from "./rh-placeholder-page";
