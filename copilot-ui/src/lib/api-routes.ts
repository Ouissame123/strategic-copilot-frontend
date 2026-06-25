/**
 * SEULE SOURCE DE VÉRITÉ pour les URLs n8n manager / copilot.
 * Toute modification d'URL passe par ICI uniquement.
 *
 * Pattern :
 * - URLs backend actuelles conservées (audit) → migration progressive possible
 * - Override via env var pour A/B testing ou rollback rapide
 */
import { readEnv, trimUrl } from "@/config/resolve-api-url";

const ENV = import.meta.env;

function encodePathSegment(raw: string, label: string): string {
    const id = String(raw ?? "").trim();
    if (!id) throw new Error(`Missing ${label}`);
    const lower = id.toLowerCase();
    if (lower === ":id" || lower === `:${label.toLowerCase()}` || lower === ":projectid" || lower === ":taskid" || lower === ":talentid") {
        throw new Error(`Invalid ${label} placeholder`);
    }
    return encodeURIComponent(id);
}

/** Préfixe webhook avec overrides env + layout prod (`VITE_API_BASE_URL` = …/webhook). */
function resolvePrefix(envKeys: string[], defaultWebhookPath: string): string {
    for (const key of envKeys) {
        const explicit = readEnv(key)?.trim().replace(/\/$/, "");
        if (explicit) return explicit;
    }
    const apiBase = trimUrl(ENV.VITE_API_BASE_URL as string | undefined);
    if (apiBase) {
        const slug = defaultWebhookPath.replace(/^\/webhook\//, "");
        return `${apiBase}/${slug}`;
    }
    return defaultWebhookPath;
}

function resolveManagerProjectsBase(): string {
    const apiBase = trimUrl(ENV.VITE_API_BASE_URL as string | undefined);
    if (apiBase) return `${apiBase}/manager/projects`;
    return "/webhook/manager/projects";
}

function resolveHelperChatPath(): string {
    const fromEnv = readEnv("VITE_HELPER_CHAT_URL");
    if (fromEnv) return fromEnv;
    return "/webhook/api/helper/chat-v2";
}

function resolveHelperChatV3Path(): string {
    const fromEnv = readEnv("VITE_HELPER_CHAT_V3_URL");
    if (fromEnv) return fromEnv;
    return "/webhook/api/helper/chat-v3";
}

function resolveSkillsCatalogPath(): string {
    const fromEnv = readEnv("VITE_RH_SKILLS_CATALOG_URL");
    if (fromEnv) return fromEnv.replace(/\/$/, "");
    return "/webhook/rh/skills/catalog";
}

// ─────────────────────────────────────────────────────────
// CONSTANTS — Préfixes webhook actuels (résolus au chargement)
// ─────────────────────────────────────────────────────────

const PREFIX = {
    managerProjects: resolveManagerProjectsBase(),
    wmpDetail: resolvePrefix(
        ["VITE_WMP_DETAIL_PREFIX", "VITE_WMP_DETAIL_PROJECTS_PREFIX"],
        "/webhook/wmp-detail-v1/manager/projects",
    ),
    wmpUpdate: resolvePrefix(
        ["VITE_WMP_UPDATE_PREFIX", "VITE_WMP_UPDATE_PROJECTS_PREFIX"],
        "/webhook/wmp-update-v1/manager/projects",
    ),
    wmpDelete: resolvePrefix(
        ["VITE_WMP_DELETE_PREFIX", "VITE_WMP_DELETE_PROJECTS_PREFIX"],
        "/webhook/wmp-delete-v1/manager/projects",
    ),
    wmpAssign: resolvePrefix(["VITE_WMP_ASSIGN_PREFIX", "VITE_WMP_ASSIGN_PROJECTS_PREFIX"], "/webhook/wmp-assign-v1/manager/projects"),
    wmpUnassign: resolvePrefix(
        ["VITE_WMP_UNASSIGN_PREFIX", "VITE_WMP_UNASSIGN_PROJECTS_PREFIX"],
        "/webhook/wmp-unassign-v1/manager/projects",
    ),
    budgetGet: resolvePrefix("VITE_MGR_BUDGET_GET_PREFIX", "/webhook/mgr-budget-get/manager/projects"),
    budgetPatch: resolvePrefix("VITE_MGR_BUDGET_PATCH_PREFIX", "/webhook/mgr-budget-patch/manager/projects"),
    budgetReset: resolvePrefix("VITE_MGR_BUDGET_RESET_PREFIX", "/webhook/mgr-budget-reset/manager/projects"),
    budgetHistory: resolvePrefix("VITE_MGR_BUDGET_HISTORY_PREFIX", "/webhook/mgr-budget-history/manager/projects"),
    taskList: resolvePrefix(["VITE_WMT_LIST_PREFIX", "VITE_WMP_TASKS_PROJECTS_PREFIX"], "/webhook/wmt-list-v1/manager/projects"),
    taskCreate: resolvePrefix("VITE_WMT_CREATE_PREFIX", "/webhook/wmt-create-v1/manager/projects"),
    taskUpdate: resolvePrefix("VITE_WMT_UPDATE_PREFIX", "/webhook/wmt-update-v1/manager/projects"),
    taskComplete: resolvePrefix("VITE_WMT_COMPLETE_PREFIX", "/webhook/wmt-complete-v1/manager/projects"),
    taskDelete: resolvePrefix("VITE_WMT_DELETE_PREFIX", "/webhook/wmt-delete-v1/manager/projects"),
    reqList: resolvePrefix("VITE_MGR_PR_REQ_LIST_PREFIX", "/webhook/wf-mgr-pr-req-list/manager/projects"),
    reqCreate: resolvePrefix("VITE_MGR_PR_REQ_CREATE_PREFIX", "/webhook/wf-mgr-pr-req-create/manager/projects"),
    reqUpdate: resolvePrefix("VITE_MGR_PR_REQ_UPDATE_PREFIX", "/webhook/wf-mgr-pr-req-update/manager/projects"),
    reqDelete: resolvePrefix("VITE_MGR_PR_REQ_DELETE_PREFIX", "/webhook/wf-mgr-pr-req-delete/manager/projects"),
    teamDetail: resolvePrefix(["VITE_WMT_DETAIL_PREFIX", "VITE_MANAGER_TEAM_DETAIL_PREFIX"], "/webhook/wmt-detail-v1/manager/team"),
    convDetail: resolvePrefix("VITE_N8N_WEBHOOK_CONV_DETAIL", "/webhook/wmc-detail-v1/manager/conversations"),
    convArchive: resolvePrefix("VITE_N8N_WEBHOOK_CONV_ARCHIVE", "/webhook/wmc-archive-v1/manager/conversations"),
    alertPatch: resolvePrefix("VITE_WMN_ALERT_PREFIX", "/webhook/wmn-alert-v3/manager/risk-alerts"),
    helperChat: resolveHelperChatPath(),
    helperChatV3: resolveHelperChatV3Path(),
    skillsCatalog: resolveSkillsCatalogPath(),
} as const;

/** Base PATCH risk alerts — export rétrocompat `MANAGER_RISK_ALERTS_PATH`. */
export const RISK_ALERTS_BASE_PATH = PREFIX.alertPatch;

// ─────────────────────────────────────────────────────────
// ROUTES — Fonctions paramétrées (single source of truth)
// ─────────────────────────────────────────────────────────

export const API_ROUTES = {
    // ────── A. Projects core ──────
    projectsList: () => PREFIX.managerProjects,
    projectDetail: (id: string) => `${PREFIX.wmpDetail}/${encodePathSegment(id, "projectId")}`,
    projectCreate: () => PREFIX.managerProjects,
    projectUpdate: (id: string) => `${PREFIX.wmpUpdate}/${encodePathSegment(id, "projectId")}`,
    projectDelete: (id: string) => `${PREFIX.wmpDelete}/${encodePathSegment(id, "projectId")}`,
    projectAssign: (id: string) => `${PREFIX.wmpAssign}/${encodePathSegment(id, "projectId")}/assignments`,
    projectUnassign: (id: string, talentId: string) =>
        `${PREFIX.wmpUnassign}/${encodePathSegment(id, "projectId")}/assignments/${encodePathSegment(talentId, "talentId")}`,

    // ────── B. Budget ──────
    budgetGet: (id: string) => `${PREFIX.budgetGet}/${encodePathSegment(id, "projectId")}/budget`,
    budgetPatch: (id: string) => `${PREFIX.budgetPatch}/${encodePathSegment(id, "projectId")}/budget`,
    budgetReset: (id: string) => `${PREFIX.budgetReset}/${encodePathSegment(id, "projectId")}/budget/reset`,
    budgetHistory: (id: string) => `${PREFIX.budgetHistory}/${encodePathSegment(id, "projectId")}/budget/history`,

    // ────── C. Tasks ──────
    taskList: (id: string) => `${PREFIX.taskList}/${encodePathSegment(id, "projectId")}/tasks`,
    taskCreate: (id: string) => `${PREFIX.taskCreate}/${encodePathSegment(id, "projectId")}/tasks`,
    taskUpdate: (id: string, taskId: string) =>
        `${PREFIX.taskUpdate}/${encodePathSegment(id, "projectId")}/tasks/${encodePathSegment(taskId, "taskId")}`,
    taskComplete: (id: string, taskId: string) =>
        `${PREFIX.taskComplete}/${encodePathSegment(id, "projectId")}/tasks/${encodePathSegment(taskId, "taskId")}/complete`,
    taskDelete: (id: string, taskId: string) =>
        `${PREFIX.taskDelete}/${encodePathSegment(id, "projectId")}/tasks/${encodePathSegment(taskId, "taskId")}`,

    // ────── D. Requirements ──────
    reqList: (id: string) => `${PREFIX.reqList}/${encodePathSegment(id, "projectId")}/requirements`,
    reqCreate: (id: string) => `${PREFIX.reqCreate}/${encodePathSegment(id, "projectId")}/requirements`,
    reqUpdate: (id: string, reqId: string) =>
        `${PREFIX.reqUpdate}/${encodePathSegment(id, "projectId")}/requirements/${encodePathSegment(reqId, "requirementId")}`,
    reqDelete: (id: string, reqId: string) =>
        `${PREFIX.reqDelete}/${encodePathSegment(id, "projectId")}/requirements/${encodePathSegment(reqId, "requirementId")}`,

    // ────── E. Team & Matchmaker ──────
    teamList: () => {
        const apiBase = trimUrl(ENV.VITE_API_BASE_URL as string | undefined);
        if (apiBase) return `${apiBase}/manager/team`;
        return "/webhook/manager/team";
    },
    talentDetail: (talentId: string) => `${PREFIX.teamDetail}/${encodePathSegment(talentId, "talentId")}`,
    matchmaker: () => "/webhook/api/project/talents",

    // ────── F. Orchestrator / IA ──────
    orchestratorRecompute: () => "/webhook/api/orchestrator/recompute",
    viability: () => "/webhook/api/project/viability",
    copilotRecompute: () => "/webhook/api/copilot/recompute",
    whatIf: () => "/webhook/api/project/what-if",
    strategistExecute: () => "/webhook/api/strategist/execute",
    copilotDecisions: (projectId?: string) =>
        projectId
            ? `/webhook/manager/copilot-decisions?project_id=${encodeURIComponent(projectId.trim())}`
            : "/webhook/manager/copilot-decisions",

    // ────── G. Risks ──────
    riskAlertPatch: (alertId: string) => `${PREFIX.alertPatch}/${encodePathSegment(alertId, "alertId")}`,

    // ────── H. Copilot Chat ──────
    conversationsList: () => {
        const apiBase = trimUrl(ENV.VITE_API_BASE_URL as string | undefined);
        if (apiBase) return `${apiBase}/manager/conversations`;
        return "/webhook/manager/conversations";
    },
    conversationDetail: (id: string) => `${PREFIX.convDetail}/${encodePathSegment(id, "conversationId")}`,
    conversationArchive: (id: string) => `${PREFIX.convArchive}/${encodePathSegment(id, "conversationId")}/archive`,
    helperChat: () => PREFIX.helperChat,
    helperChatV3: () => PREFIX.helperChatV3,

    // ────── I. Skills catalog ──────
    skillsCatalog: () => PREFIX.skillsCatalog,
} as const;

export type ApiRoutes = typeof API_ROUTES;
export type ApiRouteKey = keyof ApiRoutes;
