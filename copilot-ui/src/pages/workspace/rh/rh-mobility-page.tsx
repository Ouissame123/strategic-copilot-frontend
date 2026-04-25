import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useProjects } from "@/hooks/crud/projects";
import { useTalents } from "@/hooks/crud/talents";
import { useRhReallocationSimulateMutation, useRhReallocationValidateMutation } from "@/hooks/use-rh-workspace-queries";
import { unwrapDataPayload } from "@/utils/unwrap-api-payload";
import { pickCell } from "@/utils/rh-api-parse";

function readPct(v: unknown): number | null {
    const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
}

function readNum(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const n = Number(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
}

function deltaLabel(before: unknown, after: unknown): { text: string; tone: "up" | "down" | "flat" } {
    const a = readNum(before);
    const b = readNum(after);
    if (a == null || b == null) return { text: "—", tone: "flat" };
    const d = b - a;
    if (Math.abs(d) < 1e-6) return { text: "0", tone: "flat" };
    return { text: d > 0 ? `+${d.toFixed(1)}` : d.toFixed(1), tone: d > 0 ? "up" : "down" };
}

export default function RhMobilityPage() {
    const { t } = useTranslation(["common", "nav"]);
    const [searchParams] = useSearchParams();
    const talentFromUrl = searchParams.get("talent")?.trim() ?? "";

    const { projects, loading: lp, error: ep } = useProjects();
    const { talents, loading: lt, error: et } = useTalents();
    const sim = useRhReallocationSimulateMutation();
    const val = useRhReallocationValidateMutation();

    const [talentId, setTalentId] = useState("");
    const [sourceProjectId, setSourceProjectId] = useState("");
    const [destProjectId, setDestProjectId] = useState("");
    const [proposedPct, setProposedPct] = useState("50");
    /** Accusé de lecture obligatoire si la charge simulée dépasse 85 %. */
    const [overloadAck, setOverloadAck] = useState(false);

    useCopilotPage("staffing", t("nav:rhNavMobility"));

    useEffect(() => {
        if (talentFromUrl) setTalentId(talentFromUrl);
    }, [talentFromUrl]);

    const projectOptions = useMemo(
        () => projects.map((p) => ({ label: p.name || p.id, value: p.id })),
        [projects],
    );
    const talentOptions = useMemo(
        () => talents.map((x) => ({ label: x.full_name || x.email || x.id, value: x.id })),
        [talents],
    );

    const preview = sim.isSuccess && sim.data ? unwrapDataPayload(sim.data) : null;
    const workloadAfter = readPct(preview?.talent_workload_after ?? preview?.workload_after);
    const viaBefore = pickCell(preview, ["project_a_viability_before", "viability_source_before"]);
    const viaAfter = pickCell(preview, ["project_a_viability_after", "viability_source_after"]);
    const vibBefore = pickCell(preview, ["project_b_viability_before", "viability_dest_before"]);
    const vibAfter = pickCell(preview, ["project_b_viability_after", "viability_dest_after"]);

    const overload =
        workloadAfter != null && workloadAfter > 85
            ? t("common:rhMobility.warnOverload", { pct: String(workloadAfter) })
            : null;
    const serverConfirm =
        preview?.requires_confirmation === true || preview?.blocking === true ? t("common:rhMobility.warnConfirm") : null;

    useEffect(() => {
        setOverloadAck(false);
    }, [sim.data, talentId, sourceProjectId, destProjectId, proposedPct]);

    const buildPayload = (): Record<string, unknown> => ({
        talent_id: talentId.trim(),
        source_project_id: sourceProjectId.trim(),
        destination_project_id: destProjectId.trim(),
        proposed_allocation_pct: Number(proposedPct),
    });

    const formReady = Boolean(talentId.trim() && sourceProjectId.trim() && destProjectId.trim());
    const canValidate =
        formReady &&
        sim.isSuccess &&
        preview &&
        Object.keys(preview).length > 0 &&
        (!overload || overloadAck);

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow="RH"
            title={t("nav:rhNavMobility")}
            description={t("common:rhMobility.description")}
        >
            <ol className="mb-6 flex flex-wrap gap-4 text-sm text-secondary">
                <li className="rounded-full border border-secondary bg-secondary/20 px-3 py-1 font-medium text-primary">
                    1 — Sélection
                </li>
                <li className="rounded-full border border-secondary px-3 py-1">2 — Simulation</li>
                <li className="rounded-full border border-secondary px-3 py-1">3 — Validation</li>
            </ol>

            {lp || lt ? <p className="text-sm text-tertiary">{t("common:loading")}</p> : null}
            {ep || et ? (
                <p className="text-sm text-error-primary">
                    {[ep, et].filter(Boolean).join(" · ")}
                </p>
            ) : null}

            <div className="grid max-w-2xl gap-4">
                <NativeSelect
                    label={t("common:rhMobility.talent")}
                    value={talentId}
                    onChange={(e) => setTalentId(e.target.value)}
                    options={[{ label: "—", value: "" }, ...talentOptions]}
                />
                <NativeSelect
                    label={t("common:rhMobility.source")}
                    value={sourceProjectId}
                    onChange={(e) => setSourceProjectId(e.target.value)}
                    options={[{ label: "—", value: "" }, ...projectOptions]}
                />
                <NativeSelect
                    label={t("common:rhMobility.dest")}
                    value={destProjectId}
                    onChange={(e) => setDestProjectId(e.target.value)}
                    options={[{ label: "—", value: "" }, ...projectOptions]}
                />
                <label className="block text-sm">
                    <span className="mb-1 block text-quaternary">{t("common:rhMobility.proposed")}</span>
                    <input
                        type="number"
                        className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-primary"
                        value={proposedPct}
                        onChange={(e) => setProposedPct(e.target.value)}
                    />
                </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
                <Button
                    color="primary"
                    size="sm"
                    isLoading={sim.isPending}
                    onClick={() => sim.mutate(buildPayload())}
                    disabled={!formReady}
                >
                    {t("common:rhMobility.simulate")}
                </Button>
                <Button color="secondary" size="sm" onClick={() => sim.reset()}>
                    {t("common:rhMobility.cancelPreview")}
                </Button>
                <Button
                    color="primary"
                    size="sm"
                    isLoading={val.isPending}
                    onClick={() => val.mutate(buildPayload())}
                    disabled={!canValidate}
                >
                    {t("common:rhMobility.validate")}
                </Button>
            </div>

            {sim.isError ? (
                <p className="mt-4 text-sm text-error-primary">{sim.error instanceof Error ? sim.error.message : String(sim.error)}</p>
            ) : null}

            {preview && Object.keys(preview).length > 0 ? (
                <div className="mt-8 space-y-6">
                    <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                        <h2 className="text-sm font-semibold text-primary">{t("common:rhMobility.previewTitle")}</h2>
                        {(overload || serverConfirm) && (
                            <div className="mt-3 space-y-2">
                                {overload ? (
                                    <div className="rounded-lg border border-warning-secondary bg-warning-secondary/20 px-3 py-2 text-sm text-warning-primary">
                                        {overload}
                                        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-medium">
                                            <input
                                                type="checkbox"
                                                checked={overloadAck}
                                                onChange={(e) => setOverloadAck(e.target.checked)}
                                                className="rounded border-secondary"
                                            />
                                            {t("common:rhMobility.overloadAck")}
                                        </label>
                                    </div>
                                ) : null}
                                {serverConfirm ? (
                                    <div className="rounded-lg border border-secondary bg-secondary/30 px-3 py-2 text-sm text-secondary">
                                        {serverConfirm}
                                    </div>
                                ) : null}
                            </div>
                        )}

                        <div className="mt-6 overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-secondary text-left text-quaternary">
                                        <th className="pb-2 pr-4 font-medium">Indicateur</th>
                                        <th className="pb-2 pr-4 font-medium">{t("common:rhMobility.colBefore")}</th>
                                        <th className="pb-2 pr-4 font-medium">{t("common:rhMobility.colAfter")}</th>
                                        <th className="pb-2 font-medium">{t("common:rhMobility.colDelta")}</th>
                                    </tr>
                                </thead>
                                <tbody className="text-primary">
                                    <tr className="border-b border-secondary/60">
                                        <td className="py-3 font-medium">{t("common:rhMobility.rowWorkload")}</td>
                                        <td className="py-3 tabular-nums">{pickCell(preview, ["talent_workload_before", "workload_before"])}</td>
                                        <td className="py-3 tabular-nums">{pickCell(preview, ["talent_workload_after", "workload_after"])}</td>
                                        <td
                                            className={`py-3 font-semibold tabular-nums ${
                                                deltaLabel(preview?.talent_workload_before ?? preview?.workload_before, preview?.talent_workload_after ?? preview?.workload_after).tone === "up"
                                                    ? "text-warning-primary"
                                                    : deltaLabel(preview?.talent_workload_before ?? preview?.workload_before, preview?.talent_workload_after ?? preview?.workload_after).tone === "down"
                                                      ? "text-success-primary"
                                                      : "text-tertiary"
                                            }`}
                                        >
                                            {deltaLabel(preview?.talent_workload_before ?? preview?.workload_before, preview?.talent_workload_after ?? preview?.workload_after).text}
                                        </td>
                                    </tr>
                                    <tr className="border-b border-secondary/60">
                                        <td className="py-3 font-medium">{t("common:rhMobility.rowProjA")}</td>
                                        <td className="py-3 tabular-nums">{viaBefore}</td>
                                        <td className="py-3 tabular-nums">{viaAfter}</td>
                                        <td
                                            className={`py-3 font-semibold tabular-nums ${
                                                deltaLabel(
                                                    preview?.project_a_viability_before ?? preview?.viability_source_before,
                                                    preview?.project_a_viability_after ?? preview?.viability_source_after,
                                                ).tone === "up"
                                                    ? "text-success-primary"
                                                    : deltaLabel(
                                                            preview?.project_a_viability_before ?? preview?.viability_source_before,
                                                            preview?.project_a_viability_after ?? preview?.viability_source_after,
                                                        ).tone === "down"
                                                      ? "text-error-primary"
                                                      : "text-tertiary"
                                            }`}
                                        >
                                            {
                                                deltaLabel(
                                                    preview?.project_a_viability_before ?? preview?.viability_source_before,
                                                    preview?.project_a_viability_after ?? preview?.viability_source_after,
                                                ).text
                                            }
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 font-medium">{t("common:rhMobility.rowProjB")}</td>
                                        <td className="py-3 tabular-nums">{vibBefore}</td>
                                        <td className="py-3 tabular-nums">{vibAfter}</td>
                                        <td
                                            className={`py-3 font-semibold tabular-nums ${
                                                deltaLabel(
                                                    preview?.project_b_viability_before ?? preview?.viability_dest_before,
                                                    preview?.project_b_viability_after ?? preview?.viability_dest_after,
                                                ).tone === "up"
                                                    ? "text-success-primary"
                                                    : deltaLabel(
                                                            preview?.project_b_viability_before ?? preview?.viability_dest_before,
                                                            preview?.project_b_viability_after ?? preview?.viability_dest_after,
                                                        ).tone === "down"
                                                      ? "text-error-primary"
                                                      : "text-tertiary"
                                            }`}
                                        >
                                            {
                                                deltaLabel(
                                                    preview?.project_b_viability_before ?? preview?.viability_dest_before,
                                                    preview?.project_b_viability_after ?? preview?.viability_dest_after,
                                                ).text
                                            }
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-4 text-sm text-secondary">{pickCell(preview, ["explanation", "message", "detail"])}</p>
                    </div>
                </div>
            ) : null}

            {val.isSuccess ? (
                <p className="mt-4 text-sm font-medium text-success-primary">{t("common:rhMobility.validated")}</p>
            ) : null}
            {val.isError ? (
                <p className="mt-2 text-sm text-error-primary">{val.error instanceof Error ? val.error.message : String(val.error)}</p>
            ) : null}
        </WorkspacePageShell>
    );
}
