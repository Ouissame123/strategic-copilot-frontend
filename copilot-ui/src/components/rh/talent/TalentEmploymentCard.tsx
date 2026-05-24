/**
 * Carte Emploi & contrat — données GET `/rh/talents/:id/employment` uniquement.
 */
import { useMemo, useState } from "react";
import {
    AlertTriangle,
    Briefcase,
    Calendar,
    Coins,
    Loader2,
    Pencil,
    Plus,
    Trash2,
    User,
    UserCircle,
} from "lucide-react";
import {
    contractExpiryMeta,
    contractStatusBadgeMeta,
    fmtEmploymentDate,
    formatSalaryDisplay,
    formatTenureFromBackend,
    hasEmploymentData,
    resolveContractBadge,
} from "@/lib/rh-employment-display";
import {
    mapRhTalentEmploymentApiError,
    useDeleteTalentEmployment,
    useTalentEmployment,
} from "@/hooks/useTalentEmployment";
import { useToast } from "@/providers/toast-provider";
import {
    RH_BTN_PRIMARY,
    RH_CARD,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
    RH_TEXT_SECONDARY,
    WS_MUTED_SURFACE,
    WS_TEXT_FAINT,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

const EMPTY = "Non renseigné";

export type TalentEmploymentCardProps = {
    talentId: string;
    token?: string;
    apiBase?: string;
    onRequestEmploymentEdit?: (mode: "create" | "edit") => void;
};

function EmploymentSkeleton() {
    return (
        <div className="animate-pulse space-y-3" aria-hidden>
            <div className="flex justify-between">
                <div className={cx("h-4 w-32 rounded", WS_MUTED_SURFACE)} />
                <div className={cx("h-7 w-20 rounded-full", WS_MUTED_SURFACE)} />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={cx("h-12 rounded-lg", WS_MUTED_SURFACE)} />
                ))}
            </div>
        </div>
    );
}

function FieldCell({
    icon,
    label,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div
            className={cx(
                "rounded-lg border border-slate-100/90 bg-white/60 p-2.5 backdrop-blur-sm transition hover:border-slate-200/90 dark:border-slate-800/90 dark:bg-slate-900/40 dark:hover:border-slate-700",
            )}
        >
            <div className={cx("mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide", WS_TEXT_FAINT)}>
                {icon}
                {label}
            </div>
            <div className={cx("text-sm font-medium leading-snug", RH_TEXT_PRIMARY)}>{children}</div>
        </div>
    );
}

