export type UserRole = "rh" | "manager" | "talent";
export type UserStatus = "active" | "disabled";
export type ProjectStatus = "planned" | "active" | "on_hold" | "completed" | "cancelled";
export type DecisionLabel = "Continue" | "Adjust" | "Stop" | "Proceed" | "Reject";

export interface AuthUser {
    id: string;
    enterprise_id: string;
    fullName: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    must_change_password: boolean;
    password_expires_at: string;
}

export interface LoginRequest { email: string; password: string }
export interface RefreshRequest { refreshToken: string }
export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    tokenType: "Bearer";
    expiresIn: number;
    user: AuthUser;
}
export interface LogoutRequest { refreshToken: string }
export interface LogoutResponse { success: boolean; message: string }
export interface MeResponse { user: AuthUser; talent: TalentListItem | null; enterprise_name: string }
export interface UpdateMeRequest { full_name?: string; email?: string }
export interface UpdatePasswordRequest { currentPassword: string; newPassword: string }
export interface UpdatePasswordResponse { user: AuthUser; security: { requires_relogin: true } }

export interface ProjectKpi {
    id: string;
    name: string;
    status?: ProjectStatus;
    priority?: number;
    milestone_at?: string | null;
    viability_score?: number | null;
    decision?: DecisionLabel;
    project_health_score?: number | null;
    delay_days?: number | null;
    capacity_load_pct?: number | null;
    alerts_count?: number;
    critical_alerts_count?: number;
    team_size?: number;
}
export interface TopAlert {
    id: string;
    severity: string;
    title?: string;
    message?: string;
    status?: string;
    project_id?: string;
    project_name?: string;
    risk_type?: string;
    risk_score?: number;
    age_hours?: number;
    impact_area?: string;
    created_at?: string;
}
export interface NotificationItem {
    id: string;
    severity: string;
    status: string;
    title: string;
    message: string;
    created_at: string;
    /** Champs optionnels renvoyés par certains webhooks (alertes risque, etc.). */
    project_name?: string;
    risk_type?: string;
    risk_score?: number;
    age_hours?: number;
}
export interface RhActionItem {
    id: string;
    type: string;
    status?: string;
    message?: string;
    priority?: "normal" | "urgent";
    project_id?: string;
    project_name?: string;
    created_at: string;
}
export interface CopilotDecisionItem { id: string; scope: string; decision: DecisionLabel; reason: string; score: number; confidence: number; project_name?: string; created_at: string }

export interface DashboardResponse {
    status: "success";
    headline: string;
    priorities: Array<{ icon: string; label: string; link: string }>;
    health: { score: number; label: "healthy" | "watch" | "attention" | "critical"; avg_viability: number };
    kpi_cards: {
        projects: { total: number; active: number; planned: number; completed: number; on_hold: number };
        decisions: { continue: number; adjust: number; stop: number; unscored: number };
        alerts: { total_open: number; critical_or_high: number };
        team: { size: number; overloaded: number; contract_ending_soon: number; with_alerts: number };
        pending_rh_actions: number;
        unread_notifications: number;
    };
    widgets: {
        fragile_projects: ProjectKpi[];
        top_alerts: TopAlert[];
        recent_notifications: NotificationItem[];
        pending_rh_actions: RhActionItem[];
        recent_decisions: CopilotDecisionItem[];
    };
    meta?: {
        computed_at?: string;
        [key: string]: unknown;
    };
}

export interface ProjectListItem {
    id: string;
    name: string;
    status: ProjectStatus;
    priority: number;
    milestone_at: string | null;
    team_size: number;
    active_alerts_count: number;
    latest_viability_score: number | null;
    latest_decision: DecisionLabel | null;
    progress_pct?: number | null;
    decision?: DecisionLabel | null;
    alerts_count?: number;
    equipe_size?: number;
}
export interface ProjectsListResponse { items: ProjectListItem[]; total: number }
export interface ManagerProjectsListResponse {
    status: "success";
    workflow?: string;
    operation: "list";
    enterprise_id?: string;
    count: number;
    projects: ProjectListItem[];
    filters_applied?: { status?: string | null; search?: string | null; limit?: number | null } | null;
}
export interface CreateProjectRequest { name: string; status: ProjectStatus; priority: number; milestone_at?: string; start_date?: string; budget_rh_planned?: number; description?: string }
export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {}
export interface ProjectCreatedResponse { project: ProjectListItem }
export interface ProjectUpdatedResponse { project: ProjectListItem }
export interface AssignmentItem {
    id?: string;
    project_id?: string;
    talent_id: string;
    talent_name?: string;
    talent_email?: string;
    allocation_pct: number | string;
    start_date?: string | null;
    end_date?: string | null;
    role_on_project?: string;
    assignment_type?: string;
    status?: string;
}
export interface RequirementItem { id: string; skill_id: string; skill_name?: string; required_level: number }
export interface AlertItem {
    id: string;
    severity: string;
    title: string;
    status?: string;
    message?: string;
    project_id?: string;
    project_name?: string;
    risk_type?: string;
    risk_score?: number;
    detected_at?: string;
    source_agent?: string;
    impact_area?: string;
    /** Alias optionnel renvoyé par certains workflows */
    alert_id?: string;
    /** Catégorie métier (ex. skill_gap) */
    category?: string;
}
export interface ViabilityScore {
    score: number;
    decision: DecisionLabel;
    computed_at: string;
    /** Présent selon certains workflows n8n */
    explanation?: string | null;
}
export interface ProjectKpiFull {
    progress_pct: number;
    capacity_load_pct: number;
    project_health_score: number;
    /** Présent selon certains workflows n8n */
    delay_days?: number | null;
}
export interface ArbitrageOption { id: string; label: string; rationale: string; impact_score: number }
export interface ProjectFull extends ProjectListItem { description?: string; start_date?: string; budget_rh_planned?: number }
export interface ProjectDetailResponse {
    project: ProjectFull;
    assignments: AssignmentItem[];
    requirements: RequirementItem[];
    active_alerts: AlertItem[];
    latest_viability: ViabilityScore | null;
    latest_kpi: ProjectKpiFull | null;
    arbitrage_options: ArbitrageOption[];
}
export interface ManagerProjectDetailResponse extends ProjectDetailResponse {
    status: "success";
    workflow?: string;
    operation: "get_detail";
    enterprise_id?: string;
}
export interface AssignTalentRequest {
    talent_id: string;
    allocation_pct: number;
    start_date?: string;
    end_date?: string;
    role_on_project?: string;
    assignment_type?: "full_time" | "part_time" | "backup" | "temporary";
}
export interface AssignmentResponse { assignment: AssignmentItem }
export interface UnassignmentResponse { success: boolean }

