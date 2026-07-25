/**
 * Onglet Absences — GET/POST/DELETE absences talent RH.
 */
import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Calendar, Loader2, Plus, Trash2 } from "lucide-react";
import {
    absenceStatusMeta,
    absenceTypeLabel,
    fmtAbsenceDate,
    formatAbsenceDuration,
    RH_ABSENCE_TYPE_OPTIONS,
} from "@/lib/rh-absences-display";
import {
    mapRhTalentAbsencesApiError,
    useCreateTalentAbsence,
    useDeleteTalentAbsence,
    useTalentAbsences,
} from "@/hooks/useTalentAbsences";
import { useToast } from "@/providers/toast-provider";
import type { RhAbsenceType } from "@/types/rh-absences.types";
import {
    RH_BTN_PRIMARY,
    RH_BTN_SECONDARY,
    RH_CARD,
    RH_INPUT,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
    RH_TEXT_SECONDARY,
    WS_MUTED_SURFACE,
    WS_TEXT_FAINT,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type TalentAbsencesSectionProps = {
    talentId: string;
    token?: string;
};

function AbsencesSkeleton() {
    return (
        <div className="animate-pulse space-y-3" aria-hidden>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={cx("h-14 rounded-lg", WS_MUTED_SURFACE)} />
                ))}
            </div>
            <div className={cx("h-32 rounded-lg", WS_MUTED_SURFACE)} />
            <div className={cx("h-40 rounded-lg", WS_MUTED_SURFACE)} />
        </div>
    );
}

function SummaryPill({ label, value, tone }: { label: string; value: number; tone?: "default" | "warn" | "info" }) {
    const valueCls =
        tone === "warn"
            ? "text-amber-700 dark:text-amber-300"
            : tone === "info"
              ? "text-primary-700 dark:text-primary-300"
              : RH_TEXT_PRIMARY;
    return (
        <div
            className={cx(
                "rounded-lg border border-slate-100/90 bg-white/70 p-2.5 text-center backdrop-blur-sm dark:border-slate-800/90 dark:bg-slate-900/50",
            )}
        >
            <div className={cx("text-[10px] font-semibold uppercase tracking-wide", WS_TEXT_FAINT)}>{label}</div>
            <div className={cx("mt-0.5 text-lg font-bold tabular-nums", valueCls)}>{value}</div>
        </div>
    );
}

