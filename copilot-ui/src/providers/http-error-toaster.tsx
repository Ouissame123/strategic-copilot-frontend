import { useEffect } from "react";
import { useToast } from "./toast-provider";

export function HttpErrorToaster() {
    const { push } = useToast();

    useEffect(() => {
        const handler = (event: Event) => {
            const customEvent = event as CustomEvent<{ status?: number }>;
            const status = customEvent.detail?.status;
            if (status === 403) {
                push("Accès refusé", "error");
                return;
            }
            if (status != null && status >= 500) {
                push("Erreur serveur, merci de réessayer.", "error");
            }
        };
        window.addEventListener("http:error", handler);
        return () => window.removeEventListener("http:error", handler);
    }, [push]);

    return null;
}
