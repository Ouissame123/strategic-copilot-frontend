import { httpClient } from "../lib/http-client";
import {
    isV4FactualDashboardRoot,
    normalizeManagerDashboardV4Response,
    pickV4DashboardRoot,
} from "@/features/manager/lib/dashboard-v4-normalize";
import type { ManagerDashboardV4Response } from "@/features/manager/types/dashboard-v4";

const DASHBOARD_PATH = "/webhook/manager/dashboard";

/** GET `/webhook/manager/dashboard` — contrat `v4_factual` (portefeuille factuel, sans agents). */
export const managerDashboardApi = {
    get: async (scope?: "mine" | "enterprise") => {
        const params = scope ? { scope } : undefined;
        const response = await httpClient.get<unknown>(DASHBOARD_PATH, { params });

        if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.debug("[WF_Manager_Dashboard]", {
                url: response.config.url,
                params,
                auth: Boolean(response.config.headers?.Authorization),
                raw: response.data,
            });
        }

        const root = pickV4DashboardRoot(response.data);
        if (!isV4FactualDashboardRoot(root)) {
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.error("[WF_Manager_Dashboard] portfolio manquant — réponse non v4_factual", {
                    url: response.config.url,
                    raw: response.data,
                    pickedKeys: Object.keys(root),
                });
            }
            throw new Error(
                "Réponse dashboard invalide ou vide (champ portfolio manquant). Vérifiez l’URL, le JWT et le scope.",
            );
        }

        return {
            ...response,
            data: normalizeManagerDashboardV4Response(response.data) as ManagerDashboardV4Response,
        };
    },
};

export type { ManagerDashboardV4Response };