export function TalentEmploymentCard({
    talentId,
    token,
    apiBase,
    onRequestEmploymentEdit,
}: TalentEmploymentCardProps) {
    const { push: pushToast } = useToast();
    const ctx = useMemo(() => ({ token, apiBase }), [token, apiBase]);

    const { data, isLoading, isError, error, isFetching } = useTalentEmployment(talentId, ctx);
    const deleteMutation = useDeleteTalentEmployment(talentId, ctx);

    const [confirmDelete, setConfirmDelete] = useState(false);

    const employment = data?.employment ?? null;
    const manager = data?.manager ?? null;
    const notConfigured = Boolean(data?.notConfigured);

    const contractBadge = resolveContractBadge(employment?.contract_type);
    const contractStatus = contractStatusBadgeMeta(employment?.contract_end_date);
    const tenure = formatTenureFromBackend(employment?.tenure_years, employment?.tenure_months);
    const expiry = contractExpiryMeta(employment?.contract_end_date);
    const salaryLabel = formatSalaryDisplay(employment?.salary, { compact: true });

    const hasData = hasEmploymentData(employment);
    const submitting = deleteMutation.isPending;

    const openCreate = () => onRequestEmploymentEdit?.("create");
    const openEdit = () => onRequestEmploymentEdit?.("edit");

    const handleDelete = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        try {
            await deleteMutation.mutateAsync();
            pushToast("Contrat supprimé", "success");
            setConfirmDelete(false);
        } catch (err) {
            pushToast(mapRhTalentEmploymentApiError(err), "error");
            setConfirmDelete(false);
        }
    };

    const managerLabel = manager?.manager_name?.trim() || "Non assigné";

    return (
        <section
            className={cx(
                RH_CARD,
                "overflow-hidden border-slate-200/80 bg-gradient-to-br from-white via-slate-50/80 to-sky-50/20 p-0 shadow-sm backdrop-blur-sm dark:border-slate-700/80 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/10",
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100/90 px-3 py-2.5 dark:border-slate-800">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <Briefcase size={14} className="shrink-0 text-ws-accent" aria-hidden />
                    <h3 className={cx("text-[11px] font-bold uppercase tracking-wider", RH_TEXT_SECONDARY)}>
                        Emploi & contrat
                    </h3>
                    {contractBadge ? (
                        <span
                            className={cx(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                contractBadge.cls,
                            )}
                        >
                            <contractBadge.Icon size={11} aria-hidden />
                            {contractBadge.label}
                        </span>
                    ) : null}
                    {hasData ? (
                        <span
                            className={cx(
                                "inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ring-inset",
                                contractStatus.cls,
                            )}
                        >
                            {contractStatus.label}
                        </span>
                    ) : null}
                    {expiry.showWarning && expiry.label ? (
                        <span
                            className={cx(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold",
                                expiry.urgency === "danger"
                                    ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:ring-rose-900"
                                    : "bg-amber-100 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-900",
                            )}
                        >
                            {expiry.label}
                        </span>
                    ) : null}
                    {isFetching && !isLoading ? (
                        <Loader2 size={12} className={cx("animate-spin", RH_TEXT_MUTED)} aria-label="Actualisation" />
                    ) : null}
                </div>

                {hasData && onRequestEmploymentEdit ? (
                    <div className="flex shrink-0 items-center gap-1">
                        <button
                            type="button"
                            onClick={openEdit}
                            disabled={submitting}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-800"
                            title="Modifier le contrat"
                        >
                            <Pencil size={13} aria-hidden />
                            Modifier
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleDelete()}
                            disabled={submitting}
                            className={cx(
                                "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium",
                                confirmDelete
                                    ? "bg-rose-600 text-white hover:bg-rose-700"
                                    : "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40",
                            )}
                            title={confirmDelete ? "Confirmer la suppression" : "Supprimer le contrat"}
                        >
                            <Trash2 size={13} aria-hidden />
                            {confirmDelete ? "Confirmer ?" : "Supprimer"}
                        </button>
                    </div>
                ) : null}
            </div>

            <div className="p-3">
                {isLoading ? (
                    <EmploymentSkeleton />
                ) : isError && !notConfigured ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                        {error instanceof Error ? error.message : "Impossible de charger le contrat"}
                    </div>
                ) : !hasData ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/90 bg-white/50 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-900/30">
                        <Briefcase size={28} className={WS_TEXT_FAINT} aria-hidden />
                        <p className={cx("mt-2 text-sm font-medium", RH_TEXT_PRIMARY)}>
                            {notConfigured ? "Contrat non configuré" : "Aucun contrat renseigné"}
                        </p>
                        <p className={cx("mt-1 max-w-xs text-xs", RH_TEXT_MUTED)}>
                            {notConfigured
                                ? "Le workflow employment n’est pas publié ou aucune fiche contrat n’existe encore pour ce talent."
                                : "Renseignez le contrat pour suivre l’ancienneté, la rémunération et les échéances."}
                        </p>
                        {onRequestEmploymentEdit ? (
                            <button
                                type="button"
                                onClick={openCreate}
                                className={cx(
                                    "mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
                                    RH_BTN_PRIMARY,
                                )}
                            >
                                <Plus size={14} aria-hidden />
                                Ajouter un contrat
                            </button>
                        ) : null}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {expiry.showWarning && expiry.label ? (
                            <div
                                className={cx(
                                    "flex items-start gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                                    expiry.urgency === "danger"
                                        ? "bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
                                        : "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
                                )}
                                role="status"
                            >
                                <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
                                <span>{expiry.label}</span>
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            <FieldCell icon={<User size={11} aria-hidden />} label="Rôle">
                                {employment?.role?.trim() ? (
                                    employment.role
                                ) : (
                                    <span className={RH_TEXT_MUTED}>{EMPTY}</span>
                                )}
                            </FieldCell>
                            <FieldCell icon={<Briefcase size={11} aria-hidden />} label="Type contrat">
                                {contractBadge ? (
                                    <span
                                        className={cx(
                                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                            contractBadge.cls,
                                        )}
                                    >
                                        <contractBadge.Icon size={12} aria-hidden />
                                        {contractBadge.label}
                                    </span>
                                ) : (
                                    <span className={RH_TEXT_MUTED}>{EMPTY}</span>
                                )}
                            </FieldCell>
                            <FieldCell icon={<Coins size={11} aria-hidden />} label="Rémunération">
                                {salaryLabel ?? <span className={RH_TEXT_MUTED}>{EMPTY}</span>}
                            </FieldCell>
                            <FieldCell icon={<Calendar size={11} aria-hidden />} label="Date intégration">
                                {fmtEmploymentDate(employment?.integration_date) ?? (
                                    <span className={RH_TEXT_MUTED}>{EMPTY}</span>
                                )}
                            </FieldCell>
                            <FieldCell icon={<Calendar size={11} aria-hidden />} label="Fin contrat">
                                {fmtEmploymentDate(employment?.contract_end_date) ?? (
                                    <span className="text-emerald-600 dark:text-emerald-400">Sans date de fin</span>
                                )}
                            </FieldCell>
                            <FieldCell icon={<UserCircle size={11} aria-hidden />} label="Manager">
                                {managerLabel}
                            </FieldCell>
                            <FieldCell icon={<Calendar size={11} aria-hidden />} label="Ancienneté">
                                {tenure ? (
                                    tenure
                                ) : (
                                    <span className={RH_TEXT_MUTED}>{EMPTY}</span>
                                )}
                            </FieldCell>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
