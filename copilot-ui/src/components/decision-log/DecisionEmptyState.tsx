import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { decisionLogCardClass } from "./decision-log-ui";

type DecisionEmptyStateProps = {
    onReset: () => void;
};

export function DecisionEmptyState({ onReset }: DecisionEmptyStateProps) {
    return (
        <div className={decisionLogCardClass + " p-12 text-center"}>
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-secondary_subtle">
                <Filter className="size-5 text-tertiary" aria-hidden />
            </div>
            <h3 className="text-base font-semibold text-primary">Aucune décision trouvée</h3>
            <p className="mt-1 text-sm text-secondary">Aucun arbitrage ne correspond aux filtres appliqués.</p>
            <Button type="button" color="secondary" size="sm" className="mt-4" onClick={onReset}>
                <RotateCcw className="mr-2 size-3.5" aria-hidden />
                Réinitialiser les filtres
            </Button>
        </div>
    );
}
