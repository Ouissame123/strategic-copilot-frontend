import { useQuery, useQueryClient } from "@tanstack/react-query";

import {

    MANAGER_MATCHMAKER_BATCH_TIMEOUT_MS,

    resolveMatchmakerUseAi,

} from "@/api/manager-matchmaker.constants";

import { mapManagerMatchmakerApiError, runManagerMatchmakerBatch } from "@/api/manager-matchmaker.api";

import type {

    ManagerMatchmakerBatchResponse,

    ManagerMatchmakerDashboard,

    ManagerMatchmakerTalentsProjectGroup,

} from "@/types/manager-matchmaker.types";

import type { DashboardMatchmakerStats } from "@/types/api.types";



export function managerMatchmakerQueryKey(managerId: string, enterpriseId: string) {

    return ["manager-matchmaker", managerId.trim(), enterpriseId.trim()] as const;

}



/** Mappe la réponse batch backend vers la forme consommée par MatchmakerSection (noms legacy + enrichissement LLM). */

export function mapMatchmakerBatchToDashboard(batch: ManagerMatchmakerBatchResponse): ManagerMatchmakerDashboard {

    const s = batch.stats ?? {};



    const stats: DashboardMatchmakerStats = {

        projects_with_matching: s.projects_analyzed,

        avg_match_score: s.avg_match_score,

        total_gaps: s.ecarts_identifies,

        recruitment_needed: s.besoins_recrutement,

        training_needed: s.besoins_formation,

        redeploy_possible: s.reaffectations_possibles,

    };



    const top_recommendations = (batch.top_recommendations ?? []).map((row) => ({

        project_id: row.project_id,

        project_name: row.project_name,

        top_recommendation: row.top_recommendation,

        action_summary: row.summary ?? row.top_recommendation,

        summary: row.summary,

        priority_level: row.priority_label,

        adequacy_score: row.adequacy_score,

        ai_narrative: row.ai_narrative,

        hr_decision: row.hr_decision,

        confidence: row.confidence,

        llm_enriched: row.llm_enriched,

    }));



    const top_talents_by_project: ManagerMatchmakerTalentsProjectGroup[] = (batch.top_talents_by_project ?? []).map(

        (group) => ({

            project_id: group.project_id,

            project_name: group.project_name,

            adequacy_score: group.adequacy_score,

            candidates: group.candidates,

            top_picks_rationale: group.top_picks_rationale,

            critical_gaps: group.critical_gaps,

        }),

    );



    const top_unassigned_matches: unknown[] = [];

    for (const group of top_talents_by_project) {

        for (const candidate of group.candidates ?? []) {

            top_unassigned_matches.push({

                project_id: group.project_id,

                project_name: group.project_name,

                adequacy_score: group.adequacy_score,

                talent_name: candidate.talent_name,

                overall_score: candidate.overall_score,

                skill_fit_score: candidate.skill_fit_score,

                availability_score: candidate.availability_score,

                score_mode: candidate.score_mode,

                current_allocation_pct: candidate.current_allocation_pct,

            });

        }

    }



    const top_skill_gaps = (batch.top_skill_gaps ?? []).map((row) => ({

        skill: row.skill,

        skill_name: row.skill,

        occurrence_count: row.signalements,

        project_name: row.sample_project,

        severity: row.severity,

        action_type: row.action_type,

    }));



    return {

        stats,

        top_recommendations,

        top_unassigned_matches,

        top_skill_gaps,

        top_talents_by_project,

        explanation: batch.explanation,

        errors: batch.errors,

        llm_enriched_count: batch.llm_enriched_count,

    };

}



export function useManagerMatchmaker(managerId: string | undefined, enterpriseId: string | undefined) {

    const qc = useQueryClient();

    const enabled = Boolean(managerId?.trim() && enterpriseId?.trim());

    const queryKey = enabled

        ? managerMatchmakerQueryKey(managerId!, enterpriseId!)

        : (["manager-matchmaker", "disabled"] as const);



    const query = useQuery({

        queryKey,

        queryFn: async ({ signal }): Promise<ManagerMatchmakerDashboard> => {
            const useAi = resolveMatchmakerUseAi();
            const envLimitRaw = (import.meta.env.VITE_MATCHMAKER_LIMIT_PROJECTS as string | undefined)?.trim();
            const envLimit = envLimitRaw ? Number(envLimitRaw) : NaN;
            const limitProjects =
                envLimitRaw && Number.isFinite(envLimit) && envLimit > 0 ? envLimit : useAi ? 8 : 15;

            const batch = await runManagerMatchmakerBatch(
                { use_ai: useAi, limit_projects: limitProjects },
                { signal, timeout: useAi ? 60_000 : MANAGER_MATCHMAKER_BATCH_TIMEOUT_MS },
            );
            return mapMatchmakerBatchToDashboard(batch);
        },

        enabled,

        staleTime: 120_000,

        retry: false,

        refetchOnWindowFocus: false,

    });



    const refetchAll = async () => {

        if (!enabled) return;

        await qc.invalidateQueries({ queryKey: managerMatchmakerQueryKey(managerId!, enterpriseId!) });

    };



    return {

        matchmaker: query.data,

        isLoading: query.isPending,

        isFetching: query.isFetching,

        isError: query.isError,

        errorMessage: query.isError ? mapManagerMatchmakerApiError(query.error) : null,

        refetchAll,

        hasContext: enabled,

        useAiEnabled: resolveMatchmakerUseAi(),

    };

}



export { mapManagerMatchmakerApiError };


