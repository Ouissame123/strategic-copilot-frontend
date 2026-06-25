import { Button } from "@/components/base/buttons/button";

const SELECT_CLASS =
    "rounded-lg border border-secondary bg-primary px-2.5 py-1.5 text-sm text-primary outline-none focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25";

type AccountsFiltersProps = {
    tab: "users" | "talents";
    search: string;
    onSearchChange: (v: string) => void;
    statusFilter: string;
    onStatusChange: (v: string) => void;
    roleFilter: string;
    onRoleChange: (v: string) => void;
    showReset: boolean;
    onReset: () => void;
};

export function AccountsFilters({
    tab,
    search,
    onSearchChange,
    statusFilter,
    onStatusChange,
    roleFilter,
    onRoleChange,
    showReset,
    onReset,
}: AccountsFiltersProps) {
    const inactiveValue = tab === "users" ? "disabled" : "inactive";

    return (
        <div className="flex flex-wrap items-center gap-2">
            <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={tab === "users" ? "Nom, email…" : "Nom, email, métier…"}
                aria-label="Rechercher"
                className="w-64 max-w-full rounded-lg border border-secondary bg-primary px-2.5 py-1.5 text-sm text-primary outline-none placeholder:text-tertiary focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25"
            />
            <select
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value)}
                aria-label="Statut"
                className={SELECT_CLASS}
            >
                <option value="active">Actifs</option>
                <option value={inactiveValue}>{tab === "users" ? "Désactivés" : "Inactifs"}</option>
            </select>
            {tab === "users" ? (
                <select
                    value={roleFilter}
                    onChange={(e) => onRoleChange(e.target.value)}
                    aria-label="Rôle"
                    className={SELECT_CLASS}
                >
                    <option value="all">Tous les rôles</option>
                    <option value="manager">Managers</option>
                    <option value="rh">RH</option>
                    <option value="admin">Admin</option>
                </select>
            ) : null}
            {showReset ? (
                <Button color="tertiary" size="sm" className="ml-auto" onPress={onReset}>
                    Reset
                </Button>
            ) : null}
        </div>
    );
}
