import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    MANAGER_DASHBOARD_SECTION_IDS,
    type ManagerDashboardTabId,
} from "@/lib/manager-dashboard-display";
import { cx } from "@/utils/cx";

const TABS: { id: ManagerDashboardTabId; emoji: string; labelKey: string }[] = [
    { id: "overview", emoji: "📊", labelKey: "managerWorkspace.dashboard.navOverview" },
    { id: "fragile", emoji: "🎯", labelKey: "managerWorkspace.dashboard.navFragile" },
    { id: "matchmaker", emoji: "🤝", labelKey: "managerWorkspace.dashboard.navMatchmaker" },
    { id: "analyst", emoji: "📈", labelKey: "managerWorkspace.dashboard.navAnalyst" },
];

function scrollToDashboardSection(tabId: ManagerDashboardTabId) {
    document.getElementById(MANAGER_DASHBOARD_SECTION_IDS[tabId])?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function DashboardStickyNav() {
    const { t } = useTranslation("common");
    const [active, setActive] = useState<ManagerDashboardTabId>("overview");

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
            { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.15, 0.4] },
        );

        for (const el of sectionEls) observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <nav
            className="sticky top-0 z-20 -mx-1 mb-4 border-b border-slate-200 bg-white/95 px-1 py-2 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-slate-900/80"
            aria-label={t("managerWorkspace.dashboard.navAria")}
        >
            <section className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TABS.map((tab) => {
                    const isActive = active === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                setActive(tab.id);
                                scrollToDashboardSection(tab.id);
                            }}
                            className={cx(
                                "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                                isActive
                                    ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-800"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                            )}
                        >
                            <span aria-hidden>{tab.emoji}</span>
                            {t(tab.labelKey)}
                        </button>
                    );
                })}
            </section>
        </nav>
    );
}
