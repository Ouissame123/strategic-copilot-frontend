import { RhPlaceholderPage, type RhPageKey } from "@/pages/workspace/rh/rh-placeholder-page";

function createRhPlaceholderPage(pageKey: RhPageKey) {
    return function RhRoutePage() {
        return <RhPlaceholderPage pageKey={pageKey} />;
    };
}

export { default as RhDashboardPage } from "./rh-dashboard-page";
export { default as RhEmployeesPage } from "./rh-employees-page";
export { default as RhMobilityPage } from "./rh-mobility-page";
export { default as RhProfilePage } from "./rh-profile-page";
