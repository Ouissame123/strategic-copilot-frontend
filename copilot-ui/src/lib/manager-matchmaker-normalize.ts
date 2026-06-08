import type {
    ManagerMatchmakerDashboard,
    ManagerProjectTalentMatchingAction,
    ManagerProjectTalentMatchingResult,
    ManagerProjectTalentMatchingTalent,
} from "@/types/manager-matchmaker.types";
import type { DashboardMatchmakerStats } from "@/types/api.types";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function num(v: unknown, fallback: number | null = null): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function skillNameFromGap(row: unknown): string {
    if (typeof row === "string") return str(row);
    const o = asRecord(row);
    return str(o.skill_name ?? o.skill ?? o.name ?? o.gap ?? o.label);
}

function normalizeActionType(raw: unknown): string {
    const t = str(raw).toLowerCase();
    if (t === "recruitment" || t === "hire" || t === "recruit") return "recruitment";
    if (t === "training" || t === "train" || t === "upskill") return "training";
    if (t === "redeploy" || t === "reassignment" || t === "reassign") return "redeploy";
    return t;
}

function parseRecommendedActions(raw: unknown): ManagerProjectTalentMatchingAction[] {
    const list = Array.isArray(raw) ? raw : [];
    return list
        .map((row): ManagerProjectTalentMatchingAction | null => {
            const o = asRecord(row);
            const action_type = normalizeActionType(o.action_type ?? o.type ?? o.actionType);
            const action_summary =
                str(o.action_summary ?? o.summary ?? o.message ?? o.reason ?? o.description) || "—";
            const priority_level =
                str(o.priority_level ?? o.priority ?? o.severity ?? o.risk_level) || "";
            const skill = str(o.skill ?? o.skill_name) || undefined;
            if (!action_type && action_summary === "—") return null;
            return { action_type, action_summary, priority_level, skill };
        })
        .filter((x): x is ManagerProjectTalentMatchingAction => x != null);
}

function parseTopTalents(raw: unknown): ManagerProjectTalentMatchingTalent[] {
    const list = Array.isArray(raw) ? raw : [];
    return list
        .map((row): ManagerProjectTalentMatchingTalent | null => {
            const o = asRecord(row);
            const talent_name = str(o.talent_name ?? o.name ?? o.full_name);
            if (!talent_name) return null;
            const missingRaw = o.missing_skills ?? o.gaps ?? o.skill_gaps;
            const missing_skills = (Array.isArray(missingRaw) ? missingRaw : [])
                .map(skillNameFromGap)
                .filter(Boolean);
            return {
                talent_name,
                overall_score: num(o.overall_score ?? o.score),
                skill_fit_score: num(o.skill_fit_score ?? o.skills_fit_score ?? o.fit_score),
                missing_skills,
            };
        })
        .filter((x): x is ManagerProjectTalentMatchingTalent => x != null);
}

/** Parse la réponse n8n d’un matching projet → structure dashboard. */
export function normalizeProjectTalentMatchingResponse(
    raw: unknown,
    projectId: string,
    fallbackProjectName: string,
): ManagerProjectTalentMatchingResult | null {
    const root = unwrapN8nRoot(raw);
    if (root.status === "error") return null;

    const matching = asRecord(root.matching ?? asRecord(root.data).matching);
    const ai = asRecord(root.ai ?? asRecord(root.data).ai);
    const project = asRecord(root.project ?? matching.project ?? asRecord(root.data).project);

    const project_name =
        str(project.name ?? project.project_name) ||
        str(root.project_name) ||
        fallbackProjectName ||
        "—";

    const adequacy_score = num(
        matching.project_adequacy_score ??
            matching.adequacy_score ??
            matching.overall_score ??
            asRecord(root.kpi).overall_score,
    );

    const criticalGapsRaw = ai.critical_gaps ?? matching.critical_gaps ?? root.critical_gaps;
    const critical_gaps = (Array.isArray(criticalGapsRaw) ? criticalGapsRaw : [])
        .map(skillNameFromGap)
        .filter(Boolean);

    const gapFromMatching = num(matching.gap_count);
    const gap_count =
        gapFromMatching != null && gapFromMatching >= 0
            ? Math.round(gapFromMatching)
            : critical_gaps.length;

    const topRaw = matching.top_talents ?? matching.topTalents ?? matching.top_matches ?? root.top_talents;
    const top_talents = parseTopTalents(topRaw);

    const recommended_actions = parseRecommendedActions(
        root.recommended_actions ?? asRecord(root.data).recommended_actions,
    );

    return {
        project_id: str(root.project_id ?? project.id ?? projectId) || projectId,
        project_name,
        adequacy_score,
        gap_count,
        recommended_actions,
        top_talents,
        critical_gaps,
    };
}

