/**
 * Dev-only fallback insights — not used in production when API is configured.
 * Enable with VITE_COPILOT_USE_FALLBACK=true (requires VITE_COPILOT_API_BASE unset).
 */
import type { CopilotInsight, CopilotPageContext } from "./copilot-types";

function id(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_DECISION = [
    {
        id: "approve" as const,
        impact: "Confirms the recommendation; logs decision and notifies owners.",
        predictiveOutcome: "Path continues with committed scope and owners aligned.",
        scorePreview: "Viability ↑ ~0.4 pts",
        workloadPreview: "Load stable; no forced reallocation",
        assignmentPreview: "Keeps current owners on critical path",
    },
    {
        id: "adjust" as const,
        impact: "Opens a scoped review; timeline may shift; risk is re-evaluated.",
        predictiveOutcome: "Triggers replanning window; decision stays pending.",
        scorePreview: "Viability ↔ small bump possible after scope fix",
        workloadPreview: "May shift 5–10% capacity to unblock",
        assignmentPreview: "Optional reassignment on flagged tasks",
    },
    {
        id: "reject" as const,
        impact: "Stops this path; requires alternate plan or escalation.",
        predictiveOutcome: "Freezes commitment; escalation template prepared.",
        scorePreview: "Viability ↓ ~0.35 pts until new plan",
        workloadPreview: "Reduces active load; review queue grows",
        assignmentPreview: "Holds assignments until new assessment",
    },
];

function generateInsightsFromFallback(suggestionId: string, ctx: CopilotPageContext): CopilotInsight[] {
    const entity = ctx.entityLabel ?? ctx.entityId ?? "—";
    const page = ctx.pageLabel;

    switch (suggestionId) {
        case "why_at_risk":
            return [
                {
                    id: id("risk"),
                    title: "Risk drivers",
                    quickLine: `Primary stress: delivery pressure and dependencies on ${entity}.`,
                    body: `For ${entity}, delivery pressure and dependency overlap are the main contributors. Budget consumption is trending above plan for this phase.`,
                    confidence: "high",
                    impactTags: ["Timeline", "Scope", "Risk"],
                    impactTagHints: {
                        Timeline: "Schedule variance vs last baseline",
                        Scope: "Scope creep or unclear boundaries",
                        Risk: "Composite exposure from KPI + dependencies",
                    },
                    strategicHints: ["High risk detected", "Skill gap may amplify delay if unaddressed"],
                    confidenceSignals: [
                        { id: "w", label: "Workload overload", hint: "Utilization above team sustainable band" },
                        { id: "s", label: "Missing critical skill", hint: "Gap on two must-have competencies" },
                        { id: "d", label: "Delay trend", hint: "3 consecutive checkpoints slipped" },
                    ],
                    applyRecommendationLabel: "Apply mitigation plan",
                    whyBullets: [
                        "Signals from KPI + risk panels on this project",
                        "Historical pattern matches similar at-risk projects",
                    ],
                    deepExplain: {
                        keyFactors: ["Schedule slip vs baseline", "Dependency density", "Budget burn rate"],
                        reasoningSteps: ["1. Aggregate KPI signals", "2. Compare to portfolio norms", "3. Flag top two drivers"],
                    },
                    decisionOptions: DEFAULT_DECISION,
                    quickActions: [
                        {
                            id: "open-tasks",
                            label: "View blocking tasks",
                            variant: "primary",
                            preview: "Open task list filtered by priority",
                            screenHint: "Tasks / workload",
                            dataEffect: "Read-only filter on current project tasks",
                        },
                        {
                            id: "escalate",
                            label: "Suggest escalation",
                            variant: "secondary",
                            screenHint: "Notifications",
                            dataEffect: "Draft escalation message (no send in demo)",
                        },
                    ],
                    tier: "must",
                },
                {
                    id: id("risk2"),
                    title: "Secondary factor",
                    body: "Resource contention with parallel initiatives may amplify delays if not sequenced.",
                    confidence: "medium",
                    impactTags: ["People"],
                    quickActions: [
                        {
                            id: "team",
                            label: "Review team fit",
                            variant: "secondary",
                            screenHint: "Project workspace",
                            dataEffect: "Talent fit table focus",
                        },
                    ],
                    tier: "should",
                },
            ];
        case "best_team":
            return [
                {
                    id: id("team"),
                    title: "Suggested coverage",
                    body: "Balanced coverage favors profiles with strong delivery + domain skills. Consider pairing a senior with a mid-level on critical path items.",
                    confidence: "medium",
                    impactTags: ["People", "Scope"],
                    whyBullets: ["Based on talent-fit table and role requirements for this project"],
                    deepExplain: {
                        keyFactors: ["Skill coverage gaps", "Critical path roles"],
                        reasoningSteps: ["1. Map skills to WBS", "2. Score coverage", "3. Propose pairing"],
                    },
                    quickActions: [
                        {
                            id: "assign",
                            label: "Draft assignment",
                            variant: "primary",
                            screenHint: "Assignments",
                            dataEffect: "Creates draft assignment rows (demo)",
                        },
                        {
                            id: "compare",
                            label: "Compare alternatives",
                            variant: "secondary",
                            screenHint: "Same page",
                            dataEffect: "Side-by-side comparison state",
                        },
                    ],
                    tier: "must",
                },
            ];
        case "explain_score":
            return [
                {
                    id: id("score"),
                    title: "Score breakdown",
                    quickLine: "Score reflects KPIs, risk, and fit—lower usually means schedule or risk stress.",
                    body: "The score blends viability KPIs, risk indicators, and resource fit. A lower score usually reflects schedule stress or unmitigated risks.",
                    confidence: "high",
                    impactTags: ["Compliance", "Score"],
                    impactTagHints: {
                        Compliance: "Alignment with governance thresholds",
                        Score: "Weighted composite (demo model)",
                    },
                    strategicHints: ["Skill gap requires attention"],
                    confidenceSignals: [
                        { id: "kpi", label: "KPI weighting", hint: "Schedule and budget carry highest weight" },
                        { id: "risk", label: "Risk multiplier", hint: "Elevated when red risks present" },
                    ],
                    applyRecommendationLabel: "Apply recommendation to reassessment",
                    whyBullets: ["Weighted model v1 (demo)", "Inputs from current page data"],
                    deepExplain: {
                        keyFactors: ["KPI weights", "Risk multiplier", "Talent fit"],
                        reasoningSteps: ["1. Normalize inputs", "2. Apply weights", "3. Produce score band"],
                    },
                    decisionOptions: DEFAULT_DECISION,
                    quickActions: [
                        {
                            id: "export",
                            label: "Copy summary",
                            variant: "secondary",
                            screenHint: "Clipboard",
                            dataEffect: "Copies insight text to clipboard",
                        },
                        {
                            id: "drill",
                            label: "Open decision log",
                            variant: "secondary",
                            screenHint: "/decision-log",
                            dataEffect: "Navigates to decision log (demo)",
                        },
                    ],
                    tier: "must",
                },
            ];
        case "access_patterns":
            return [
                {
                    id: id("acc"),
                    title: "Access review",
                    body: `For ${entity}, privilege breadth is within normal range. Flag unusual off-hours access patterns for follow-up if logs are enabled.`,
                    confidence: "medium",
                    impactTags: ["Compliance"],
                    deepExplain: {
                        keyFactors: ["Role breadth", "Log anomalies"],
                        reasoningSteps: ["1. Compare to role template", "2. Scan time patterns"],
                    },
                    quickActions: [
                        {
                            id: "logs",
                            label: "Open audit logs",
                            variant: "primary",
                            screenHint: "/admin/logs (future)",
                            dataEffect: "Filtered log view for this user",
                        },
                    ],
                    tier: "must",
                },
            ];
        case "permission_review":
            return [
                {
                    id: id("perm"),
                    title: "Permission hygiene",
                    body: "Role assignments should follow least privilege. Review elevated roles quarterly.",
                    confidence: "low",
                    impactTags: ["Compliance"],
                    quickActions: [
                        {
                            id: "edit",
                            label: "Edit permissions",
                            variant: "primary",
                            screenHint: "User drawer",
                            dataEffect: "Opens permission editor on selected user",
                        },
                    ],
                    tier: "should",
                },
            ];
        case "portfolio_summary":
            return [
                {
                    id: id("port"),
                    title: "Portfolio snapshot",
                    quickLine: "Risk is concentrated; stabilize the top two at-risk initiatives first.",
                    body: `Across ${page}, active initiatives are concentrated in the upper half of the risk spectrum. Focus on stabilizing the top two at-risk projects.`,
                    confidence: "high",
                    impactTags: ["Timeline", "Scope"],
                    impactTagHints: {
                        Timeline: "Aggregate slip across active projects",
                        Scope: "Scope volatility index (demo)",
                    },
                    strategicHints: ["High risk detected in portfolio tail"],
                    confidenceSignals: [{ id: "c", label: "Concentration", hint: "Top 20% of projects carry 60% risk" }],
                    applyRecommendationLabel: "Apply portfolio filter",
                    deepExplain: {
                        keyFactors: ["Risk concentration", "Active vs planned mix"],
                        reasoningSteps: ["1. Segment by status", "2. Rank by risk", "3. Surface top two"],
                    },
                    decisionOptions: DEFAULT_DECISION,
                    quickActions: [
                        {
                            id: "filter",
                            label: "Filter at-risk",
                            variant: "primary",
                            screenHint: "Projects table",
                            dataEffect: "Applies at-risk filter on list",
                        },
                    ],
                    tier: "must",
                },
            ];
        case "trend":
            return [
                {
                    id: id("tr"),
                    title: "Decision trend",
                    body: "Recent entries show a shift toward Adjust vs Continue. Monitor if this correlates with a specific portfolio or rule set.",
                    confidence: "medium",
                    impactTags: ["Scope"],
                    deepExplain: {
                        keyFactors: ["Decision mix", "Rules version"],
                        reasoningSteps: ["1. Bucket last N entries", "2. Compare to prior window"],
                    },
                    quickActions: [
                        {
                            id: "rules",
                            label: "View rules version",
                            variant: "secondary",
                            screenHint: "Decision log",
                            dataEffect: "Highlights rules_version column",
                        },
                    ],
                    tier: "should",
                },
            ];
        case "priorities":
        case "risks":
        case "summarize":
        case "next_action":
        default:
            return [
                {
                    id: id("def"),
                    title: "Focused insight",
                    body: `Context: ${page}${ctx.entityLabel ? ` · ${ctx.entityLabel}` : ""}. Prioritize blockers, validate assumptions with stakeholders, then sequence the next two actions.`,
                    confidence: "medium",
                    impactTags: ["Timeline", "People"],
                    whyBullets: ["Heuristic summary for this screen (demo)"],
                    deepExplain: {
                        keyFactors: ["Page context", "Recent activity (demo)"],
                        reasoningSteps: ["1. Parse context", "2. Rank actions", "3. Surface top three"],
                    },
                    quickActions: [
                        {
                            id: "next",
                            label: "Recommend next action",
                            variant: "primary",
                            screenHint: "Current page",
                            dataEffect: "Pins suggested next step in session",
                        },
                        {
                            id: "note",
                            label: "Add note",
                            variant: "secondary",
                            screenHint: "Notes (demo)",
                            dataEffect: "Appends note to local draft",
                        },
                    ],
                    tier: "must",
                },
                {
                    id: id("def2"),
                    title: "Optional check",
                    body: "Cross-check with the latest decision log or portfolio view for consistency.",
                    confidence: "low",
                    impactTags: ["Scope"],
                    quickActions: [],
                    tier: "optional",
                },
            ];
    }
}

/** Simulated latency + static content for local development only. */
export async function runCopilotDevFallbackInsights(suggestionId: string, ctx: CopilotPageContext): Promise<CopilotInsight[]> {
    await new Promise((r) => setTimeout(r, 520));
    return generateInsightsFromFallback(suggestionId, ctx);
}
