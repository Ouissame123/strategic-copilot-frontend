import { Download, RefreshCcw } from "lucide-react";
import { Button } from "@/components/base/buttons/button";

type DecisionLogHeaderProps = {
    onExport: () => void;
    onRefresh: () => void;
    exportDisabled?: boolean;
    refreshDisabled?: boolean;
};

export function DecisionLogHeader({
    onExport,
    onRefresh,
    exportDisabled,
    refreshDisabled,
}: DecisionLogHeaderProps) {
    return (
        <header className="sticky top-0 z-30 border-b border-secondary/80 bg-primary/95 backdrop-blur-sm">
            <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-end gap-2 px-4 sm:px-6">
                <Button type="button" color="secondary" size="sm" onClick={onRefresh} isDisabled={refreshDisabled}>
                    <RefreshCcw className="mr-1.5 size-3.5" aria-hidden />
                    Actualiser
                </Button>
                <Button type="button" color="primary" size="sm" onClick={onExport} isDisabled={exportDisabled}>
                    <Download className="mr-1.5 size-3.5" aria-hidden />
                    Exporter CSV
                </Button>
            </div>
        </header>
    );
}
