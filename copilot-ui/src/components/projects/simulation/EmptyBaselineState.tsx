import { AlertCircle, Play } from "lucide-react";
import { Button } from "@/components/base/buttons/button";

type EmptyBaselineStateProps = {
    onLaunchAnalysis: () => void;
    isLaunching?: boolean;
};

export function EmptyBaselineState({ onLaunchAnalysis, isLaunching = false }: EmptyBaselineStateProps) {
    return (
        <section className="rounded-xl border border-secondary bg-primary p-8 text-center shadow-sm">
            <AlertCircle className="mx-auto mb-3 size-12 text-orange-500" aria-hidden />
            <h3 className="text-lg font-semibold text-fg-primary">Pas de score initial</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-fg-tertiary">
                Pour pouvoir simuler des scénarios, il faut d&apos;abord{" "}
                <strong className="font-semibold text-fg-secondary">lancer une analyse normale du projet</strong> (Watchdog +
                Matchmaker + Viability) pour obtenir un score baseline.
            </p>
            <Button
                type="button"
                color="primary"
                size="md"
                className="mt-4"
                iconLeading={Play}
                isLoading={isLaunching}
                aria-label="Lancer une analyse du projet maintenant"
                onClick={onLaunchAnalysis}
            >
                Lancer une analyse maintenant
            </Button>
        </section>
    );
}
