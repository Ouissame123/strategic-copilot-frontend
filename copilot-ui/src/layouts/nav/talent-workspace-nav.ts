import type { TFunction } from "i18next";
import {
    FileCheck02,
    Folder,
    LayersTwo02,
    Stars01,
    User01,
    ZapFast,
} from "@untitledui/icons";
import type { NavItemType } from "@/components/application/app-navigation/config";

/** Navigation principale talent — 5 entrées PDF multi-agent. */
export function getTalentWorkspaceNavItems(t: TFunction<"nav", undefined>): NavItemType[] {
    return [
        { label: t("talentNavDashboard"), href: "/workspace/talent/dashboard", icon: LayersTwo02 },
        { label: t("talentNavProjects"), href: "/workspace/talent/projects", icon: Folder },
        { label: t("talentNavSkills"), href: "/workspace/talent/skills", icon: ZapFast },
        { label: t("talentNavOpportunities"), href: "/workspace/talent/opportunities", icon: Stars01 },
        { label: t("talentNavRequests"), href: "/workspace/talent/requests", icon: FileCheck02 },
    ];
}

/** Pied de sidebar talent — profil. */
export function getTalentWorkspaceFooterNavItems(t: TFunction<"nav", undefined>): NavItemType[] {
    return [{ label: t("talentNavProfile"), href: "/workspace/talent/profile", icon: User01 }];
}
