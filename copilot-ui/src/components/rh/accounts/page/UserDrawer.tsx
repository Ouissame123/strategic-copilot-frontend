import { useState } from "react";
import { KeyRound, Pause, Play, Trash2, X } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { ChangePasswordDialog } from "@/components/rh/accounts/page/ChangePasswordDialog";
import { DeleteUserConfirmDialog } from "@/components/rh/accounts/page/DeleteUserConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { useToggleUserStatus } from "@/hooks/useRhAccounts";
import { ROLE_BADGE, isUserActive } from "@/lib/rh-accounts-display";
import type { RhStaffAccount } from "@/types/rh-accounts.types";
import { formatDateFR, formatDateRelative } from "@/utils/format";
import { cx } from "@/utils/cx";

type UserDrawerProps = {
    user: RhStaffAccount;
    onClose: () => void;
};

export function UserDrawer({ user, onClose }: UserDrawerProps) {
    const { user: currentUser } = useAuth();
    const toggle = useToggleUserStatus();
    const [pwdOpen, setPwdOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const active = isUserActive(user.status);
    const badge = ROLE_BADGE[user.role];
    const isSelf = Boolean(currentUser?.id && currentUser.id === user.id);

    return (
        <>
            <button type="button" className="fixed inset-0 z-40 bg-overlay/60 backdrop-blur-[2px]" aria-label="Fermer" onClick={onClose} />
            <aside
                className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-[420px] flex-col border-l border-secondary bg-primary shadow-2xl"
                role="dialog"
                aria-modal="true"
            >
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-secondary px-4 py-3">
                    <h2 className="line-clamp-2 text-base font-semibold text-primary">{user.full_name}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-lg p-2 text-tertiary hover:bg-secondary_subtle"
                        aria-label="Fermer"
                    >
                        <X className="size-5" aria-hidden />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
                    <section className="space-y-1 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
                        <p>
                            <span className="text-slate-500">Email :</span> {user.email}
                        </p>
                        <p>
                            <span className="text-slate-500">Rôle :</span>{" "}
                            <span className={cx("rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase", badge.className)}>
                                {badge.label}
                            </span>
                        </p>
                        <p>
                            <span className="text-slate-500">Statut :</span>{" "}
                            {active ? <span className="text-emerald-700">Actif</span> : <span className="text-slate-500">Désactivé</span>}
                        </p>
                        {user.role === "manager" ? (
                            <p>
                                <span className="text-slate-500">Talents managés :</span> {user.managed_talents_count}
                            </p>
                        ) : null}
                        <p className="mt-2 text-xs text-slate-400">
                            Créé le {formatDateFR(user.created_at)} · MAJ {formatDateRelative(user.updated_at)}
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h4 className="text-xs uppercase tracking-widest text-slate-500">Actions</h4>
                        {isSelf ? (
                            <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
                                Vous ne pouvez pas désactiver ni supprimer votre propre compte.
                            </p>
                        ) : null}
                        <Button color="secondary" className="w-full justify-start gap-2" onPress={() => setPwdOpen(true)}>
                            <KeyRound size={14} aria-hidden /> Changer le mot de passe
                        </Button>
                        <Button
                            color={active ? "secondary" : "primary"}
                            className="w-full justify-start gap-2"
                            isDisabled={isSelf}
                            isLoading={toggle.isPending}
                            onPress={() => void toggle.mutateAsync({ userId: user.id })}
                        >
                            {active ? (
                                <>
                                    <Pause size={14} aria-hidden /> Désactiver le compte
                                </>
                            ) : (
                                <>
                                    <Play size={14} aria-hidden /> Activer le compte
                                </>
                            )}
                        </Button>
                        <Button
                            color="secondary-destructive"
                            className="w-full justify-start gap-2"
                            isDisabled={isSelf}
                            onPress={() => setDeleteOpen(true)}
                        >
                            <Trash2 size={14} aria-hidden /> Supprimer (désactivation définitive)
                        </Button>
                    </section>
                </div>
            </aside>

            <ChangePasswordDialog isOpen={pwdOpen} userId={user.id} onClose={() => setPwdOpen(false)} />
            <DeleteUserConfirmDialog
                isOpen={deleteOpen}
                user={user}
                onClose={() => setDeleteOpen(false)}
                onSuccess={onClose}
            />
        </>
    );
}
