import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { DensityToggle, type DecisionLogDensity } from "@/components/decision-log/DensityToggle";

type ValidationsHeaderProps = {
    title?: string;
    subtitle?: string;
    onRefresh: () => void;
    density: DecisionLogDensity;
    onDensityChange: (value: DecisionLogDensity) => void;
    loading?: boolean;
};

export function ValidationsHeader({
    title = "Validations Copilot",
    subtitle = "Décisions IA qui attendent ta validation. Triées par priorité du système.",
    onRefresh,
    density,
    onDensityChange,
    loading,
}: ValidationsHeaderProps) {
    return (
        <header className="sticky top-0 z-30 border-b border-secondary/80 bg-primary/95 backdrop-blur-sm">
            <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6">
                <div className="min-w-0">
                    <h1 className="truncate text-2xl font-semibold tracking-tight text-primary">{title}</h1>
                    <p className="truncate text-xs text-secondary">{subtitle}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <DensityToggle value={density} onChange={onDensityChange} />
                    <Button type="button" color="secondary" size="sm" onClick={onRefresh} isDisabled={loading} isLoading={loading}>
                        <RefreshCcw className="mr-1.5 size-3.5" aria-hidden />
                        Rafraîchir
                    </Button>
                </div>
            </div>
        </header>
    );
}
