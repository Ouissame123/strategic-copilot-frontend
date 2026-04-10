import type { WorkspaceRole } from "@/types/workspace-role";
import { cx } from "@/utils/cx";

/** Semantic accents for role-based UI (badges, borders, focus rings). */
export function workspaceRoleAccentClasses(role: WorkspaceRole): string {
    switch (role) {
        case "rh":
            return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900 ring-fuchsia-200/80 dark:border-fuchsia-800 dark:bg-fuchsia-950/50 dark:text-fuchsia-100 dark:ring-fuchsia-900";
        case "manager":
            return "border-blue-200 bg-blue-50 text-blue-900 ring-blue-200/80 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100 dark:ring-blue-900";
        case "talent":
            return "border-emerald-200 bg-emerald-50 text-emerald-900 ring-emerald-200/80 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-900";
        default:
            return "";
    }
}

export function workspaceRoleSolidChipClasses(role: WorkspaceRole): string {
    switch (role) {
        case "rh":
            return "bg-fuchsia-600 text-white dark:bg-fuchsia-500";
        case "manager":
            return "bg-blue-600 text-white dark:bg-blue-500";
        case "talent":
            return "bg-emerald-600 text-white dark:bg-emerald-500";
        default:
            return "";
    }
}

/** Top bar gradient strip under the main header. */
export function workspaceRoleHeaderStripeClass(role: WorkspaceRole): string {
    switch (role) {
        case "rh":
            return "from-fuchsia-500/90 to-fuchsia-600/70";
        case "manager":
            return "from-blue-500/90 to-blue-600/70";
        case "talent":
            return "from-emerald-500/90 to-emerald-600/70";
        default:
            return "from-secondary to-secondary";
    }
}

export function workspaceRoleLabelKey(role: WorkspaceRole): `workspaceRoles.${WorkspaceRole}` {
    return `workspaceRoles.${role}`;
}

export function decisionHighlightCardClass(): string {
    return cx(
        "rounded-2xl border-2 border-utility-warning-300 bg-utility-warning-50 shadow-xs ring-1 ring-utility-warning-200/80",
        "dark:border-utility-warning-700 dark:bg-utility-warning-950/40 dark:ring-utility-warning-900/60",
    );
}
