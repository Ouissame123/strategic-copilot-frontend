import type { ReactNode } from "react";

import { Loader2, RefreshCw } from "lucide-react";

import { AccountRowActions } from "@/components/rh/accounts/AccountRowActions";

import type { RhDeletedAccount, RhStaffAccount, RhTalentAccount } from "@/types/rh-accounts.types";

import { isRhAccountActive } from "@/utils/accounts-email-utils";

import {

    RH_BTN_SECONDARY,

    RH_CARD,

    RH_STATUS_ACTIVE,

    RH_STATUS_INACTIVE,

    RH_TEXT_MUTED,

    RH_TEXT_PRIMARY,

    RH_TEXT_SECONDARY,

    WS_ALERT_ERROR,

    WS_BTN_PRIMARY,

} from "@/utils/rh-workspace-theme";

import { cx } from "@/utils/cx";



type ListState<T> = {

    items: T[];

    isLoading: boolean;

    error: string | null;

};



type StaffPanelProps = {

    state: ListState<RhStaffAccount>;

    togglingIds: ReadonlySet<string>;

    onRetry: () => void;

    onChangePassword: (account: RhStaffAccount) => void;

    onToggleStatus: (account: RhStaffAccount) => void;

    onDelete: (account: RhStaffAccount) => void;

};



type TalentPanelProps = {

    state: ListState<RhTalentAccount>;

    togglingIds: ReadonlySet<string>;

    onRetry: () => void;

    onToggleStatus: (account: RhTalentAccount) => void;

    onDelete: (account: RhTalentAccount) => void;

};



type DeletedPanelProps = {

    state: ListState<RhDeletedAccount>;

    onRetry: () => void;

};



function formatCreatedAt(iso?: string): string {

    if (!iso) return "—";

    const d = new Date(iso);

    if (!Number.isFinite(d.getTime())) return "—";

    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

}



function formatStatus(status?: string): string {

    return isRhAccountActive(status) ? "Actif" : "Inactif";

}



function StatusBadge({ status }: { status?: string }) {

    const active = isRhAccountActive(status);

    return (

        <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-semibold", active ? RH_STATUS_ACTIVE : RH_STATUS_INACTIVE)}>

            {formatStatus(status)}

        </span>

    );

}



function RoleBadge({ role }: { role: string }) {

    const label = role === "rh" ? "RH" : role === "manager" ? "Manager" : role;

    const cls =

        role === "rh"

            ? "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200"

            : "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200";

    return <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", cls)}>{label}</span>;

}



function ListShell({

    isLoading,

    error,

    empty,

    emptyMessage,

    onRetry,

    children,

}: {

    isLoading: boolean;

    error: string | null;

    empty: boolean;

    emptyMessage: string;

    onRetry: () => void;

    children: ReactNode;

}) {

    if (isLoading) {

        return (

            <div className={cx(RH_CARD, "flex min-h-[240px] items-center justify-center gap-2 p-8")}>

                <Loader2 className="size-5 animate-spin text-violet-600" aria-hidden />

                <span className={cx("text-sm", RH_TEXT_MUTED)}>Chargement des comptes…</span>

            </div>

        );

    }



    if (error) {

        return (

            <div className={cx(RH_CARD, "space-y-3 p-6")}>

                <p className={cx("text-sm", WS_ALERT_ERROR)}>{error}</p>

                <button type="button" className={RH_BTN_SECONDARY} onClick={onRetry}>

                    <RefreshCw className="mr-1.5 inline size-4" aria-hidden />

                    Réessayer

                </button>

            </div>

        );

    }



    if (empty) {

        return (

            <div className={cx(RH_CARD, "flex min-h-[200px] items-center justify-center p-8 text-center")}>

                <p className={cx("text-sm", RH_TEXT_MUTED)}>{emptyMessage}</p>

            </div>

        );

    }



    return <div className={cx(RH_CARD, "overflow-hidden")}>{children}</div>;

}



