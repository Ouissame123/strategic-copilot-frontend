import { useEffect, useState } from "react";
import type { BudgetProject, BudgetStatus } from "@/api/rh-budget.api";
import { Button } from "@/components/base/buttons/button";
import { BudgetFilters } from "@/components/rh/budget/BudgetFilters";
import { BudgetInsightBar } from "@/components/rh/budget/BudgetInsightBar";
import { BudgetProjectDrawer } from "@/components/rh/budget/BudgetProjectDrawer";
import { BudgetTable } from "@/components/rh/budget/BudgetTable";
import { useRhBudgetDensity } from "@/components/rh/budget/use-rh-budget-density";
import { useBudgetProjects, useBudgetSummary } from "@/hooks/useRhBudget";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";

export default function RhProjectsBudgetPage() {
    const [filter, setFilter] = useState<BudgetStatus | "all">("all");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const { density, toggleDensity } = useRhBudgetDensity();
    const [drawerProject, setDrawerProject] = useState<BudgetProject | null>(null);

    useWorkspaceTopbarMeta("Budget RH", "Enveloppes RH par projet — lecture stricte backend (v_project_budget)");

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => window.clearTimeout(t);
    }, [search]);

    const summary = useBudgetSummary();
    const projects = useBudgetProjects({ filter, search: debouncedSearch });

    return (
        <div className="space-y-4">
            <header className="space-y-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-baseline justify-between gap-3">
                    <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Budget RH
                        {typeof summary.data?.summary.projects_total === "number" ? (
                            <span className="ml-2 text-base font-normal text-slate-400">
                                {summary.data.summary.projects_total}
                            </span>
                        ) : null}
                    </h1>
                    <Button color="tertiary" size="sm" onClick={toggleDensity}>
                        {density === "comfortable" ? "Dense" : "Confort"}
                    </Button>
                </div>
                <BudgetInsightBar summary={summary.data?.summary} onFilterClick={setFilter} />
            </header>

            <BudgetFilters
                filter={filter}
                onFilterChange={setFilter}
                search={search}
                onSearchChange={setSearch}
                counts={summary.data?.summary}
            />

            <BudgetTable
                projects={projects.data?.projects ?? []}
                isLoading={projects.isLoading}
                density={density}
                onRowClick={setDrawerProject}
            />

            {drawerProject ? (
                <BudgetProjectDrawer project={drawerProject} onClose={() => setDrawerProject(null)} />
            ) : null}
        </div>
    );
}
