import type { ReactNode } from "react";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";

type WorkspacePageHeaderProps = {
    title: string;
    subtitle?: string | null;
    /** Action optionnelle à droite du titre (topbar). */
    trailing?: ReactNode | null;
};

/**
 * En-tête page workspace : titre + sous-titre dans la topbar shell
 * (cluster icônes aide / notifs / langue / thème / avatar géré par le layout).
 * Rendu nul — side-effect via `useWorkspaceTopbarMeta`.
 */
export function WorkspacePageHeader({ title, subtitle = null, trailing = null }: WorkspacePageHeaderProps) {
    useWorkspaceTopbarMeta(title, subtitle, trailing);
    return null;
}