/** Projet où le talent a la plus forte allocation (CTE talent_top_project côté backend). */
export interface TalentTopProject {
    id: string;
    name: string;
    status: string;
    priority: number | null;
    milestone_at: string | null;
    decision: string | null;
}

export interface TalentListItem {
    id: string;
    /** UUID stable — préféré pour key React et routes si renvoyé par l’API */
    talent_id?: string;
    full_name: string;
    email: string;
    status_color: "green" | "orange" | "red";
    total_allocation_pct: number;
    active_alerts_count: number;
    main_skills?: string[];
    active_projects_count?: number;
    remaining_capacity_pct?: number;
    contract_end_date?: string | null;
    contract_ending_soon?: boolean;
    absences_last_90d?: number;
    role?: string | null;
    capacity_hours_per_week?: number | null;
    employment_status?: string | null;
    insights?: {
        nine_box_label?: string | null;
        ipi_score?: number | null;
        ipi_band?: string | null;
        mobility_flag?: string | null;
    };
    /** Projet principal (meilleure allocation) — source de vérité si présent */
    top_project?: TalentTopProject | null;
    primary_project_name?: string | null;
    project_priority?: number | null;
    project_status?: string | null;
    project_milestone_at?: string | null;
    latest_decision?: string | null;
}
export interface TeamListResponse { count: number; talents: TalentListItem[]; distribution: Record<string, number> }
export interface TalentDetailResponse {
    status?: "success";
    operation?: "get_detail";
    talent: {
        id: string;
        name?: string;
        full_name?: string;
        email: string;
        enterprise_id?: string;
        manager_user_id?: string;
        contract_end_date?: string | null;
        contract_ending_soon?: boolean;
    };
    employment: {
        role?: string;
        salary?: number;
        contract_type?: string;
        integration_date?: string;
        created_at?: string;
        updated_at?: string;
    } | Record<string, unknown>;
    capacity: {
        capacity_hours_per_week?: number;
        vacation_days_remaining?: number;
        absences_annual?: number;
        created_at?: string;
        updated_at?: string;
    } | Record<string, unknown>;
    profile: Record<string, unknown>;
    skills: Array<{
        skill_id?: string;
        skill_name?: string;
        level?: number;
        years_experience?: number;
        is_certified?: boolean;
        last_used_at?: string;
        [key: string]: unknown;
    }>;
    active_assignments: Array<AssignmentItem & {
        project_name?: string;
        project_status?: string;
        project_priority?: number;
        project_milestone_at?: string | null;
    }>;
    recent_absences: Array<{
        id?: string;
        start_date?: string;
        end_date?: string;
        absence_type?: string;
        created_at?: string;
        [key: string]: unknown;
    }>;
    active_alerts: AlertItem[];
    analyst: {
        nine_box?: Record<string, unknown> | null;
        ipi?: Record<string, unknown> | null;
        mobility?: Record<string, unknown> | null;
        [key: string]: unknown;
    } | Record<string, unknown>;
    summary: {
        total_allocation_pct?: number;
        capacity_hours_per_week?: number;
        overload?: boolean;
        tension?: boolean;
        active_projects_count?: number;
        skills_count?: number;
        active_alerts_count?: number;
        absences_last_90d?: number;
        contract_ending_soon?: boolean;
        risk_level?: "low" | "medium" | "high";
        [key: string]: unknown;
    } | Record<string, unknown>;
}

