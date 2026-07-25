/**
 * Drawer création / consultation affectation RH — talent → manager.
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";
import { AssignmentDrawerContext, type DrawerIntent } from "@/components/rh/mobility/AssignmentDrawerContext";
import { formatAvailableManagerLabel, availableManagersToSelectOptions } from "@/lib/rh-managers-options";
import {
    createRhAssignment,
    mapRhAssignmentsError,
    RH_ASSIGNMENTS_OVERLOAD_CODE,
    RhAssignmentsApiError,
    updateRhAssignment,
} from "@/services/rh-assignments.api";
import { useToast } from "@/providers/toast-provider";
import type { CreateRhAssignmentPayload, RhAssignmentRow, RhAvailableManager } from "@/types/rh-assignments.types";
import type { RhTalentListItem } from "@/types/rh-talents.types";
import { resolveAssignmentManagerEmail, resolveAssignmentManagerName } from "@/lib/rh-assignments-display";
import {
    RH_ALERT_ERROR,
    RH_BTN_PRIMARY,
    RH_BTN_SECONDARY,
    RH_INPUT,
    RH_MODAL_OVERLAY,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

type FormState = {
    talent_id: string;
    manager_user_id: string;
};

const EMPTY: FormState = {
    talent_id: "",
    manager_user_id: "",
};

const labelCls = cx("mb-0.5 block text-[11px] font-medium", RH_TEXT_MUTED);
const fieldCls = cx("w-full px-2.5 py-1.5 text-sm", RH_INPUT);

const INTENT_TITLES: Record<DrawerIntent, string> = {
    create: "Nouvelle affectation",
    edit: "Affectation talent → manager",
    reassign: "Réaffecter vers un manager",
};

const INTENT_SUBTITLES: Record<DrawerIntent, string> = {
    create: "Rattacher un talent à un manager responsable.",
    edit: "Consultez le rattachement actuel.",
    reassign: "Choisissez le manager de destination pour ce talent.",
};

export type AssignmentFormDrawerProps = {
    open: boolean;
    mode: "create" | "edit";
    intent?: DrawerIntent;
    assignment?: RhAssignmentRow | null;
    initialTalentId?: string | null;
    initialManagerUserId?: string | null;
    talents: RhTalentListItem[];
    managers: RhAvailableManager[];
    apiBase?: string;
    token?: string;
    onClose: () => void;
    onSaved: () => void;
};

export function AssignmentFormDrawer({
    open,
    mode,
    intent: intentProp,
    assignment,
    initialTalentId,
    initialManagerUserId,
    talents,
    managers,
    apiBase,
    token,
    onClose,
    onSaved,
}: AssignmentFormDrawerProps) {
    const { push: pushToast } = useToast();
    const [form, setForm] = useState<FormState>({ ...EMPTY });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const intent: DrawerIntent = intentProp ?? (mode === "edit" ? "edit" : "create");
    const isCreate = mode === "create";
    const isReassign = intent === "reassign";

    useEffect(() => {
        if (!open) return;
        if (isCreate) {
            const base = { ...EMPTY };
            if (initialTalentId) base.talent_id = initialTalentId;
            if (initialManagerUserId) base.manager_user_id = initialManagerUserId;
            setForm(base);
        } else {
            setForm({
                talent_id: assignment?.talent_id ?? "",
                manager_user_id: assignment?.manager_user_id ?? "",
            });
        }
        setErrors({});
        setFormError(null);
    }, [open, isCreate, assignment, initialTalentId, initialManagerUserId, intent]);

    const sortedTalents = useMemo(
        () => [...talents].sort((a, b) => a.name.localeCompare(b.name, "fr")),
        [talents],
    );
    const sortedManagers = useMemo(() => availableManagersToSelectOptions(managers), [managers]);

    const contextTalentId = form.talent_id.trim() || assignment?.talent_id || initialTalentId || null;

    const validate = (): boolean => {
        const next: Record<string, string> = {};
        if (isCreate && !isReassign && !form.talent_id.trim()) next.talent_id = "Sélectionnez un talent.";
        if ((isCreate || isReassign) && !form.manager_user_id.trim()) {
            next.manager_user_id = "Sélectionnez un manager.";
        }
        if (isReassign && !form.talent_id.trim() && !assignment?.talent_id?.trim() && !initialTalentId?.trim()) {
            next.talent_id = "Talent introuvable pour la réaffectation.";
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!isCreate) {
            onClose();
            return;
        }
        if (!validate()) return;
        setSubmitting(true);
        setFormError(null);
        try {
            if (isReassign) {
                const talentId =
                    form.talent_id.trim() || assignment?.talent_id?.trim() || initialTalentId?.trim() || "";
                await updateRhAssignment(
                    talentId,
                    { manager_user_id: form.manager_user_id.trim() },
                    { token, apiBase },
                );
                pushToast("Talent réaffecté au manager avec succès", "success");
            } else {
                const body: CreateRhAssignmentPayload = {
                    talent_id: form.talent_id.trim(),
                    manager_user_id: form.manager_user_id.trim(),
                };
                await createRhAssignment(body, { token, apiBase });
                pushToast("Talent affecté au manager avec succès", "success");
            }
            onSaved();
            onClose();
        } catch (err) {
            const msg = mapRhAssignmentsError(err);
            setFormError(msg);
            if (err instanceof RhAssignmentsApiError && err.code === RH_ASSIGNMENTS_OVERLOAD_CODE) {
                pushToast(msg, "error", 6000);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[80] flex justify-end" role="presentation">
            <button
                type="button"
                className={cx("absolute inset-0", RH_MODAL_OVERLAY)}
                aria-label="Fermer"
                onClick={onClose}
            />
            <aside
                className={cx(
                    "relative flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900",
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby="assignment-drawer-title"
            >
                <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div>
                        <h2 id="assignment-drawer-title" className={cx("text-base font-bold", RH_TEXT_PRIMARY)}>
                            {INTENT_TITLES[intent]}
                        </h2>
                        <p className={cx("mt-0.5 text-xs", RH_TEXT_MUTED)}>{INTENT_SUBTITLES[intent]}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={cx("rounded-lg p-1.5", RH_BTN_SECONDARY)}
                        aria-label="Fermer"
                    >
                        <X size={16} aria-hidden />
                    </button>
                </header>

                <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                        <AssignmentDrawerContext
                            talentId={contextTalentId}
                            assignment={mode === "edit" ? assignment : null}
                            talents={talents}
                        />

                        {formError ? <div className={cx("text-sm", RH_ALERT_ERROR)}>{formError}</div> : null}

                        {isCreate ? (
                            <>
                                {!isReassign ? (
                                    <div>
                                        <label className={labelCls} htmlFor="assign-talent">
                                            Talent
                                        </label>
                                        <select
                                            id="assign-talent"
                                            className={fieldCls}
                                            value={form.talent_id}
                                            onChange={(e) => setForm((f) => ({ ...f, talent_id: e.target.value }))}
                                        >
                                            <option value="">— Choisir —</option>
                                            {sortedTalents.map((t) => (
                                                <option key={t.id} value={t.id}>
                                                    {t.name}
                                                    {t.job_title ? ` · ${t.job_title}` : ""}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.talent_id ? (
                                            <p className="mt-0.5 text-xs text-rose-600">{errors.talent_id}</p>
                                        ) : null}
                                    </div>
                                ) : (
                                    <div
                                        className={cx(
                                            "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/50",
                                        )}
                                    >
                                        <p className={cx("text-[10px] font-semibold uppercase tracking-wide", RH_TEXT_MUTED)}>
                                            Talent
                                        </p>
                                        <p className={cx("font-semibold", RH_TEXT_PRIMARY)}>
                                            {sortedTalents.find((t) => t.id === contextTalentId)?.name ??
                                                assignment?.talent_name ??
                                                "Talent"}
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <label className={labelCls} htmlFor="assign-manager">
                                        Manager
                                    </label>
                                    <select
                                        id="assign-manager"
                                        className={fieldCls}
                                        value={form.manager_user_id}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, manager_user_id: e.target.value }))
                                        }
                                    >
                                        <option value="">— Choisir —</option>
                                        {sortedManagers.map((m) => (
                                            <option key={m.manager_user_id} value={m.manager_user_id}>
                                                {formatAvailableManagerLabel(m)}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.manager_user_id ? (
                                        <p className="mt-0.5 text-xs text-rose-600">{errors.manager_user_id}</p>
                                    ) : null}
                                    {sortedManagers.length === 0 ? (
                                        <p className={cx("mt-1 text-xs", RH_TEXT_MUTED)}>
                                            Aucun manager disponible
                                        </p>
                                    ) : null}
                                </div>
                            </>
                        ) : (
                            <div
                                className={cx(
                                    "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/50",
                                )}
                            >
                                <p className={cx("text-[10px] font-semibold uppercase tracking-wide", RH_TEXT_MUTED)}>
                                    Manager
                                </p>
                                <p className={cx("font-semibold", RH_TEXT_PRIMARY)}>
                                    {assignment ? resolveAssignmentManagerName(assignment) : "Sans manager"}
                                </p>
                                <p className={cx("mt-1 text-xs", RH_TEXT_MUTED)}>
                                    {assignment ? resolveAssignmentManagerEmail(assignment) : "Non assigné"}
                                </p>
                            </div>
                        )}
                    </div>

                    <footer className="flex gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className={cx("flex-1 px-3 py-2 text-sm font-semibold", RH_BTN_SECONDARY)}
                        >
                            {isCreate ? "Annuler" : "Fermer"}
                        </button>
                        {isCreate ? (
                            <button
                                type="submit"
                                disabled={submitting}
                                className={cx(
                                    "inline-flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-semibold",
                                    RH_BTN_PRIMARY,
                                )}
                            >
                                {submitting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
                                {isReassign ? "Confirmer la réaffectation" : "Confirmer l&apos;affectation"}
                            </button>
                        ) : null}
                    </footer>
                </form>
            </aside>
        </div>
    );
}
