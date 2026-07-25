/**
 * Workspace RH — pages actives.
 * APIs : `@/api/rh-dashboard.api`, `@/api/rh-requests-decision.api` (demandes managers), hooks `use-rh-*`.
 * File active : `/workspace/rh/manager-requests` → `pages/rh/ManagerRequestsPage`.
 */
export { DashboardRH } from "@/components/rh/DashboardRH";
export {
    RhDashboardPage,
    RhEmployeesPage,
    RhMobilityPage,
    RhProfilePage,
} from "./rh-route-pages";

export { default as RhWorkforceArbitrationPage } from "./rh-workforce-arbitration-page";
export { default as RhAccountsPage } from "./rh-accounts-page";

export { RhPlaceholderPage, type RhPageKey } from "./rh-placeholder-page";