export interface NotificationsResponse { items: NotificationItem[]; total: number }
export interface AckNotificationResponse { success: boolean }
export interface RiskAlertActionRequest { action: "resolve" | "dismiss"; note?: string }
export interface RiskAlertActionResponse { success: boolean }
export interface CopilotDecisionsResponse { decisions: CopilotDecisionItem[]; by_decision: Record<DecisionLabel, number> }
export interface RhActionsResponse { items: RhActionItem[]; total: number }
export interface RhActionPatchRequest {
    action: "accept" | "reject" | "progress" | "done" | "cancel";
    note?: string;
    response_message?: string;
}
export interface RhActionPatchResponse { success: boolean }

export interface ConversationItem { id: string; project_id?: string; status: string; title: string; last_message_at?: string }
export interface ConversationsResponse { items: ConversationItem[]; total: number }
export interface ConversationDetailResponse { conversation: ConversationItem; messages: Array<{ id: string; role: string; content: string; created_at: string }> }
export interface ArchiveConversationRequest { restore?: boolean }
export interface ArchiveConversationResponse { success: boolean }

export interface ViabilityRequest { project_id: string; force_refresh?: boolean; simulation_mode?: boolean; intent?: string }
export interface ViabilityResponse { project_id: string; score: number; decision: DecisionLabel; explanation?: string }

/** Body `modifications` pour POST /webhook/api/project/what-if (`delay_days` optionnel selon workflow). */
export interface WhatIfModifications {
    allocation_pct: number;
    added_talent_id?: string | null;
    training_skill_id?: string | null;
    delay_days?: number;
}

export interface WhatIfMutationVariables {
    projectId: string;
    /** Toujours normalisé par `orchestratorApi.whatIf` (allocation_pct défaut 0). */
    modifications: Partial<WhatIfModifications>;
}

export interface WhatIfScoreBreakdown {
    skills_fit: number;
    capacity: number;
    budget: number;
    risk: number;
}

export interface WhatIfRecommendationAction {
    priority: number;
    type: string;
    rationale: string;
    owner_role: string;
}

/** Bloc recommandations renvoyé par l’orchestrator What-If */
export interface WhatIfRecommendation {
    summary: string;
    key_drivers: string[];
    actions: WhatIfRecommendationAction[];
    warnings: string[];
}

export interface WhatIfKpi {
    progress_pct: number;
    delay_days: number;
    capacity_load_pct: number;
    project_health_score: number;
    skills_fit_score: number;
    fragility_score: number;
}

export interface WhatIfRiskRow {
    id: string;
    type: string;
    severity: string;
    message: string;
    risk_score: number;
}

/**
 * Réponse POST `/webhook/api/project/what-if` (contrat cible).
 * En production, certains champs peuvent manquer : le panneau UI gère les valeurs partielles.
 */
export interface WhatIfResponse {
    status: "success" | "error";
    score_before: number;
    score_after: number;
    delta: number;
    decision_before: string;
    decision_after: string;
    explanation_before: string;
    explanation_after: string;
    score_breakdown_before: WhatIfScoreBreakdown;
    score_breakdown_after: WhatIfScoreBreakdown;
    recommendation: WhatIfRecommendation;
    kpi: WhatIfKpi;
    risks: WhatIfRiskRow[];
    impact_explained: string;
    scenario_summary: string;
}

/** Alias pour payloads runtime éventuellement partiels */
export type WhatIfResult = Partial<WhatIfResponse>;
export interface ProposeRequest { project_id: string; use_ai?: boolean }
export interface ProposeResponse { options: ArbitrageOption[] }
export interface ExecuteRequest { option_id: string; action: "execute" | "reject" }
export interface ExecuteResponse { success: boolean; decision_id?: string }

export interface HelperChatRequest { message: string; project_id?: string; conversation_id?: string }
export interface HelperChatResponse { conversation_id: string; answer: string; citations?: string[] }
export interface ValidationsRequest { project_id?: string; use_ai?: boolean }
export interface ValidationsResponse { queued: boolean; validation_id?: string }

export interface ProjectAnalysisResponse { project_id: string; kpi: ProjectKpiFull }
export interface RiskProjectLeaderboardRow {
    project_id: string;
    project_name?: string;
    risk_score?: number;
    risk_level?: string;
    drivers?: Record<string, number>;
    computed_at?: string;
}

/** POST /webhook/api/project/risks — contrat étendu (per project ou vue manager). */
export interface RiskKpiResponse {
    project_id: string;
    alerts: AlertItem[];
    summary: Record<string, number> & {
        total_alerts?: number;
        critical?: number;
        high?: number;
        medium?: number;
        low?: number;
        at_risk_projects?: number;
        avg_risk_score?: number;
    };
    /** Ex. top projets à risque (si le workflow le renvoie) */
    projects?: RiskProjectLeaderboardRow[];
    /** Liste d'alertes normalisée (nommée `items` dans certains workflows) */
    items?: Array<
        AlertItem & {
            message?: string;
            category?: string;
        }
    >;
}
export interface TalentMatchingResponse { project_id: string; talents: Array<{ talent_id: string; score: number; rationale: string }> }
