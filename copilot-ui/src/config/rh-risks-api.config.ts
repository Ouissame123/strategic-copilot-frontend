import {
    RH_RISKS_CREATE_ACTION_URL_DEV,
    RH_RISKS_CREATE_ACTION_URL_PRODUCTION,
    RH_RISKS_LIST_URL_DEV,
    RH_RISKS_LIST_URL_PRODUCTION,
    RH_RISKS_SUMMARY_URL_DEV,
    RH_RISKS_SUMMARY_URL_PRODUCTION,
    RH_RISKS_TALENT_URL_DEV,
    RH_RISKS_TALENT_URL_PRODUCTION,
} from "@/api/rh-risks.constants";

function readEnvUrl(key: string): string | undefined {
    const v = (import.meta.env as Record<string, string | undefined>)[key];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function resolveUrl(envKey: string, prod: string, dev: string): string {
    return readEnvUrl(envKey) ?? (import.meta.env.PROD ? prod : dev);
}

/** GET `/webhook/rh/risks` */
export function getRhRisksListUrl(): string {
    return resolveUrl("VITE_RH_RISKS_LIST_URL", RH_RISKS_LIST_URL_PRODUCTION, RH_RISKS_LIST_URL_DEV);
}

/** GET `/webhook/rh/risks/summary` */
export function getRhRisksSummaryUrl(): string {
    return resolveUrl("VITE_RH_RISKS_SUMMARY_URL", RH_RISKS_SUMMARY_URL_PRODUCTION, RH_RISKS_SUMMARY_URL_DEV);
}

/** GET `…/webhook/wf-rh-risks-talent-v1/rh/risks/talent/:talentId` */
export function getRhRisksTalentUrl(talentId: string): string {
    const base = resolveUrl("VITE_RH_RISKS_TALENT_URL", RH_RISKS_TALENT_URL_PRODUCTION, RH_RISKS_TALENT_URL_DEV);
    return `${base.replace(/\/$/, "")}/${encodeURIComponent(talentId)}`;
}

/** POST `/webhook/rh/risks/create-action` */
export function getRhRisksCreateActionUrl(): string {
    return resolveUrl(
        "VITE_RH_RISKS_CREATE_ACTION_URL",
        RH_RISKS_CREATE_ACTION_URL_PRODUCTION,
        RH_RISKS_CREATE_ACTION_URL_DEV,
    );
}