export function StaffAccountsPanel({

    state,

    togglingIds,

    onRetry,

    onChangePassword,

    onToggleStatus,

    onDelete,

}: StaffPanelProps) {

    return (

        <ListShell

            isLoading={state.isLoading}

            error={state.error}

            empty={state.items.length === 0}

            emptyMessage="Aucun compte manager ou RH pour le moment."

            onRetry={onRetry}

        >

            <div className="overflow-x-auto">

                <table className="w-full min-w-[980px] text-left text-sm">

                    <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60">

                        <tr>

                            <th className={cx("px-4 py-3 font-medium", RH_TEXT_MUTED)}>Nom</th>

                            <th className={cx("px-4 py-3 font-medium", RH_TEXT_MUTED)}>Email</th>

                            <th className={cx("px-4 py-3 font-medium", RH_TEXT_MUTED)}>Rôle</th>

                            <th className={cx("px-4 py-3 font-medium", RH_TEXT_MUTED)}>Talents gérés</th>

                            <th className={cx("px-4 py-3 font-medium", RH_TEXT_MUTED)}>Créé le</th>

                            <th className={cx("px-4 py-3 font-medium", RH_TEXT_MUTED)}>Statut</th>

                            <th className={cx("px-4 py-3 text-right font-medium", RH_TEXT_MUTED)}>Actions</th>

                        </tr>

                    </thead>

                    <tbody>

                        {state.items.map((row) => (

                            <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">

                                <td className={cx("px-4 py-3 font-medium", RH_TEXT_PRIMARY)}>{row.full_name}</td>

                                <td className={cx("px-4 py-3", RH_TEXT_SECONDARY)}>{row.email}</td>

                                <td className="px-4 py-3">

                                    <RoleBadge role={row.role} />

                                </td>

                                <td className={cx("px-4 py-3 tabular-nums", RH_TEXT_SECONDARY)}>{row.managed_talents_count}</td>

                                <td className={cx("px-4 py-3", RH_TEXT_MUTED)}>{formatCreatedAt(row.created_at)}</td>

                                <td className="px-4 py-3">

                                    <StatusBadge status={row.status} />

                                </td>

                                <td className="px-4 py-3">

                                    <AccountRowActions

                                        showChangePassword

                                        isActive={isRhAccountActive(row.status)}

                                        toggling={togglingIds.has(row.id)}

                                        onChangePassword={() => onChangePassword(row)}

                                        onToggleStatus={() => onToggleStatus(row)}

                                        onDelete={() => onDelete(row)}

                                    />

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

        </ListShell>

    );

}



export function TalentAccountsPanel({

    state,

    togglingIds,

    onRetry,

    onToggleStatus,

    onDelete,

}: TalentPanelProps) {

    return (

        <ListShell

            isLoading={state.isLoading}

            error={state.error}

            empty={state.items.length === 0}

            emptyMessage="Aucun compte talent pour le moment."

            onRetry={onRetry}

        >

            <div className="overflow-x-auto">

                <table className="w-full min-w-[900px] text-left text-sm">

                    <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60">

                        <tr>

                            <th className={cx("px-4 py-3 font-medium", RH_TEXT_MUTED)}>Nom</th>

                            <th className={cx("px-4 py-3 font-medium", RH_TEXT_MUTED)}>Email</th>

                            <th className={cx("px-4 py-3 font-medium", RH_TEXT_MUTED)}>Poste</th>

                            <th className={cx("px-4 py-3 font-medium", RH_TEXT_MUTED)}>Manager</th>

                            <th className={cx("px-4 py-3 font-medium", RH_TEXT_MUTED)}>Statut</th>

                            <th className={cx("px-4 py-3 text-right font-medium", RH_TEXT_MUTED)}>Actions</th>

                        </tr>

                    </thead>

                    <tbody>

                        {state.items.map((row) => (

                            <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">

                                <td className={cx("px-4 py-3 font-medium", RH_TEXT_PRIMARY)}>{row.name}</td>

                                <td className={cx("px-4 py-3", RH_TEXT_SECONDARY)}>{row.email}</td>

                                <td className={cx("px-4 py-3", RH_TEXT_SECONDARY)}>{row.job_title}</td>

                                <td className={cx("px-4 py-3", RH_TEXT_SECONDARY)}>

                                    {row.has_manager && row.manager_name ? row.manager_name : "Sans manager"}

                                </td>

                                <td className="px-4 py-3">

                                    <StatusBadge status={row.status} />

                                </td>

                                <td className="px-4 py-3">

                                    <AccountRowActions

                                        isActive={isRhAccountActive(row.status)}

                                        toggling={togglingIds.has(row.id)}

                                        onToggleStatus={() => onToggleStatus(row)}

                                        onDelete={() => onDelete(row)}

                                    />

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

        </ListShell>

    );

}



export function DeletedAccountsPanel({ state, onRetry }: DeletedPanelProps) {

    return (

        <ListShell

            isLoading={state.isLoading}

            error={state.error}

            empty={state.items.length === 0}

            emptyMessage="Aucun compte supprimé."

            onRetry={onRetry}

        >

            <div className="overflow-x-auto">

                <table className="w-full min-w-[640px] text-left text-sm">

                    <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60">

                        <tr>

                            <th className={cx("px-4 py-3 font-medium", RH_TEXT_MUTED)}>Nom</th>

                            <th className={cx("px-4 py-3 font-medium", RH_TEXT_MUTED)}>Email</th>

                            <th className={cx("px-4 py-3 font-medium", RH_TEXT_MUTED)}>Type</th>

                        </tr>

                    </thead>

                    <tbody>

                        {state.items.map((row) => (

                            <tr key={`${row.kind}-${row.id}`} className="border-b border-slate-100 last:border-0 dark:border-slate-800">

                                <td className={cx("px-4 py-3 font-medium", RH_TEXT_PRIMARY)}>{row.name}</td>

                                <td className={cx("px-4 py-3", RH_TEXT_SECONDARY)}>{row.email}</td>

                                <td className="px-4 py-3">

                                    <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-semibold", RH_STATUS_INACTIVE)}>

                                        {row.kind === "staff" ? (row.role === "rh" ? "RH" : "Manager") : "Talent"}

                                    </span>

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

        </ListShell>

    );

}



export function NewAccountButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {

    return (

        <button type="button" className={WS_BTN_PRIMARY} disabled={disabled} onClick={onClick}>

            + Nouveau compte

        </button>

    );

}


