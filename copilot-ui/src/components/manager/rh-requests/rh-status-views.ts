export type RhStatusView =
    | "all"
    | "pending"
    | "in_progress"
    | "accepted"
    | "done"
    | "refused_cancelled";

export const RH_STATUS_VIEWS: { id: RhStatusView; label: string }[] = [
    { id: "all", label: "Toutes" },
    { id: "pending", label: "En attente" },
    { id: "in_progress", label: "En cours" },
    { id: "accepted", label: "Acceptées" },
    { id: "done", label: "Terminées" },
    { id: "refused_cancelled", label: "Refusées & annulées" },
];

export function normalizeRhStatusKey(status: string | null | undefined): string {
    return String(status ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/-/g, "_");
}

/** Mapping frontend : statut backend → vue triage (6 vues max). */
export function rhStatusToView(status: string | null | undefined): RhStatusView {
    const s = normalizeRhStatusKey(status);

    if (
        !s ||
        s === "pending" ||
        s === "open" ||
        s === "new" ||
        s === "submitted" ||
        s === "draft" ||
        s === "en_attente"
    ) {
        return "pending";
    }

    if (s === "in_progress" || s.includes("progress") || s.includes("cours") || s.includes("trait")) {
        return "in_progress";
    }

    if (s === "accepted" || s.includes("accept") || s.includes("approved")) {
        return "accepted";
    }

    if (
        s === "done" ||
        s === "completed" ||
        s === "resolved" ||
        s === "closed" ||
        s === "terminee" ||
        s === "terminée" ||
        s === "cloturee" ||
        s === "clôturée" ||
        s.includes("termin") ||
        s.includes("clotur") ||
        s.includes("clôtur")
    ) {
        return "done";
    }

    if (
        s === "rejected" ||
        s === "refused" ||
        s === "cancelled" ||
        s === "canceled" ||
        s === "rejetee" ||
        s === "refusée" ||
        s === "refusee" ||
        s === "annulee" ||
        s === "annulée" ||
        s.includes("reject") ||
        s.includes("refus") ||
        s.includes("declin") ||
        s.includes("annul") ||
        s.includes("cancel")
    ) {
        return "refused_cancelled";
    }

    return "pending";
}

export function matchesRhStatusView(status: string, view: RhStatusView): boolean {
    if (view === "all") return true;
    return rhStatusToView(status) === view;
}

export function sortRankForRhStatus(status: string): number {
    const view = rhStatusToView(status);
    if (view === "pending") return 0;
    if (view === "in_progress") return 1;
    return 2;
}

export const RH_EMPTY_BY_VIEW: Record<RhStatusView, { title: string; description: string }> = {
    all: {
        title: "Aucune demande RH",
        description: "Créez votre première demande via le bouton « Nouvelle demande RH ».",
    },
    pending: {
        title: "Aucune demande en attente",
        description: "Les demandes en attente de traitement RH apparaîtront ici.",
    },
    in_progress: {
        title: "Aucune demande en cours",
        description: "Les demandes actuellement traitées par les RH apparaîtront ici.",
    },
    accepted: {
        title: "Aucune demande acceptée",
        description: "Les demandes acceptées par les RH apparaîtront ici.",
    },
    done: {
        title: "Aucune demande terminée",
        description: "Les demandes clôturées ou terminées apparaîtront ici.",
    },
    refused_cancelled: {
        title: "Aucune demande refusée ou annulée",
        description: "Les demandes refusées, rejetées ou annulées apparaîtront ici.",
    },
};
