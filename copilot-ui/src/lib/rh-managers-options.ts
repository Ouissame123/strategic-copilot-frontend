import type { RhAvailableManager } from "@/types/rh-assignments.types";

export function formatAvailableManagerLabel(manager: RhAvailableManager): string {
    return manager.manager_name.trim() || manager.manager_email.trim() || manager.manager_user_id;
}

export function availableManagersToSelectOptions(managers: RhAvailableManager[]): RhAvailableManager[] {
    return [...managers].sort((a, b) =>
        formatAvailableManagerLabel(a).localeCompare(formatAvailableManagerLabel(b), "fr"),
    );
}
