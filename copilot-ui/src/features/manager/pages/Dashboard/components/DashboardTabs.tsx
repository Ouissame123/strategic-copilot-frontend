import { cx } from "@/utils/cx";

export const DASHBOARD_TABS = [
    { id: "overview", label: "Vue d'ensemble" },
    { id: "projects", label: "Projets" },
    { id: "risks", label: "Risques" },
    { id: "talents", label: "Talents" },
    { id: "journal", label: "Journal" },
] as const;

export type DashboardTabId = (typeof DASHBOARD_TABS)[number]["id"];

export function parseDashboardTab(raw: string | null): DashboardTabId {
    const value = String(raw ?? "").trim().toLowerCase();
    if (value === "projects" || value === "risks" || value === "talents" || value === "journal") return value;
    return "overview";
}

type DashboardTabsProps = {
    active: DashboardTabId;
    onChange: (tab: DashboardTabId) => void;
};

export function DashboardTabs({ active, onChange }: DashboardTabsProps) {
    return (
        <nav
            className="ops-scroll flex gap-1 overflow-x-auto border-b border-[color:var(--border)]"
            aria-label="Sections du tableau de bord"
        >
            {DASHBOARD_TABS.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => onChange(tab.id)}
                    className={cx(
                        "ops-focus-ring whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium transition-colors duration-[var(--motion-fast)]",
                        active === tab.id
                            ? "border-[color:var(--accent)] text-[color:var(--accent)]"
                            : "border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text)]",
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </nav>
    );
}
