/** Boutons rapides RH — label UI → message envoyé à l'API. */
export const RH_COPILOT_QUICK_REPLIES = [
    {
        label: "État des projets ?",
        message: "Donne-moi l'état actuel de tous les projets",
    },
    {
        label: "Quels talents sont en surcharge ?",
        message: "Quels talents sont actuellement en surcharge ?",
    },
    {
        label: "Quels contrats expirent bientôt ?",
        message: "Quels contrats de talents expirent dans les 30 prochains jours ?",
    },
    {
        label: "Demandes RH en attente ?",
        message: "Liste toutes les demandes RH en attente de validation",
    },
    {
        label: "Options d'arbitrage disponibles ?",
        message: "Quelles options d'arbitrage sont disponibles pour les projets en Adjust ?",
    },
] as const;

export function resolveRhQuickReplyMessage(input: string): string {
    const trimmed = input.trim();
    const match = RH_COPILOT_QUICK_REPLIES.find((q) => q.label === trimmed);
    return match?.message ?? trimmed;
}
