import { useState } from "react";
import { Key, Trash2, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { DeleteTalentConfirmDialog } from "@/components/rh/accounts/page/DeleteTalentConfirmDialog";
import { ResetPasswordDialog } from "@/components/rh/accounts/page/ResetPasswordDialog";
import { useToggleTalentStatus } from "@/hooks/useRhAccounts";
import { isTalentActive } from "@/lib/rh-accounts-display";
import type { RhTalentAccount } from "@/types/rh-accounts.types";
import { formatDateFR } from "@/utils/format";

type TalentDrawerProps = {
    talent: RhTalentAccount;
    onClose: () => void;
    onGrantAccess?: (talent: RhTalentAccount) => void;
};

export function TalentDrawer({ talent, onClose, onGrantAccess }: TalentDrawerProps) {
    const navigate = useNavigate();
    const toggle = useToggleTalentStatus();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [resetOpen, setResetOpen] = useState(false);
    const active = isTalentActive(talent.status);
    const seniority = talent.seniority_level ?? talent.seniority;
    const hasPortalAccess = talent.has_portal_access === true;

    return (
        <>
            <button type="button" className="fixed inset-0 z-40 bg-overlay/60 backdrop-blur-[2px]" aria-label="Fermer" onClick={onClose} />
            <aside
                className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-[420px] flex-col border-l border-secondary bg-primary shadow-2xl"
                role="dialog"
                aria-modal="true"
            >
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-secondary px-4 py-3">
                    <h2 className="line-clamp-2 text-base font-semibold text-primary">{talent.name}</h2>
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
                            <span className="text-slate-500">Email :</span> {talent.email}
                        </p>
                        <p>
                            <span className="text-slate-500">Métier :</span> {talent.job_title}
                        </p>
                        <p>
                            <span className="text-slate-500">Département :</span> {talent.department || "—"}
                        </p>
                        <p>
                            <span className="text-slate-500">Séniorité :</span> {seniority || "—"}
                        </p>
                        <p>
                            <span className="text-slate-500">Manager :</span>{" "}
                            {talent.has_manager ? talent.manager_name || "—" : <span className="text-amber-700">⚠ Aucun</span>}
                        </p>
                        {talent.contract_end_date ? (
                            <p>
                                <span className="text-slate-500">Fin de contrat :</span> {formatDateFR(talent.contract_end_date)}
                            </p>
                        ) : null}
                        <p>
                            <span className="text-slate-500">Statut :</span>{" "}
                            {active ? <span className="text-emerald-700">Actif</span> : <span className="text-slate-500">Inactif</span>}
                        </p>
                        {talent.has_portal_access !== undefined ? (
                            <p>
                                <span className="text-slate-500">Accès portail :</span>{" "}
                                {hasPortalAccess ? (
                                    <span className="text-emerald-700">Actif</span>
                                ) : (
                                    <span className="text-slate-500">Sans accès</span>
                                )}
                            </p>
                        ) : null}
                    </section>

                    <section className="space-y-2">
                        <h4 className="text-xs uppercase tracking-widest text-slate-500">Actions</h4>
                        {hasPortalAccess ? (
                            <Button color="secondary" className="w-full justify-start gap-2" onPress={() => setResetOpen(true)}>
                                <Key size={14} aria-hidden /> Réinitialiser le mot de passe
                            </Button>
                        ) : (
                            <Button
                                color="secondary"
                                className="w-full justify-start gap-2"
                                onPress={() => onGrantAccess?.(talent)}
                            >
                                <UserPlus size={14} aria-hidden /> Donner accès portail
                            </Button>
                        )}
                        <Button
                            color={active ? "secondary" : "primary"}
                            className="w-full"
                            isLoading={toggle.isPending}
                            onPress={() => void toggle.mutateAsync({ talentId: talent.id })}
                        >
                            {active ? "Désactiver le talent" : "Activer le talent"}
                        </Button>
                        <Button
                            color="secondary"
                            className="w-full"
                            onPress={() => {
                                navigate(`/workspace/rh/employees?talentId=${encodeURIComponent(talent.id)}`);
                                onClose();
                            }}
                        >
                            Voir la fiche complète
                        </Button>
                        <Button color="secondary-destructive" className="w-full justify-start gap-2" onPress={() => setDeleteOpen(true)}>
                            <Trash2 size={14} aria-hidden /> Supprimer (désactivation définitive)
                        </Button>
                    </section>
                </div>
            </aside>

            <ResetPasswordDialog open={resetOpen} onOpenChange={setResetOpen} talent={talent} />

            <DeleteTalentConfirmDialog
                isOpen={deleteOpen}
                talent={talent}
                onClose={() => setDeleteOpen(false)}
                onSuccess={onClose}
            />
        </>
    );
}
