import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountsFilters } from "@/components/rh/accounts/page/AccountsFilters";
import { AccountsHeader } from "@/components/rh/accounts/page/AccountsHeader";
import { AccountsTabsBar, CreateAccountsButton } from "@/components/rh/accounts/page/AccountsTabsBar";
import { CreateUserDialog } from "@/components/rh/accounts/page/CreateUserDialog";
import { OnboardTalentDialog } from "@/components/rh/accounts/page/OnboardTalentDialog";
import { TalentDrawer } from "@/components/rh/accounts/page/TalentDrawer";
import { TalentsTable } from "@/components/rh/accounts/page/TalentsTable";
import { UserDrawer } from "@/components/rh/accounts/page/UserDrawer";
import { UsersTable } from "@/components/rh/accounts/page/UsersTable";
import { useRhAccountsDensity } from "@/components/rh/accounts/page/use-rh-accounts-density";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { useTalents, useUsers, type TalentsListFilters, type UsersListFilters } from "@/hooks/useRhAccounts";
import type { RhStaffAccount, RhTalentAccount } from "@/types/rh-accounts.types";

type AccountsTab = "users" | "talents";

function RhAccountsTopbarMeta() {
    useWorkspaceTopbarMeta("Gestion des comptes", "Utilisateurs et talents — WF_RH_Accounts_CRUD_v1");
    return null;
}

export function RhAccountsPageContent({ embedded = false }: { embedded?: boolean }) {
    const { density, toggleDensity } = useRhAccountsDensity();
    const [tab, setTab] = useState<AccountsTab>("users");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("active");
    const [roleFilter, setRoleFilter] = useState<UsersListFilters["role"]>("all");
    const [createOpen, setCreateOpen] = useState<"user" | null>(null);
    const [onboardOpen, setOnboardOpen] = useState(false);
    const [onboardGrantTalentId, setOnboardGrantTalentId] = useState<string | null>(null);
    const [drawerUser, setDrawerUser] = useState<RhStaffAccount | null>(null);
    const [drawerTalent, setDrawerTalent] = useState<RhTalentAccount | null>(null);

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => window.clearTimeout(t);
    }, [search]);

    const usersSummaryQuery = useUsers({ role: "all", status: "all", search: "" }, true);
    const talentsSummaryQuery = useTalents({ status: "all", search: "" }, true);

    const usersTableFilters = useMemo(
        (): UsersListFilters => ({
            role: roleFilter,
            status: statusFilter === "disabled" ? "disabled" : statusFilter === "active" ? "active" : "all",
            search: debouncedSearch,
        }),
        [roleFilter, statusFilter, debouncedSearch],
    );

    const talentsTableFilters = useMemo(
        (): TalentsListFilters => ({
            status: statusFilter === "inactive" ? "inactive" : statusFilter === "active" ? "active" : "all",
            search: debouncedSearch,
        }),
        [statusFilter, debouncedSearch],
    );

    const usersTableQuery = useUsers(usersTableFilters, tab === "users");
    const talentsTableQuery = useTalents(talentsTableFilters, tab === "talents");

    const handleTabChange = useCallback((next: AccountsTab) => {
        setTab(next);
        setSearch("");
        setStatusFilter("active");
        setRoleFilter("all");
    }, []);

    const resetFilters = useCallback(() => {
        setSearch("");
        setStatusFilter("active");
        setRoleFilter("all");
    }, []);

    const showReset =
        search.trim() !== "" || statusFilter !== "active" || (tab === "users" && roleFilter !== "all");

    return (
        <div className="space-y-4">
            {!embedded ? <RhAccountsTopbarMeta /> : null}
            <AccountsHeader
                embedded={embedded}
                density={density}
                onToggleDensity={toggleDensity}
                usersSummary={usersSummaryQuery.data?.summary}
                talentsSummary={talentsSummaryQuery.data?.summary}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <AccountsTabsBar
                    tab={tab}
                    onTabChange={handleTabChange}
                    usersTotal={usersSummaryQuery.data?.summary?.total}
                    talentsTotal={talentsSummaryQuery.data?.summary?.total}
                />
                <CreateAccountsButton
                    onCreateUser={() => setCreateOpen("user")}
                    onOnboardTalent={() => {
                        setOnboardGrantTalentId(null);
                        setOnboardOpen(true);
                    }}
                />
            </div>

            <AccountsFilters
                tab={tab}
                search={search}
                onSearchChange={setSearch}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                roleFilter={roleFilter}
                onRoleChange={(v) => setRoleFilter(v as UsersListFilters["role"])}
                showReset={showReset}
                onReset={resetFilters}
            />

            {tab === "users" ? (
                <UsersTable
                    users={usersTableQuery.data?.users ?? []}
                    isLoading={usersTableQuery.isLoading}
                    density={density}
                    onRowClick={setDrawerUser}
                />
            ) : (
                <TalentsTable
                    talents={talentsTableQuery.data?.talents ?? []}
                    isLoading={talentsTableQuery.isLoading}
                    density={density}
                    onRowClick={setDrawerTalent}
                />
            )}

            {drawerUser ? <UserDrawer user={drawerUser} onClose={() => setDrawerUser(null)} /> : null}
            {drawerTalent ? (
                <TalentDrawer
                    talent={drawerTalent}
                    onClose={() => setDrawerTalent(null)}
                    onGrantAccess={(t) => {
                        setOnboardGrantTalentId(t.id);
                        setOnboardOpen(true);
                    }}
                />
            ) : null}

            <CreateUserDialog isOpen={createOpen === "user"} onClose={() => setCreateOpen(null)} />
            <OnboardTalentDialog
                open={onboardOpen}
                onOpenChange={(open) => {
                    setOnboardOpen(open);
                    if (!open) setOnboardGrantTalentId(null);
                }}
                initialMode={onboardGrantTalentId ? "existing" : "new"}
                initialTalentId={onboardGrantTalentId}
            />
        </div>
    );
}
