import { isAxiosError, type AxiosError } from "axios";

const LOOKS_LIKE_HTML = /<!DOCTYPE\s+html|<html[\s>]/i;

/**
 * Raccourcit / remplace les corps d’erreur illisibles (page HTML 500, proxy, n8n) pour les toasts et messages UI.
 */
export function sanitizeApiErrorMessageForUser(raw: string, opts?: { httpStatus?: number }): string {
    const t = raw.trim();
    if (!t) return "";
    if (LOOKS_LIKE_HTML.test(t)) {
        const pre = /<pre[^>]*>([\s\S]*?)<\/pre>/i.exec(t);
        const inner = pre?.[1]?.replace(/<[^>]+>/g, "")?.trim();
        if (inner && inner.length <= 240) {
            const st = opts?.httpStatus;
            return st ? `${inner} (${st})` : inner;
        }
        const st = opts?.httpStatus;
        if (st != null && st >= 500) {
            return "Erreur serveur (réponse HTML, pas JSON). Vérifier les exécutions n8n ou les logs côté API.";
        }
        return "Réponse inattendue du serveur (HTML au lieu d’un message JSON).";
    }
    const max = 900;
    if (t.length > max) return `${t.slice(0, 280)}… (${t.length} caractères)`;
    return t;
}

/** Extrait un message court depuis une erreur Axios ou un objet « à la main » (tests). */
export function readUserFacingApiErrorMessage(error: unknown, fallback: string): string {
    if (isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;
        if (typeof data === "string" && data.trim()) {
            return sanitizeApiErrorMessageForUser(data, { httpStatus: status }) || fallback;
        }
        if (data && typeof data === "object") {
            const dataRecord = data as Record<string, unknown>;
            const message = dataRecord.message ?? dataRecord.error ?? dataRecord.detail;
            if (typeof message === "string" && message.trim()) {
                return sanitizeApiErrorMessageForUser(message, { httpStatus: status }) || fallback;
            }
        }
        if (typeof error.message === "string" && error.message.trim() && !error.message.startsWith("Request failed")) {
            return sanitizeApiErrorMessageForUser(error.message, { httpStatus: status }) || fallback;
        }
        return fallback;
    }
    if (typeof error === "object" && error !== null) {
        const record = error as Record<string, unknown>;
        const response = record.response;
        if (response && typeof response === "object") {
            const responseRecord = response as Record<string, unknown>;
            const data = responseRecord.data;
            const status =
                typeof responseRecord.status === "number" ? responseRecord.status : undefined;
            if (typeof data === "string" && data.trim()) {
                return sanitizeApiErrorMessageForUser(data, { httpStatus: status }) || fallback;
            }
            if (data && typeof data === "object") {
                const dataRecord = data as Record<string, unknown>;
                const message = dataRecord.message ?? dataRecord.error ?? dataRecord.detail;
                if (typeof message === "string" && message.trim()) {
                    return sanitizeApiErrorMessageForUser(message, { httpStatus: status }) || fallback;
                }
            }
        }
        const message = record.message;
        if (typeof message === "string" && message.trim()) {
            return sanitizeApiErrorMessageForUser(message) || fallback;
        }
    }
    return fallback;
}

/** Détail JSON (n8n : `message`, `error`, `detail`) pour les toasts, sans HTML. */
function missionControlJsonDetail(error: AxiosError): string | null {
    const data = error.response?.data;
    if (data == null || typeof data !== "object") return null;
    const r = data as Record<string, unknown>;
    const raw = r.message ?? r.detail ?? r.error;
    if (typeof raw === "string" && raw.trim()) {
        const st = error.response?.status;
        const sanitized = sanitizeApiErrorMessageForUser(raw.trim(), { httpStatus: st });
        if (!sanitized) return null;
        const max = 220;
        return sanitized.length > max ? `${sanitized.slice(0, max)}…` : sanitized;
    }
    return null;
}

/** Messages Mission Control / WF_Manager_Projects : message backend en priorité (sanitisé), sinon libellés par code HTTP. */
export function readMissionControlHttpErrorMessage(error: unknown): string {
    if (!isAxiosError(error)) {
        return readUserFacingApiErrorMessage(error, "Erreur inconnue.");
    }
    const backend = missionControlJsonDetail(error);
    if (backend) return backend;

    const st = error.response?.status;
    const fixed: Record<number, string> = {
        400: "Données invalides.",
        401: "Session expirée.",
        403: "Action non autorisée.",
        404: "Projet ou affectation introuvable.",
        500: "Erreur serveur. Merci de réessayer.",
    };
    if (st != null && fixed[st] != null) return fixed[st];
    return readUserFacingApiErrorMessage(error, "Erreur inconnue.");
}
