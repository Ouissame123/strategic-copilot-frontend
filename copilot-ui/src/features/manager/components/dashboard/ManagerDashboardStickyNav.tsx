import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    MANAGER_DASHBOARD_SECTION_IDS,
    scrollToManagerDashboardSection,
    type ManagerDashboardSectionId,
} from "@/features/manager/lib/copilot-engines";
import { cx } from "@/utils/cx";

const TABS: { id: ManagerDashboardSectionId; labelKey: string }[] = [
    { id: "overview", labelKey: "managerWorkspace.dashboard.navPilotage" },
    { id: "risk", labelKey: "managerWorkspace.dashboard.navRisks" },
    { id: "matchmaker", labelKey: "managerWorkspace.dashboard.navTalents" },
    { id: "actions", labelKey: "managerWorkspace.dashboard.navActions" },
];

export function ManagerDashboardStickyNav() {
    const { t } = useTranslation("common");
    const [active, setActive] = useState<ManagerDashboardSectionId>("overview");

    useEffect(() => {
        const sectionEls = TABS.map((tab) => document.getElementById(MANAGER_DASHBOARD_SECTION_IDS[tab.id])).filter(
            Boolean,
        ) as HTMLElement[];
        if (!sectionEls.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
                if (!visible.length) return;
                const id = visible[0]?.target.id;
                const match = TABS.find((tab) => MANAGER_DASHBOARD_SECTION_IDS[tab.id] === id);
                if (match) setActive(match.id);
            },
            { rootMargin: "-18% 0px -55% 0px", threshold: [0, 0.15, 0.4] },
        );

        for (const el of sectionEls) observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <nav
            className="sticky top-0 z-20 -mx-1 border-b border-secondary bg-primary/95 px-1 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-primary/85"
            aria-label={t("managerWorkspace.dashboard.navAria")}
        >
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TABS.map((tab) => {
                    const isActive = active === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                setActive(tab.id);
                                scrollToManagerDashboardSection(tab.id);
                            }}
                            className={cx(
                                "inline-flex shrink-0 items-center rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                                isActive
                                    ? "bg-brand-primary/15 text-brand-secondary ring-1 ring-brand-secondary/25"
                                    : "text-tertiary hover:bg-secondary_subtle hover:text-primary",
                            )}
                        >
                            {t(tab.labelKey)}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
