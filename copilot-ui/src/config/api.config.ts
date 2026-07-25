export const API_CONFIG = {
    WEBHOOK_PREFIX: "/webhook",
    TIMEOUT_MS: 30_000,
    /** WF_What_If ~50s+ — dépasse le timeout HTTP global (30s). */
    WHAT_IF_TIMEOUT_MS: 120_000,
    /** WF_Strategic_Orchestrator_v2 — latence réelle jusqu'à ~50s. */
    ORCHESTRATOR_ASK_TIMEOUT_MS: 90_000,
    ACCESS_TOKEN_KEY: "access_token",
    REFRESH_TOKEN_KEY: "refresh_token",
} as const;
