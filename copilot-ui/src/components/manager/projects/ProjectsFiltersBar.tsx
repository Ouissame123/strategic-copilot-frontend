import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";

export type ProjectsListFilters = {
    search: string;
    status: string;
};

type ProjectsFiltersBarProps = {
    filters: ProjectsListFilters;
    onChange: (next: ProjectsListFilters) => void;
    onCreate?: () => void;
};

const selectClass =
    "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";

export function ProjectsFiltersBar({ filters, onChange, onCreate }: ProjectsFiltersBarProps) {
    const { t } = useTranslation("common");
    const tf = (key: string) => t(`managerWorkspace.projects.listFilters.${key}`);

    return (
        <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
                type="search"
                placeholder={tf("searchPlaceholder")}
                value={filters.search}
                onChange={(e) => onChange({ ...filters, search: e.target.value })}
                className="w-full min-w-[12rem] max-w-[16rem] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                aria-label={tf("searchPlaceholder")}
            />
            <select
                value={filters.status}
                onChange={(e) => onChange({ ...filters, status: e.target.value })}
                className={selectClass}
                aria-label={tf("statusAll")}
            >
                <option value="">{tf("statusAll")}</option>
                <option value="active">{tf("statusActive")}</option>
                <option value="planned">{tf("statusPlanned")}</option>
                <option value="on_hold">{tf("statusOnHold")}</option>
                <option value="completed">{tf("statusCompleted")}</option>
                <option value="cancelled">{t("managerWorkspace.projects.statusCancelled")}</option>
            </select>
            {onCreate ? (
                <Button type="button" color="primary" size="sm" className="ml-auto" onClick={onCreate}>
                    {t("managerWorkspace.projects.newProjectShort")}
                </Button>
            ) : null}
        </div>
    );
}