function skillKey(name: string): string {
    return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function countActionsByType(actions: ManagerProjectTalentMatchingAction[], type: string): number {
    return actions.filter((a) => normalizeActionType(a.action_type) === type).length;
}

/**
 * Agrège les réponses par projet en vue dashboard Matchmaker.
 * @deprecated Le dashboard Manager consomme désormais POST /webhook/api/matchmaker/batch (données déjà agrégées).
 * Conservé pour les usages legacy / tests ; ne pas appeler depuis useManagerMatchmaker.
 */
export function buildManagerMatchmakerDashboard(
    results: ManagerProjectTalentMatchingResult[],
    failedProjectIds: string[] = [],
): ManagerMatchmakerDashboard {
    const scores = results.map((r) => r.adequacy_score).filter((s): s is number => s != null);
    const avg_match_score =
        scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;

    const stats: DashboardMatchmakerStats = {
        projects_with_matching: results.length,
        avg_match_score,
        total_gaps: results.reduce((s, r) => s + r.gap_count, 0),
        recruitment_needed: results.reduce(
            (s, r) => s + countActionsByType(r.recommended_actions, "recruitment"),
            0,
        ),
        training_needed: results.reduce((s, r) => s + countActionsByType(r.recommended_actions, "training"), 0),
        redeploy_possible: results.reduce((s, r) => s + countActionsByType(r.recommended_actions, "redeploy"), 0),
    };

    const top_recommendations: unknown[] = [];
    const top_unassigned_matches: unknown[] = [];
    const skillGapMap = new Map<string, { skill_name: string; occurrence_count: number; project_name?: string }>();

    const bumpSkill = (skill: string, projectName: string) => {
        const name = skill.trim();
        if (!name) return;
        const key = skillKey(name);
        const cur = skillGapMap.get(key);
        if (cur) {
            cur.occurrence_count += 1;
        } else {
            skillGapMap.set(key, { skill_name: name, occurrence_count: 1, project_name: projectName });
        }
    };

    for (const r of results) {
        for (const action of r.recommended_actions) {
            top_recommendations.push({
                project_id: r.project_id,
                project_name: r.project_name,
                action_summary: action.action_summary,
                priority_level: action.priority_level,
                action_type: action.action_type,
            });
            if (action.skill) bumpSkill(action.skill, r.project_name);
        }

        for (const talent of r.top_talents) {
            top_unassigned_matches.push({
                project_id: r.project_id,
                project_name: r.project_name,
                talent_name: talent.talent_name,
                overall_score: talent.overall_score,
                skill_fit_score: talent.skill_fit_score,
            });
            for (const skill of talent.missing_skills) {
                bumpSkill(skill, r.project_name);
            }
        }

        for (const gap of r.critical_gaps) {
            bumpSkill(gap, r.project_name);
        }
    }

    const top_skill_gaps = [...skillGapMap.values()]
        .sort((a, b) => b.occurrence_count - a.occurrence_count)
        .map((g) => ({
            skill_name: g.skill_name,
            skill: g.skill_name,
            occurrence_count: g.occurrence_count,
            project_name: g.project_name,
        }));

    return {
        stats,
        top_recommendations,
        top_unassigned_matches,
        top_skill_gaps,
        failed_project_ids: failedProjectIds.length > 0 ? failedProjectIds : undefined,
    };
}
