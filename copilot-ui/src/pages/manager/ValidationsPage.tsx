import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { ValidationDedupDrawer } from "@/components/manager/validations/ValidationDedupDrawer";
import { PaginationFooter } from "@/components/common/PaginationFooter";
import { ManagerPageLayout } from "@/components/layout/ManagerPageLayout";
import {
    AgentStatsCard,
    BucketDistributionBar,
    TopImpactedProjectsCard,
    ValidationBucket,
    ValidationEmptyState,
    ValidationSkeleton,
    ValidationsFiltersBar,
    ValidationsHeader,
    ValidationsKpiRow,
    buildKpiStats,
    buildProcessedValidations,
    topImpactedProjects,
    type ValidationsPageFilters,
    type ValidationsUrlTimeFilter,
} from "@/components/validations";
import { validationCardClass } from "@/components/validations/validation-ui";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import type { DecisionLogDensity } from "@/components/decision-log/DensityToggle";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useValidations } from "@/hooks/useValidations";
import { buildManagerListSearchParams, readUrlPagination } from "@/lib/manager-url-pagination";
import type { ValidationCategory, ValidationType } from "@/services/validations.api";
import type { ValidationDedupEntry } from "@/lib/manager-validations-list-utils";
import { RH_ALERT_ERROR } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

const DENSITY_STORAGE_KEY = "validationsDensity";

function readDensity(): DecisionLogDensity {
    try {
        const v = localStorage.getItem(DENSITY_STORAGE_KEY);
        return v === "compact" ? "compact" : "comfortable";
    } catch {
        return "comfortable";
    }
}

function readFilters(searchParams: URLSearchParams): ValidationsPageFilters {
    const { page, limit } = readUrlPagination(searchParams);
    const time = (searchParams.get("time_filter") as ValidationsUrlTimeFilter) || "all";
    return {
        page,
        limit,
        time_filter: time === "today" || time === "7d" || time === "30d" ? time : "all",
        type: searchParams.get("type") ?? undefined,
        bucket: (searchParams.get("bucket") as ValidationCategory) || undefined,
        search: searchParams.get("search") ?? undefined,
    };
}

