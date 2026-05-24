import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ArbitrageOption, ExecuteResponse, ProjectDetailResponse, ProjectListItem } from "@/types/api.types";
import {
    arbitrageOptionsFromMap,
    buildStrategistFragileSignalsFromDetail,
    dedupeArbitrageOptions,
    hasProposedArbitrageOptions,
    invalidateAfterStrategistArbitrage,
    isFragileProjectForStrategistPropose,
    mergeProposeArbitrageOptions,
    mergeArbitrageOptionsById,
    parseStrategistExecuteResponse,
    readStrategistArbitrageErrorMessage,
} from "@/lib/strategist-arbitrage";
import { useExecuteArbitrage, useStrategistPropose } from "@/hooks/useProjects";

export type UseProjectStrategistArbitrageParams = {
    open: boolean;
    projectId: string;
    enterpriseId: string | null | undefined;
    detail: ProjectDetailResponse | null | undefined;
    detailLoading: boolean;
    listProject?: ProjectListItem;
    simulationTabActive: boolean;
};

export function useProjectStrategistArbitrage({
    open,
    projectId,
    enterpriseId,
    detail,
    detailLoading,
    listProject,
    simulationTabActive,
}: UseProjectStrategistArbitrageParams) {
    const [optionsById, setOptionsById] = useState<Record<string, ArbitrageOption>>({});
    const autoProposeKeyRef = useRef<string | null>(null);
    const qc = useQueryClient();

    const strategistPropose = useStrategistPropose();
    const executeArbitrage = useExecuteArbitrage();

    useEffect(() => {
        setOptionsById({});
        autoProposeKeyRef.current = null;
    }, [projectId]);

    const arbitrageOptionsSig = useMemo(
        () => JSON.stringify(detail?.arbitrage_options ?? []),
        [detail?.arbitrage_options],
    );

    const arbitrageOptionsFromApi = useMemo(
        () => detail?.arbitrage_options ?? [],
        [arbitrageOptionsSig],
    );

    useEffect(() => {
        if (!arbitrageOptionsFromApi.length) return;
        setOptionsById((prev) => mergeArbitrageOptionsById(prev, arbitrageOptionsFromApi));
    }, [arbitrageOptionsFromApi]);

    const fragileSignals = useMemo(
        () => buildStrategistFragileSignalsFromDetail(detail, listProject),
        [detail, listProject],
    );

    const allOptions = useMemo(() => arbitrageOptionsFromMap(optionsById), [optionsById]);
    const allOptionsRef = useRef(allOptions);
    allOptionsRef.current = allOptions;
    const displayOptions = useMemo(() => dedupeArbitrageOptions(allOptions), [allOptions]);
    const isFragile = useMemo(() => isFragileProjectForStrategistPropose(fragileSignals), [fragileSignals]);

    const applyProposeResponse = useCallback((incoming: ArbitrageOption[], replaceProposed: boolean) => {
        setOptionsById((prev) => mergeProposeArbitrageOptions(prev, incoming, replaceProposed));
    }, []);

    const runPropose = useCallback(
        async (opts: { force: boolean; skipIfProposed?: boolean }) => {
            const enterprise_id = enterpriseId?.trim();
            const project_id = projectId?.trim();
            if (!enterprise_id || !project_id) {
                throw new Error("missing_enterprise_or_project");
            }

            if (opts.skipIfProposed && hasProposedArbitrageOptions(allOptionsRef.current)) {
                return { skipped: true as const, options: [] as ArbitrageOption[] };
            }

            const res = await strategistPropose.mutateAsync({
                enterprise_id,
                project_id,
                use_ai: true,
            });
            const incoming = res.options ?? [];
            applyProposeResponse(incoming, opts.force);
            return { skipped: false as const, options: incoming };
        },
        [applyProposeResponse, enterpriseId, projectId, strategistPropose],
    );

    const recalculate = useCallback(() => runPropose({ force: true }), [runPropose]);

    const requestPropose = useCallback(() => runPropose({ force: true }), [runPropose]);

    useEffect(() => {
        if (!open || !simulationTabActive || !projectId || detailLoading) return;
        if (!enterpriseId?.trim()) return;
        if (!isFragile) return;
        if (hasProposedArbitrageOptions(allOptionsRef.current)) return;
        if (strategistPropose.isPending) return;

        const sessionKey = projectId.trim();
        if (autoProposeKeyRef.current === sessionKey) return;
        autoProposeKeyRef.current = sessionKey;

        void runPropose({ force: false, skipIfProposed: true }).catch(() => {
            /* Ne pas réinitialiser la clé : évite une boucle de propose / re-render dans le modal. */
        });
    }, [
        detailLoading,
        enterpriseId,
        isFragile,
        open,
        projectId,
        runPropose,
        simulationTabActive,
        strategistPropose.isPending,
    ]);

    const patchOptionStatus = useCallback((optionId: string, status: ArbitrageOption["status"]) => {
        setOptionsById((prev) => {
            const current = prev[optionId];
            if (!current) return prev;
            return { ...prev, [optionId]: { ...current, status } };
        });
    }, []);

    const acceptOption = useCallback(
        async (opt: ArbitrageOption): Promise<ExecuteResponse> => {
            const enterprise_id = enterpriseId?.trim();
            if (!enterprise_id) throw new Error("missing_enterprise");
            const raw = await executeArbitrage.mutateAsync({
                enterprise_id,
                option_id: opt.id,
                action: "execute",
            });
            patchOptionStatus(opt.id, "executed");
            await invalidateAfterStrategistArbitrage(qc, projectId);
            return parseStrategistExecuteResponse(raw);
        },
        [enterpriseId, executeArbitrage, patchOptionStatus, projectId, qc],
    );

    const rejectOption = useCallback(
        async (opt: ArbitrageOption) => {
            const enterprise_id = enterpriseId?.trim();
            if (!enterprise_id) throw new Error("missing_enterprise");
            await executeArbitrage.mutateAsync({
                enterprise_id,
                option_id: opt.id,
                action: "reject",
            });
            patchOptionStatus(opt.id, "rejected");
        },
        [enterpriseId, executeArbitrage, patchOptionStatus],
    );

    return {
        displayOptions,
        fragileSignals,
        isFragile,
        proposeLoading: strategistPropose.isPending,
        executeLoading: executeArbitrage.isPending,
        recalculate,
        requestPropose,
        acceptOption,
        rejectOption,
        readError: readStrategistArbitrageErrorMessage,
    };
}
