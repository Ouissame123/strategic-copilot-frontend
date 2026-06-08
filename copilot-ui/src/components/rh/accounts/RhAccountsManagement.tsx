import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { mapRhAccountsApiError } from "@/api/rh-accounts.api";

import { ApiError } from "@/api/errors";

import { AccountsTabs } from "@/components/rh/accounts/AccountsTabs";

import {

    DeletedAccountsPanel,

    NewAccountButton,

    StaffAccountsPanel,

    TalentAccountsPanel,

} from "@/components/rh/accounts/AccountsListPanel";

import { ChangePasswordModal, type ChangePasswordTarget } from "@/components/rh/accounts/ChangePasswordModal";

import { CreateStaffAccountModal } from "@/components/rh/accounts/CreateStaffAccountModal";

import { CreateTalentAccountModal } from "@/components/rh/accounts/CreateTalentAccountModal";

import {

    DeleteAccountConfirmModal,

    type DeleteAccountTarget,

} from "@/components/rh/accounts/DeleteAccountConfirmModal";

import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";

import { useRhAccounts } from "@/hooks/use-rh-accounts";

import { useCopilotPage } from "@/hooks/use-copilot-page";

import { useToast } from "@/providers/toast-provider";

import type { RhAccountsTabId, RhStaffAccount, RhTalentAccount } from "@/types/rh-accounts.types";

import { flippedRhAccountStatus, isRhAccountActive } from "@/utils/accounts-email-utils";

import { RH_TEXT_MUTED } from "@/utils/rh-workspace-theme";

import { cx } from "@/utils/cx";



function toastForToggledStatus(status?: string): string {

    return isRhAccountActive(status) ? "Compte activé" : "Compte désactivé";

}



