import { RhCopilotApiError } from "@/api/rh-copilot.api";
import { ApiError } from "@/api/errors";

export type RhChatToastMessage =
    | "Erreur de connexion"
    | "Conversation introuvable"
    | "Erreur serveur"
    | "Timeout";

export function mapRhChatErrorToToast(err: unknown): RhChatToastMessage | string {
    if (err instanceof RhCopilotApiError) {
        if (err.code === "TOKEN_EXPIRED" || err.code === "MISSING_BEARER") {
            return err.message;
        }
        if (err.httpStatus === 404 || err.code === "SESSION_NOT_FOUND" || err.code === "CONVERSATION_NOT_FOUND") {
            return "Conversation introuvable";
        }
        if (err.httpStatus != null && err.httpStatus >= 500) {
            return "Erreur serveur";
        }
        return err.message || "Erreur serveur";
    }
    if (err instanceof ApiError) {
        if (err.status === 408 || err.message.toLowerCase().includes("délai")) {
            return "Timeout";
        }
        if (err.status === 404) {
            return "Conversation introuvable";
        }
        if (err.status != null && err.status >= 500) {
            return "Erreur serveur";
        }
        if (err.message.toLowerCase().includes("fetch") || err.message.toLowerCase().includes("réseau")) {
            return "Erreur de connexion";
        }
        return err.message || "Erreur serveur";
    }
    if (err instanceof Error) {
        if (err.name === "AbortError") return "Timeout";
        if (err.message.toLowerCase().includes("fetch")) return "Erreur de connexion";
        return err.message;
    }
    return "Erreur de connexion";
}
