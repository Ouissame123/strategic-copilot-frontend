/** Libellés de questions suggérées pour le chat Copilot selon la clé de page (`useCopilotPage` données). */
export function getSuggestedQuestions(page: string): string[] {
    const suggestions: Record<string, string[]> = {
        manager_dashboard: [
            "Quel projet est le plus à risque ?",
            "Quels projets nécessitent une action immédiate ?",
            "Résume l'état du portefeuille en 3 points.",
        ],
        manager_projects: [
            "Quels projets dois-je prioriser cette semaine ?",
            "Y a-t-il des décisions Stop à traiter en priorité ?",
            "Résume la liste des projets visibles.",
        ],
        manager_project_detail: [
            "Quel est le principal risque de ce projet ?",
            "Que recommandes-tu comme prochaine action ?",
            "Ce projet devrait-il être arrêté ou ajusté ?",
        ],
        project_detail_workspace: [
            "Quels sont les risques principaux sur ce projet ?",
            "Que recommandes-tu comme prochaine étape ?",
        ],
        rh_dashboard: [
            "Quels talents sont en surcharge ?",
            "Quels gaps de compétences sont critiques ?",
            "Qui peut être réaffecté sans impact ?",
        ],
        talent_workspace: [
            "Quelle est ma tâche la plus urgente ?",
            "Quelles compétences devrais-je développer ?",
            "Suis-je en surcharge cette semaine ?",
        ],
    };
    return (
        suggestions[page] ?? [
            "Analyse la situation actuelle.",
            "Que recommandes-tu ?",
        ]
    );
}
