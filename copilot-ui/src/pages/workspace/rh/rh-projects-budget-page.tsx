import { useEffect, useState } from "react";
import type { BudgetProject, BudgetStatus } from "@/api/rh-budget.api";
import { BudgetFilters } from "@/components/rh/budget/BudgetFilters";
import { BudgetProjectDrawer } from "@/components/rh/budget/BudgetProjectDrawer";
import { BudgetTable } from "@/components/rh/budget/BudgetTable";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { useBudgetProjects, useBudgetSummary } from "@/hooks/useRhBudget";

export default function RhProjectsBudgetPage() {
    const [filter, setFilter] = useState<BudgetStatus | "all">("all");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [drawerProject, setDrawerProject] = useState<BudgetProject | null>(null);

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => window.clearTimeout(t);
    }, [search]);

    const summary = useBudgetSummary();
    const projects = useBudgetProjects({ filter, search: debouncedSearch });

    return (
        <div className="space-y-4">
            <WorkspacePageHeader
                title="Budget RH"
                subtitle="Enveloppes RH par projet — lecture stricte backend (v_project_budget)"
            />

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
                onRowClick={setDrawerProject}
            />

            {drawerProject ? (
                <BudgetProjectDrawer project={drawerProject} onClose={() => setDrawerProject(null)} />
            ) : null}
        </div>
    );
}
