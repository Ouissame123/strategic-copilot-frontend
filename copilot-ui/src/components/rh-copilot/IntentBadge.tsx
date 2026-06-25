import type { RhIntent } from "@/api/rh-copilot.types";
import { cx } from "@/utils/cx";

const INTENT_LABELS: Record<RhIntent, string> = {
    salutation: "Accueil",
    charge_dispo: "Charge & disponibilité",
    etat_projets: "État projets",
    risques_alertes: "Risques & alertes",
    arbitrage: "Arbitrage stratégique",
    talent_par_competence: "Recherche compétence",
    talent_detail: "Profil talent",
    validation_rh: "Validations RH",
    mobilite: "Mobilité interne",
    gaps_competences: "Gaps compétences",
    liste_talents: "Effectif",
    contrats_fin: "Contrats expirants",
    demandes_rh: "Demandes RH",
    notifications: "Notifications",
    aide_generale: "Aide générale",
};

export function IntentBadge({ intent }: { intent: RhIntent | null }) {
    if (!intent) return null;
    return (
        <span
            className={cx(
                "inline-flex h-5 items-center rounded-full border border-secondary px-1.5 text-[10px] font-medium text-fg-secondary",
            )}
        >
            {INTENT_LABELS[intent] ?? intent}
        </span>
    );
}
