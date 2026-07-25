import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    ArrowLeftRight,
    ClipboardList,
    GraduationCap,
    Loader2,
    Puzzle,
    UserPlus,
    X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RhActionRequestType } from "@/api/rh-actions.api";
import type { RhActionPriority } from "@/types/manager-rh-actions.types";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { InitialsAvatar } from "@/components/manager/inbox-triage";
import { priorityDotClass } from "@/components/manager/inbox-triage/triage-ui";
import { RH_PRIMARY_CTA_CLASSES } from "@/components/rh-requests/rh-requests-styles";
import { useTeam } from "@/hooks/useTeam";
import { cx } from "@/utils/cx";

type CreateRHRequestModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: RhActionRequestType | "";
    projectId: string;
    assignedTo: string;
    priority: RhActionPriority | "";
    message: string;
    onType: (v: RhActionRequestType | "") => void;
    onProjectId: (v: string) => void;
    onAssignedTo: (v: string) => void;
    onPriority: (v: RhActionPriority | "") => void;
    onMessage: (v: string) => void;
    onSubmit: () => void;
    isSubmitting: boolean;
    projectOptions: { id: string; label: string }[];
    labels: {
        modalTitle: string;
        modalSubtitle: string;
        fieldType: string;
        fieldProjectOptional: string;
        fieldAssignedOptional: string;
        fieldPriority: string;
        fieldMessage: string;
        noProjectOption: string;
        placeholderMessage: string;
        placeholderAssignedSearch: string;
        clearAssignee: string;
        cancel: string;
        send: string;
        sending: string;
        abandonConfirm: string;
        errorTypeRequired: string;
        errorMessageRequired: string;
        loadingTeam: string;
        noTeamMembers: string;
        typeRecruitment: string;
        typeTraining: string;
        typeReallocation: string;
        typeOverload: string;
        typeSkillGap: string;
        typeDescRecruitment: string;
        typeDescTraining: string;
        typeDescReallocation: string;
        typeDescOverload: string;
        typeDescSkillGap: string;
        priorityPillNormal: string;
        priorityPillHigh: string;
        priorityPillUrgent: string;
    };
};

const TYPE_CARDS: {
    value: RhActionRequestType;
    icon: LucideIcon;
    labelKey: "typeRecruitment" | "typeTraining" | "typeReallocation" | "typeOverload" | "typeSkillGap";
    descKey:
        | "typeDescRecruitment"
        | "typeDescTraining"
        | "typeDescReallocation"
        | "typeDescOverload"
        | "typeDescSkillGap";
}[] = [
    { value: "recruitment", icon: UserPlus, labelKey: "typeRecruitment", descKey: "typeDescRecruitment" },
    { value: "training", icon: GraduationCap, labelKey: "typeTraining", descKey: "typeDescTraining" },
    { value: "reallocation", icon: ArrowLeftRight, labelKey: "typeReallocation", descKey: "typeDescReallocation" },
    { value: "overload", icon: AlertTriangle, labelKey: "typeOverload", descKey: "typeDescOverload" },
    { value: "skill_gap", icon: Puzzle, labelKey: "typeSkillGap", descKey: "typeDescSkillGap" },
];

/** Ordre de sévérité visuelle : Normale → Haute → Urgente = normal, low, urgent */
const PRIORITY_PILLS: { value: RhActionPriority; labelKey: "priorityPillNormal" | "priorityPillHigh" | "priorityPillUrgent" }[] = [
    { value: "normal", labelKey: "priorityPillNormal" },
    { value: "low", labelKey: "priorityPillHigh" },
    { value: "urgent", labelKey: "priorityPillUrgent" },
];

const textareaClass = cx(
    "min-h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-xs outline-none transition",
    "placeholder:text-slate-400 focus-visible:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-500/25",
    "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500",
);