export function TalentAbsencesSection({ talentId, token }: TalentAbsencesSectionProps) {
    const ctx = useMemo(() => ({ token }), [token]);
    const { push: pushToast } = useToast();
    const { data, isLoading, isError, error, refetch, isFetching } = useTalentAbsences(talentId, ctx);
    const createMutation = useCreateTalentAbsence(talentId, ctx);
    const deleteMutation = useDeleteTalentAbsence(talentId, ctx);

    const [absenceType, setAbsenceType] = useState<RhAbsenceType>("vacation");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const absences = data?.absences ?? [];
    const summary = data?.summary ?? { total: 0, current: 0, upcoming: 0, past: 0 };
    const submitting = createMutation.isPending || deleteMutation.isPending;

    const handleAdd = async (e: FormEvent) => {
        e.preventDefault();
        if (!startDate.trim()) {
            pushToast("Date de début obligatoire", "error");
            return;
        }
        try {
            await createMutation.mutateAsync({
                start_date: startDate,
                end_date: endDate.trim() ? endDate : null,
                absence_type: absenceType,
            });
            pushToast("Absence ajoutée", "success");
            setStartDate("");
            setEndDate("");
            setAbsenceType("vacation");
        } catch (err) {
            pushToast(mapRhTalentAbsencesApiError(err), "error");
        }
    };

    const handleDelete = async (absenceId: string, label: string) => {
        if (!window.confirm(`Supprimer l’absence « ${label} » ?`)) return;
        try {
            await deleteMutation.mutateAsync(absenceId);
            pushToast("Absence supprimée", "success");
        } catch (err) {
            pushToast(mapRhTalentAbsencesApiError(err), "error");
        }
    };

    return (
        <section
            className={cx(
                RH_CARD,
                "overflow-hidden border-slate-200/80 bg-gradient-to-br from-white via-slate-50/80 to-primary-50/20 p-0 shadow-sm backdrop-blur-sm dark:border-slate-700/80 dark:from-slate-900 dark:via-slate-900 dark:to-primary-950/10",
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100/90 px-3 py-2.5 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="shrink-0 text-ws-accent" aria-hidden />
                    <h3 className={cx("text-[11px] font-bold uppercase tracking-wider", RH_TEXT_SECONDARY)}>
                        Absences
                    </h3>
                    {isFetching && !isLoading ? (
                        <Loader2 size={12} className="animate-spin text-ws-faint" aria-hidden />
                    ) : null}
                </div>
            </div>

            <div className="space-y-4 p-3">
                {isLoading ? <AbsencesSkeleton /> : null}

                {isError ? (
                    <div className={cx("rounded-lg border border-rose-200 bg-rose-50/80 p-3 dark:border-rose-900 dark:bg-rose-950/30")}>
                        <div className="flex items-start gap-2">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" aria-hidden />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">
                                    Impossible de charger les absences
                                </p>
                                <p className="mt-1 text-xs text-rose-800/90 dark:text-rose-200/90">
                                    {mapRhTalentAbsencesApiError(error)}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => void refetch()}
                                    className={cx("mt-2 rounded-lg px-2.5 py-1 text-xs font-semibold", RH_BTN_SECONDARY)}
                                >
                                    Réessayer
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {!isLoading && !isError ? (
                    <>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <SummaryPill label="Total" value={summary.total} />
                            <SummaryPill label="En cours" value={summary.current} tone="warn" />
                            <SummaryPill label="À venir" value={summary.upcoming} tone="info" />
                            <SummaryPill label="Passées" value={summary.past} />
                        </div>

                        <form
                            onSubmit={(e) => void handleAdd(e)}
                            className={cx(
                                "rounded-lg border border-slate-100/90 bg-white/60 p-3 dark:border-slate-800/90 dark:bg-slate-900/40",
                            )}
                        >
                            <p className={cx("mb-2 text-[10px] font-bold uppercase tracking-wider", RH_TEXT_MUTED)}>
                                Ajouter une absence
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className={cx("mb-1 block text-xs font-medium", RH_TEXT_MUTED)}>Type</label>
                                    <select
                                        className={cx("w-full text-sm", RH_INPUT)}
                                        value={absenceType}
                                        onChange={(e) => setAbsenceType(e.target.value as RhAbsenceType)}
                                        disabled={submitting}
                                    >
                                        {RH_ABSENCE_TYPE_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={cx("mb-1 block text-xs font-medium", RH_TEXT_MUTED)}>
                                        Date début <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        className={cx("w-full text-sm", RH_INPUT)}
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        disabled={submitting}
                                    />
                                </div>
                                <div>
                                    <label className={cx("mb-1 block text-xs font-medium", RH_TEXT_MUTED)}>
                                        Date fin
                                    </label>
                                    <input
                                        type="date"
                                        className={cx("w-full text-sm", RH_INPUT)}
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        disabled={submitting}
                                        min={startDate || undefined}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className={cx(
                                    "mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
                                    RH_BTN_PRIMARY,
                                )}
                            >
                                {createMutation.isPending ? (
                                    <Loader2 size={14} className="animate-spin" aria-hidden />
                                ) : (
                                    <Plus size={14} aria-hidden />
                                )}
                                Ajouter absence
                            </button>
                        </form>

                        {absences.length === 0 ? (
                            <p className={cx("rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm", RH_TEXT_MUTED)}>
                                Aucune absence enregistrée pour ce talent.
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-slate-100/90 dark:border-slate-800/90">
                                <table className="w-full min-w-[520px] text-left text-sm">
                                    <thead>
                                        <tr className={cx("border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide dark:border-slate-800", RH_TEXT_MUTED)}>
                                            <th className="px-3 py-2">Type</th>
                                            <th className="px-3 py-2">Début</th>
                                            <th className="px-3 py-2">Fin</th>
                                            <th className="px-3 py-2">Durée</th>
                                            <th className="px-3 py-2">État</th>
                                            <th className="px-3 py-2 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {absences.map((row) => {
                                            const status = absenceStatusMeta(row.status);
                                            const label = absenceTypeLabel(row.absence_type);
                                            return (
                                                <tr
                                                    key={row.id}
                                                    className="border-b border-slate-50 last:border-0 dark:border-slate-800/80"
                                                >
                                                    <td className={cx("px-3 py-2.5 font-medium", RH_TEXT_PRIMARY)}>{label}</td>
                                                    <td className={cx("px-3 py-2.5 tabular-nums", RH_TEXT_SECONDARY)}>
                                                        {fmtAbsenceDate(row.start_date)}
                                                    </td>
                                                    <td className={cx("px-3 py-2.5 tabular-nums", RH_TEXT_SECONDARY)}>
                                                        {row.end_date ? fmtAbsenceDate(row.end_date) : "—"}
                                                    </td>
                                                    <td className={cx("px-3 py-2.5 tabular-nums", RH_TEXT_SECONDARY)}>
                                                        {formatAbsenceDuration(row.duration_days)}
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <span
                                                            className={cx(
                                                                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                                                status.cls,
                                                            )}
                                                        >
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right">
                                                        <button
                                                            type="button"
                                                            title="Supprimer"
                                                            disabled={submitting}
                                                            onClick={() => void handleDelete(row.id, label)}
                                                            className="rounded-lg p-1.5 text-ws-faint hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                        >
                                                            <Trash2 size={14} aria-hidden />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </section>
    );
}
