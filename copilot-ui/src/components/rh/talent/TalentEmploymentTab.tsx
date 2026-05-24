/**
 * Onglet Emploi & Contrat — fiche administrative RH.
 */
import { TalentEmploymentCard } from "@/components/rh/talent/TalentEmploymentCard";

export type TalentEmploymentTabProps = {
    talentId: string;
    token?: string;
    apiBase?: string;
    onRequestEmploymentEdit?: (mode: "create" | "edit") => void;
};

export function TalentEmploymentTab({
    talentId,
    token,
    apiBase,
    onRequestEmploymentEdit,
}: TalentEmploymentTabProps) {
    return (
        <div className="pb-4">
            <TalentEmploymentCard
                talentId={talentId}
                token={token}
                apiBase={apiBase}
                onRequestEmploymentEdit={onRequestEmploymentEdit}
            />
        </div>
    );
}