export function RhAccountsManagement() {

    const { t } = useTranslation("common");

    const { push: pushToast } = useToast();

    const [activeTab, setActiveTab] = useState<RhAccountsTabId>("staff");

    const [createStaffOpen, setCreateStaffOpen] = useState(false);

    const [createTalentOpen, setCreateTalentOpen] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<DeleteAccountTarget | null>(null);

    const [passwordTarget, setPasswordTarget] = useState<ChangePasswordTarget | null>(null);



    const {

        staff,

        talents,

        deleted,

        managers,

        counts,

        mutating,

        togglingIds,

        retry,

        createStaff,

        createStaffFromExistingTalent,

        createTalent,

        removeStaff,

        removeTalent,

        updateStaffPassword,

        toggleStaffStatus,

        toggleTalentStatus,

    } = useRhAccounts(activeTab);



    const registeredTalentEmails = useMemo(() => talents.items.map((t) => t.email), [talents.items]);



    useCopilotPage("rh_accounts", { view: activeTab });



    const openCreate = () => {

        if (activeTab === "talents") setCreateTalentOpen(true);

        else setCreateStaffOpen(true);

    };



    const handleCreateStaff = async (body: Parameters<typeof createStaff>[0]) => {

        await createStaff(body);

        pushToast("Compte créé avec succès.", "success");

    };



    const handleCreateTalent = async (body: Parameters<typeof createTalent>[0]) => {

        await createTalent(body);

        pushToast("Compte talent créé avec succès.", "success");

    };



    const handleCreateExistingTalentUser = async (body: Parameters<typeof createStaffFromExistingTalent>[0]) => {

        await createStaffFromExistingTalent(body);

        pushToast("Compte créé avec succès.", "success");

    };



    const handleChangePassword = async (target: ChangePasswordTarget, newPassword: string) => {

        try {

            await updateStaffPassword(target.id, newPassword);

            pushToast("Mot de passe mis à jour.", "success");

        } catch (err) {

            pushToast(

                err instanceof ApiError ? mapRhAccountsApiError(err, "change-password") : mapRhAccountsApiError(err, "change-password"),

                "error",

            );

            throw err;

        }

    };



    const handleToggleStaff = async (account: RhStaffAccount) => {

        try {

            const res = await toggleStaffStatus(account.id);

            pushToast(toastForToggledStatus(res.user?.status ?? flippedRhAccountStatus(account.status)), "success");

        } catch (err) {

            pushToast(err instanceof ApiError ? mapRhAccountsApiError(err, "patch-staff") : mapRhAccountsApiError(err, "patch-staff"), "error");

        }

    };



    const handleToggleTalent = async (account: RhTalentAccount) => {

        try {

            const res = await toggleTalentStatus(account.id);

            pushToast(toastForToggledStatus(res.talent?.status ?? flippedRhAccountStatus(account.status)), "success");

        } catch (err) {

            pushToast(err instanceof ApiError ? mapRhAccountsApiError(err, "patch-talent") : mapRhAccountsApiError(err, "patch-talent"), "error");

        }

    };



    const handleDeleteStaff = (account: RhStaffAccount) => {

        setDeleteTarget({ id: account.id, name: account.full_name, email: account.email, kind: "staff" });

    };



    const handleDeleteTalent = (account: RhTalentAccount) => {

        setDeleteTarget({ id: account.id, name: account.name, email: account.email, kind: "talent" });

    };



    const handleConfirmDelete = async (target: DeleteAccountTarget) => {

        try {

            if (target.kind === "staff") {

                const res = await removeStaff(target.id);

                const unassigned = res.cascade?.talents_unassigned ?? 0;

                pushToast(`Compte supprimé — ${unassigned} talent(s) désaffecté(s).`, "success");

            } else {

                await removeTalent(target.id);

                pushToast("Compte talent supprimé avec succès.", "success");

            }

        } catch (err) {

            const ctx = target.kind === "staff" ? "delete-staff" : "delete-talent";

            pushToast(err instanceof ApiError ? mapRhAccountsApiError(err, ctx) : mapRhAccountsApiError(err, ctx), "error");

            throw err;

        }

    };



    return (

        <WorkspacePageShell

            role="rh"

            eyebrow={t("workspace.rhAccountsEyebrow")}

            title={t("workspace.rhAccountsTitle")}

            description={t("workspace.rhAccountsDesc")}

            actions={<NewAccountButton onClick={openCreate} disabled={mutating} />}

        >

            <div className="space-y-4">

                <AccountsTabs active={activeTab} counts={counts} onChange={setActiveTab} />



                <p className={cx("text-xs", RH_TEXT_MUTED)}>

                    {activeTab === "staff" && `${counts.staff} compte(s) manager/RH.`}

                    {activeTab === "talents" && `${counts.talents} compte(s) talent.`}

                    {activeTab === "deleted" && `${counts.deleted} compte(s) supprimé(s).`}

                </p>



                {activeTab === "staff" ? (

                    <StaffAccountsPanel

                        state={staff}

                        togglingIds={togglingIds}

                        onRetry={retry}

                        onChangePassword={(account) =>

                            setPasswordTarget({ id: account.id, name: account.full_name, email: account.email })

                        }

                        onToggleStatus={(account) => void handleToggleStaff(account)}

                        onDelete={handleDeleteStaff}

                    />

                ) : null}

                {activeTab === "talents" ? (

                    <TalentAccountsPanel

                        state={talents}

                        togglingIds={togglingIds}

                        onRetry={retry}

                        onToggleStatus={(account) => void handleToggleTalent(account)}

                        onDelete={handleDeleteTalent}

                    />

                ) : null}

                {activeTab === "deleted" ? <DeletedAccountsPanel state={deleted} onRetry={retry} /> : null}

            </div>



            <CreateStaffAccountModal

                open={createStaffOpen}

                submitting={mutating}

                onClose={() => setCreateStaffOpen(false)}

                onSubmit={handleCreateStaff}

            />

            <CreateTalentAccountModal

                open={createTalentOpen}

                submitting={mutating}

                managers={managers}

                registeredEmails={registeredTalentEmails}

                pageTalents={talents.items}

                onClose={() => setCreateTalentOpen(false)}

                onSubmitNew={handleCreateTalent}

                onSubmitExisting={handleCreateExistingTalentUser}

            />

            <ChangePasswordModal

                open={passwordTarget != null}

                target={passwordTarget}

                submitting={mutating}

                onClose={() => setPasswordTarget(null)}

                onSubmit={handleChangePassword}

            />

            <DeleteAccountConfirmModal

                open={deleteTarget != null}

                target={deleteTarget}

                onClose={() => setDeleteTarget(null)}

                onConfirm={handleConfirmDelete}

            />

        </WorkspacePageShell>

    );

}


