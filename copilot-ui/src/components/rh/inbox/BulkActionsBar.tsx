import { Check, UserPlus, X } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/base/buttons/button";

type BulkActionsBarProps = {
    count: number;
    onAccept: () => void;
    onReject: () => void;
    onClear: () => void;
    isLoading?: boolean;
};

export function BulkActionsBar({ count, onAccept, onReject, onClear, isLoading }: BulkActionsBarProps) {
    if (count <= 0) return null;

    return (
        <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-ws-border bg-ws-card px-4 py-3 shadow-lg"
        >
            <span className="text-sm font-medium text-ws-primary">{count} sélectionnée{count > 1 ? "s" : ""}</span>
            <div className="h-4 w-px bg-ws-border" aria-hidden />
            <Button size="sm" color="tertiary" isDisabled={isLoading} onPress={onAccept}>
                <Check className="mr-1 size-3" aria-hidden />
                Accepter
            </Button>
            <Button size="sm" color="tertiary" isDisabled={isLoading} onPress={onReject}>
                <X className="mr-1 size-3" aria-hidden />
                Rejeter
            </Button>
            <Button size="sm" color="tertiary" isDisabled title="Bientôt disponible">
                <UserPlus className="mr-1 size-3" aria-hidden />
                Assigner
            </Button>
            <div className="h-4 w-px bg-ws-border" aria-hidden />
            <button
                type="button"
                aria-label="Effacer la sélection"
                onClick={onClear}
                className="rounded p-1 text-ws-muted hover:bg-ws-subtle hover:text-ws-primary"
            >
                <X className="size-4" />
            </button>
        </motion.div>
    );
}
