import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { TalentProfile } from "@/types/rh-talents-profile.types";

type TalentToggleConfirmProps = {
    talent: TalentProfile | null;
    onClose: () => void;
    onConfirm: (t: TalentProfile) => void;
    isPending?: boolean;
};

export function TalentToggleConfirm({ talent, onClose, onConfirm, isPending }: TalentToggleConfirmProps) {
    if (!talent) return null;
    const activating = talent.status === "inactive";

    return (
        <ConfirmDialog
            isOpen={Boolean(talent)}
            onOpenChange={(open) => !open && onClose()}
            title={activating ? "Réactiver le talent ?" : "Désactiver le talent ?"}
            body={
                <>
                    <p>
                        {activating
                            ? `Réactiver « ${talent.name} » ?`
                            : `Désactiver « ${talent.name} » ? Le statut sera basculé côté serveur.`}
                    </p>
                </>
            }
            confirmLabel={activating ? "Réactiver" : "Désactiver"}
            cancelLabel="Annuler"
            onConfirm={() => onConfirm(talent)}
            isConfirmLoading={isPending}
        />
    );
}

type TalentDeleteConfirmProps = {
    talent: TalentProfile | null;
    onClose: () => void;
    onConfirm: (t: TalentProfile) => void;
    isPending?: boolean;
};

export function TalentDeleteConfirm({ talent, onClose, onConfirm, isPending }: TalentDeleteConfirmProps) {
    if (!talent) return null;

    return (
        <ConfirmDialog
            isOpen={Boolean(talent)}
            onOpenChange={(open) => !open && onClose()}
            title="Supprimer le profil talent ?"
            tone="danger"
            body={
                <>
                    <p>
                        Soft delete de <strong>{talent.name}</strong> — le talent passera en inactif et les
                        affectations actives seront terminées automatiquement.
                    </p>
                    <p className="mt-2 text-xs text-tertiary">
                        Cette action est irréversible pour les affectations en cours.
                    </p>
                </>
            }
            confirmLabel="Confirmer la suppression"
            cancelLabel="Annuler"
            onConfirm={() => onConfirm(talent)}
            isConfirmLoading={isPending}
        />
    );
}
