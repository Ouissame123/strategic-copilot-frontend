import type { DecisionLogEntry } from "@/hooks/use-decision-log";

/**
 * Jeu statique **uniquement** pour l’aperçu UI lorsque l’API ne renvoie aucune entrée
 * et que l’utilisateur active « Voir avec données » — aucun calcul métier.
 */
export const DECISION_LOG_PREVIEW_ENTRIES: DecisionLogEntry[] = [
    {
        id: "preview-1",
        date: "2025-03-12T14:32:00.000Z",
        project_id: "00000000-0000-4000-8000-000000000001",
        project_name: "Projet Atlas",
        score: 72,
        decision: "Continue",
        justification:
            "Alignement stratégique correct, charge équipe sous le seuil d’alerte. Poursuite recommandée avec suivi des jalons Q2.",
        confidence: 0.86,
        health_score: 78,
        author: "Copilot",
    },
    {
        id: "preview-2",
        date: "2025-03-10T09:15:00.000Z",
        project_id: "00000000-0000-4000-8000-000000000002",
        project_name: "Initiative Nova",
        score: 54,
        decision: "Adjust",
        justification:
            "Écart sur deux compétences clés ; réallocation partielle ou montée en compétence suggérée avant la prochaine revue.",
        confidence: 0.71,
        health_score: 58,
        author: "Copilot",
    },
    {
        id: "preview-3",
        date: "2025-03-08T16:00:00.000Z",
        project_id: "00000000-0000-4000-8000-000000000003",
        project_name: "Programme Orion",
        score: 41,
        decision: "Stop",
        justification:
            "Seuil de viabilité non atteint : risques cumulés et dépendances critiques. Arrêt ou réorientation nécessaire.",
        confidence: 0.79,
        health_score: 42,
        author: "Copilot",
    },
    {
        id: "preview-4",
        date: "2025-03-05T11:20:00.000Z",
        project_id: "00000000-0000-4000-8000-000000000004",
        project_name: "Lotus — vague 2",
        score: 63,
        decision: "Adjust",
        justification: "Pression capacitaire élevée ; arbitrage sur le périmètre ou renfort temporaire à planifier.",
        confidence: 0.68,
        health_score: 65,
        author: "Copilot",
    },
];
