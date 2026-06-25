import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { useTriggerNotificationsScan } from "@/hooks/use-rh-notifications";

export function TriggerScanButton() {
    const trigger = useTriggerNotificationsScan();

    return (
        <Tooltip title="Endpoint deprecated — sera remplacé par le cron Watchdog (PDF strict §3)." delay={300}>
            <TooltipTrigger className="inline-flex outline-hidden">
                <Button
                    color="secondary"
                    size="sm"
                    isDisabled={trigger.isPending}
                    onPress={() => void trigger.mutateAsync()}
                >
                    {trigger.isPending ? (
                        <Loader2 className="mr-1 size-3 animate-spin" aria-hidden />
                    ) : (
                        <Sparkles className="mr-1 size-3" aria-hidden />
                    )}
                    Scanner maintenant
                    <AlertTriangle className="ml-1.5 size-3 text-amber-500" aria-label="Endpoint deprecated" />
                </Button>
            </TooltipTrigger>
        </Tooltip>
    );
}
