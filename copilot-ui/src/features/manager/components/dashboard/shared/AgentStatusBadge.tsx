import type { ComponentType, SVGProps } from "react";
import { AlertCircle, CheckCircle, XCircle } from "@untitledui/icons";
import type { AgentStatus } from "@/features/manager/types/dashboard";

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
    if (status === "active") {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="size-3" aria-hidden />
                Actif
            </span>
        );
    }
    if (status === "empty") {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-orange-600">
                <AlertCircle className="size-3" aria-hidden />
                Pas de données
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <XCircle className="size-3" aria-hidden />
            Inactif
        </span>
    );
}