export default function ValidationsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const filters = useMemo(() => readFilters(searchParams), [searchParams]);
    const [density, setDensity] = useState<DecisionLogDensity>(readDensity);
    const [dedupDrawerEntry, setDedupDrawerEntry] = useState<ValidationDedupEntry | null>(null);

    const typesParam = filters.type ? ([filters.type] as ValidationType[]) : undefined;
    const { data, isLoading, isFetching, refetch, error } = useValidations("mine", {
        limit: 200,
        types: typesParam,
    });

    const items = data?.pending_validations ?? [];
    const summary = data?.summary;

    const kpiStats = useMemo(() => buildKpiStats(summary, items), [summary, items]);
    const processed = useMemo(() => buildProcessedValidations(items, filters), [items, filters]);
    const impacted = useMemo(() => topImpactedProjects(items), [items]);

    const hasNoResults =
        !isLoading &&
        processed.conflicts.length + processed.missing_justif.length + processed.standard_queue.length === 0;
    const isGloballyEmpty = !isLoading && (summary?.total_pending ?? items.length) === 0;

    useCopilotPage();

    const updateFilters = useCallback(
        (next: Partial<ValidationsPageFilters>) => {
            const merged = { ...filters, ...next };
            if (
                next.type !== undefined ||
                next.bucket !== undefined ||
                next.time_filter !== undefined ||
                next.search !== undefined
            ) {
                merged.page = next.page ?? 1;
            }
            const params = buildManagerListSearchParams(
                {
                    time_filter: merged.time_filter !== "all" ? merged.time_filter : undefined,
                    type: merged.type,
                    search: merged.search,
                },
                { page: merged.page, limit: merged.limit },
            );
            if (merged.bucket) params.bucket = merged.bucket;
            setSearchParams(params);
        },
        [filters, setSearchParams],
    );

    const handleDensityChange = useCallback((d: DecisionLogDensity) => {
        setDensity(d);
        try {
            localStorage.setItem(DENSITY_STORAGE_KEY, d);
        } catch {
            /* ignore */
        }
    }, []);

    const handleProjectSearch = useCallback(
        (projectId: string) => {
            const project = impacted.find((p) => p.project_id === projectId);
            updateFilters({ search: project?.name ?? projectId, page: 1 });
        },
        [impacted, updateFilters],
    );

    return (
        <WorkspacePageShell role="manager" eyebrow="" title="" omitHeader>
            <ManagerPageLayout
                header={
                    <ValidationsHeader
                        onRefresh={() => void refetch()}
                        density={density}
                        onDensityChange={handleDensityChange}
                        loading={isFetching}
                    />
                }
                kpi={isLoading ? <ValidationSkeleton variant="kpi" /> : <ValidationsKpiRow stats={kpiStats} />}
                distribution={
                    !isLoading ? (
                        <BucketDistributionBar
                            conflicts={processed.bucketCounts.conflict}
                            missingJustif={processed.bucketCounts.missing_justification}
                            standard={processed.bucketCounts.standard}
                            onSelectBucket={(bucket) => updateFilters({ bucket, page: 1 })}
                            activeBucket={filters.bucket}
                        />
                    ) : null
                }
                filters={
                    <ValidationsFiltersBar
                        filters={filters}
                        onChange={updateFilters}
                    />
                }
                main={
                    <>
                        {error ? (
                            <div className={cx("rounded-xl p-3 text-sm", RH_ALERT_ERROR)}>
                                Erreur de chargement.{" "}
                                <button type="button" onClick={() => void refetch()} className="underline">
                                    Réessayer
                                </button>
                            </div>
                        ) : null}

                        {isLoading ? (
                            <ValidationSkeleton variant="list" />
                        ) : hasNoResults ? (
                            <ValidationEmptyState
                                variant={isGloballyEmpty ? "empty" : "filtered"}
                                onReset={() => setSearchParams({})}
                            />
                        ) : (
                            <div className={validationCardClass + " overflow-hidden"}>
                                <ValidationBucket
                                    type="conflict"
                                    items={processed.conflicts}
                                    density={density}
                                    defaultExpanded
                                    onShowDuplicates={setDedupDrawerEntry}
                                />
                                <ValidationBucket
                                    type="missing_justification"
                                    items={processed.missing_justif}
                                    density={density}
                                    defaultExpanded
                                    onShowDuplicates={setDedupDrawerEntry}
                                />
                                <ValidationBucket
                                    type="standard"
                                    items={processed.standard_queue}
                                    density={density}
                                    defaultExpanded={!processed.conflicts.length && !processed.missing_justif.length}
                                    onShowDuplicates={setDedupDrawerEntry}
                                />
                                {processed.pagination ? (
                                    <PaginationFooter
                                        pagination={processed.pagination}
                                        onPageChange={(page) => updateFilters({ page })}
                                        onPageSizeChange={(limit) => updateFilters({ limit, page: 1 })}
                                        itemLabel="validations standard"
                                        loading={isFetching}
                                    />
                                ) : null}
                            </div>
                        )}
                    </>
                }
                sidebar={
                    isLoading ? (
                        <ValidationSkeleton variant="sidebar" />
                    ) : (
                        <>
                            <AgentStatsCard
                                byType={summary?.by_type ?? {}}
                                onTypeClick={(type) => updateFilters({ type, page: 1 })}
                                activeType={filters.type}
                            />
                            <TopImpactedProjectsCard projects={impacted} onSelectProject={handleProjectSearch} />
                        </>
                    )
                }
            />

            <ValidationDedupDrawer entry={dedupDrawerEntry} onClose={() => setDedupDrawerEntry(null)} />
        </WorkspacePageShell>
    );
}