function foldAccents(s: string): string {
    return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function talentUuid(t: { id: string; talent_id?: string }): string {
    return String(t.talent_id ?? t.id).trim();
}

function rhPriorityDotClass(priority: RhActionPriority): string {
    if (priority === "urgent") return priorityDotClass("urgent");
    if (priority === "low") return priorityDotClass("high");
    return priorityDotClass("normal");
}

export function CreateRHRequestModal({
    open,
    onOpenChange,
    type,
    projectId,
    assignedTo,
    priority,
    message,
    onType,
    onProjectId,
    onAssignedTo,
    onPriority,
    onMessage,
    onSubmit,
    isSubmitting,
    projectOptions,
    labels,
}: CreateRHRequestModalProps) {
    const baseId = useId();
    const typeFieldId = `${baseId}-type`;
    const assignedFieldId = `${baseId}-assigned`;
    const priorityFieldId = `${baseId}-priority`;
    const messageFieldId = `${baseId}-message`;
    const listboxId = `${baseId}-assignee-listbox`;

    const firstTypeRef = useRef<HTMLButtonElement>(null);
    const assigneeInputRef = useRef<HTMLInputElement>(null);
    const listboxRef = useRef<HTMLUListElement>(null);

    const [assigneeQuery, setAssigneeQuery] = useState("");
    const [assigneeOpen, setAssigneeOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const [showErrors, setShowErrors] = useState(false);

    const teamQuery = useTeam({ scope: "mine", limit: 200 });
    const talents = teamQuery.data?.talents ?? [];

    const selectedTalent = useMemo(
        () => talents.find((t) => talentUuid(t) === assignedTo.trim()) ?? null,
        [talents, assignedTo],
    );

    const filteredTalents = useMemo(() => {
        const q = foldAccents(assigneeQuery.trim());
        if (!q) return talents;
        return talents.filter((t) => foldAccents(t.full_name).includes(q));
    }, [talents, assigneeQuery]);

    const isDirty = Boolean(
        type || projectId || assignedTo || message.trim() || (priority && priority !== "normal"),
    );

    const typeError = showErrors && !type;
    const messageError = showErrors && !message.trim();
    const incomplete = !type || !message.trim();

    useEffect(() => {
        if (!open) {
            setAssigneeQuery("");
            setAssigneeOpen(false);
            setHighlightIndex(0);
            setShowErrors(false);
            return;
        }
        const t = window.setTimeout(() => firstTypeRef.current?.focus(), 0);
        return () => window.clearTimeout(t);
    }, [open]);

    useEffect(() => {
        setHighlightIndex(0);
    }, [assigneeQuery, assigneeOpen]);

    const requestClose = () => {
        if (isDirty && !window.confirm(labels.abandonConfirm)) return;
        onOpenChange(false);
    };

    const handleOpenChange = (next: boolean) => {
        if (!next) {
            requestClose();
            return;
        }
        onOpenChange(true);
    };

    const selectAssignee = (id: string) => {
        onAssignedTo(id);
        setAssigneeQuery("");
        setAssigneeOpen(false);
        assigneeInputRef.current?.blur();
    };

    const clearAssignee = () => {
        onAssignedTo("");
        setAssigneeQuery("");
        setAssigneeOpen(false);
        assigneeInputRef.current?.focus();
    };

    const handleSubmit = () => {
        if (!type || !message.trim()) {
            setShowErrors(true);
            return;
        }
        onSubmit();
    };

    const inputDisplayValue =
        assigneeOpen || assigneeQuery ? assigneeQuery : selectedTalent?.full_name ?? "";

    return (
        <ModalOverlay isOpen={open} onOpenChange={handleOpenChange} isDismissable>
            <Modal>
                <Dialog
                    className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
                    style={{ maxHeight: "85dvh" }}
                >
                    <div className="flex max-h-[85dvh] flex-col">
                        <header className="shrink-0 border-b border-slate-100 bg-gradient-to-br from-violet-50/80 to-white px-6 py-6 dark:border-slate-800 dark:from-violet-950/30 dark:to-slate-900 sm:px-8 sm:py-7">
                            <div className="flex gap-4">
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md">
                                    <ClipboardList className="size-6" strokeWidth={2} aria-hidden />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                                        {labels.modalTitle}
                                    </h2>
                                    <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                                        {labels.modalSubtitle}
                                    </p>
                                </div>
                            </div>
                        </header>

                        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
                            {/* Type — premier champ */}
                            <fieldset>
                                <legend id={typeFieldId} className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {labels.fieldType}
                                    <span className="text-red-500" aria-hidden>
                                        {" "}
                                        *
                                    </span>
                                </legend>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-labelledby={typeFieldId} aria-required>
                                    {TYPE_CARDS.map((card, index) => {
                                        const Icon = card.icon;
                                        const selected = type === card.value;
                                        return (
                                            <button
                                                key={card.value}
                                                ref={index === 0 ? firstTypeRef : undefined}
                                                type="button"
                                                role="radio"
                                                aria-checked={selected}
                                                onClick={() => onType(card.value)}
                                                className={cx(
                                                    "flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition",
                                                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
                                                    selected
                                                        ? "border-violet-500 bg-violet-50 ring-1 ring-violet-500/40 dark:border-violet-400 dark:bg-violet-950/40"
                                                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600",
                                                    typeError && !selected && "border-red-300 dark:border-red-800",
                                                )}
                                            >
                                                <span
                                                    className={cx(
                                                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
                                                        selected
                                                            ? "bg-violet-600 text-white"
                                                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                                                    )}
                                                >
                                                    <Icon className="size-4" aria-hidden />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-50">
                                                        {labels[card.labelKey]}
                                                    </span>
                                                    <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-slate-400">
                                                        {labels[card.descKey]}
                                                    </span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {typeError ? (
                                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400" role="alert">
                                        {labels.errorTypeRequired}
                                    </p>
                                ) : null}
                            </fieldset>

                            <NativeSelect
                                label={labels.fieldProjectOptional}
                                value={projectId}
                                onChange={(e) => onProjectId(e.target.value)}
                                selectClassName="rounded-xl border-slate-200 dark:border-slate-700"
                                options={[
                                    { label: labels.noProjectOption, value: "" },
                                    ...projectOptions.map((x) => ({ label: x.label, value: x.id })),
                                ]}
                            />

                            {/* Assigné à — combobox searchable */}
                            <div className="relative">
                                <label htmlFor={assignedFieldId} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {labels.fieldAssignedOptional}
                                </label>
                                <div
                                    className={cx(
                                        "flex items-center gap-1 rounded-xl border border-slate-200 bg-white shadow-xs transition dark:border-slate-700 dark:bg-slate-950",
                                        "focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/25",
                                    )}
                                >
                                    {selectedTalent && !assigneeOpen && !assigneeQuery ? (
                                        <span className="pl-2.5">
                                            <InitialsAvatar name={selectedTalent.full_name} className="size-7 text-[10px]" />
                                        </span>
                                    ) : null}
                                    <input
                                        ref={assigneeInputRef}
                                        id={assignedFieldId}
                                        type="text"
                                        role="combobox"
                                        aria-expanded={assigneeOpen}
                                        aria-controls={listboxId}
                                        aria-autocomplete="list"
                                        aria-activedescendant={
                                            assigneeOpen && filteredTalents[highlightIndex]
                                                ? `${listboxId}-opt-${highlightIndex}`
                                                : undefined
                                        }
                                        autoComplete="off"
                                        value={inputDisplayValue}
                                        placeholder={labels.placeholderAssignedSearch}
                                        disabled={isSubmitting}
                                        onChange={(e) => {
                                            setAssigneeQuery(e.target.value);
                                            setAssigneeOpen(true);
                                            if (assignedTo) onAssignedTo("");
                                        }}
                                        onFocus={() => setAssigneeOpen(true)}
                                        onBlur={() => {
                                            window.setTimeout(() => setAssigneeOpen(false), 150);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "ArrowDown") {
                                                e.preventDefault();
                                                setAssigneeOpen(true);
                                                setHighlightIndex((i) =>
                                                    filteredTalents.length ? Math.min(i + 1, filteredTalents.length - 1) : 0,
                                                );
                                            } else if (e.key === "ArrowUp") {
                                                e.preventDefault();
                                                setHighlightIndex((i) => Math.max(i - 1, 0));
                                            } else if (e.key === "Enter") {
                                                if (assigneeOpen && filteredTalents[highlightIndex]) {
                                                    e.preventDefault();
                                                    selectAssignee(talentUuid(filteredTalents[highlightIndex]));
                                                }
                                            } else if (e.key === "Escape") {
                                                if (assigneeOpen) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setAssigneeOpen(false);
                                                }
                                            }
                                        }}
                                        className="min-w-0 flex-1 border-0 bg-transparent px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                                    />
                                    {assignedTo || assigneeQuery ? (
                                        <button
                                            type="button"
                                            className="mr-2 inline-flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                            aria-label={labels.clearAssignee}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={clearAssignee}
                                        >
                                            <X className="size-4" aria-hidden />
                                        </button>
                                    ) : null}
                                </div>

                                {assigneeOpen ? (
                                    <ul
                                        ref={listboxRef}
                                        id={listboxId}
                                        role="listbox"
                                        className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                                    >
                                        {teamQuery.isPending ? (
                                            <li className="px-3 py-2.5 text-sm text-slate-500">{labels.loadingTeam}</li>
                                        ) : filteredTalents.length === 0 ? (
                                            <li className="px-3 py-2.5 text-sm text-slate-500">{labels.noTeamMembers}</li>
                                        ) : (
                                            filteredTalents.map((t, index) => {
                                                const id = talentUuid(t);
                                                const active = index === highlightIndex;
                                                const selected = id === assignedTo;
                                                return (
                                                    <li
                                                        key={id}
                                                        id={`${listboxId}-opt-${index}`}
                                                        role="option"
                                                        aria-selected={selected}
                                                        className={cx(
                                                            "flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm",
                                                            active
                                                                ? "bg-violet-50 text-slate-900 dark:bg-violet-950/50 dark:text-slate-50"
                                                                : "text-slate-700 dark:text-slate-200",
                                                        )}
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onMouseEnter={() => setHighlightIndex(index)}
                                                        onClick={() => selectAssignee(id)}
                                                    >
                                                        <InitialsAvatar name={t.full_name} className="size-7 text-[10px]" />
                                                        <span className="truncate font-medium">{t.full_name}</span>
                                                    </li>
                                                );
                                            })
                                        )}
                                    </ul>
                                ) : null}
                            </div>

                            {/* Priorité — pills */}
                            <fieldset>
                                <legend id={priorityFieldId} className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {labels.fieldPriority}
                                </legend>
                                <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={priorityFieldId}>
                                    {PRIORITY_PILLS.map((pill) => {
                                        const selected = priority === pill.value;
                                        return (
                                            <button
                                                key={pill.value}
                                                type="button"
                                                role="radio"
                                                aria-checked={selected}
                                                onClick={() => onPriority(pill.value)}
                                                className={cx(
                                                    "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                                                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
                                                    selected
                                                        ? "border-violet-500 bg-violet-50 text-violet-900 ring-1 ring-violet-500/30 dark:border-violet-400 dark:bg-violet-950/40 dark:text-violet-100"
                                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300",
                                                )}
                                            >
                                                <span
                                                    className={cx("size-2 shrink-0 rounded-full", rhPriorityDotClass(pill.value))}
                                                    aria-hidden
                                                />
                                                {labels[pill.labelKey]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </fieldset>

                            <div>
                                <label htmlFor={messageFieldId} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {labels.fieldMessage}
                                    <span className="text-red-500" aria-hidden>
                                        {" "}
                                        *
                                    </span>
                                </label>
                                <textarea
                                    id={messageFieldId}
                                    className={cx(textareaClass, messageError && "border-red-300 focus-visible:border-red-400 focus-visible:ring-red-400/25")}
                                    value={message}
                                    onChange={(e) => onMessage(e.target.value)}
                                    placeholder={labels.placeholderMessage}
                                    maxLength={5000}
                                    aria-required
                                    aria-invalid={messageError || undefined}
                                    disabled={isSubmitting}
                                />
                                {message.length >= 4500 ? (
                                    <span className="mt-1 block text-right text-xs text-slate-500">
                                        {message.length}/5000
                                    </span>
                                ) : null}
                                {messageError ? (
                                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400" role="alert">
                                        {labels.errorMessageRequired}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <footer className="sticky bottom-0 flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/95 px-6 py-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/90 sm:px-8">
                            <Button color="secondary" size="md" onClick={requestClose} isDisabled={isSubmitting}>
                                {labels.cancel}
                            </Button>
                            <button
                                type="button"
                                className={cx(
                                    RH_PRIMARY_CTA_CLASSES,
                                    (isSubmitting || incomplete) && "opacity-70",
                                    isSubmitting && "pointer-events-none",
                                )}
                                disabled={isSubmitting}
                                aria-disabled={incomplete || isSubmitting}
                                onClick={handleSubmit}
                                aria-busy={isSubmitting || undefined}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" aria-hidden />
                                        {labels.sending}
                                    </>
                                ) : (
                                    labels.send
                                )}
                            </button>
                        </footer>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
