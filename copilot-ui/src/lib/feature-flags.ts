/** Feature flags front — activation via variables VITE_*. */
export const FEATURES = {
    USE_HELPER_V3: import.meta.env.VITE_USE_HELPER_V3 === "true",
    USE_MANAGER_COPILOT_V3: import.meta.env.VITE_USE_MANAGER_COPILOT_V3 === "true",
} as const;

function hashUserId(userId: string): number {
 let hash = 0;
 for (let i = 0; i < userId.length; i++) {
 hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
 }
 return Math.abs(hash) % 100;
}

function isInRollout(userId: string | null | undefined, rolloutPct: number): boolean {
 if (!Number.isFinite(rolloutPct) || rolloutPct >= 100) return true;
 if (rolloutPct <= 0) return false;
 if (!userId?.trim()) return rolloutPct >= 100;
 return hashUserId(userId.trim()) < rolloutPct;
}

/** Rollout progressif Helper v3 — VITE_HELPER_V3_ROLLOUT_PCT (défaut 100). */
export function shouldUseHelperV3(userId?: string | null): boolean {
 if (!FEATURES.USE_HELPER_V3) return false;
 const rolloutPct = Number(import.meta.env.VITE_HELPER_V3_ROLLOUT_PCT ?? 100);
 return isInRollout(userId, rolloutPct);
}

/** Rollout progressif Copilot Manager v3 — VITE_MANAGER_COPILOT_V3_ROLLOUT_PCT (défaut 100). */
export function shouldUseManagerCopilotV3(userId?: string | null): boolean {
 if (!FEATURES.USE_MANAGER_COPILOT_V3) return false;
 const rolloutPct = Number(import.meta.env.VITE_MANAGER_COPILOT_V3_ROLLOUT_PCT ?? 100);
 return isInRollout(userId, rolloutPct);
}
