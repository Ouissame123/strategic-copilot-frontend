/**
 * Drawer talent RH — modes VIEW | EDIT profil | EDIT contrat (sans modal imbriqué).
 */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Pencil, RefreshCw, X } from "lucide-react";
import {
    rhTalentDetailToEditInitial,
    rhTalentListItemToEditInitial,
    type RhTalentEditInitial,
} from "@/components/rh/EditTalentModal";
import {
    TalentEmploymentDrawerHeader,
    TalentEmploymentEditPanel,
} from "@/components/rh/talent/TalentEmploymentEditPanel";
import { TalentEmploymentTab } from "@/components/rh/talent/TalentEmploymentTab";
import { TalentEditDrawerHeader, TalentEditPanel } from "@/components/rh/talent/TalentEditPanel";
import { TalentOverviewTab } from "@/components/rh/talent/TalentOverviewTab";
import { TalentAbsencesSection } from "@/components/rh/talent/TalentAbsencesSection";
import { TalentSkillsSection } from "@/components/rh/talent/TalentSkillsSection";
import { useToast } from "@/providers/toast-provider";
import type { RhTalentAvailabilitySummary } from "@/types/rh-availability.types";
import { fetchRhTalentDetail, toRhTalentsUserMessage } from "@/api/rh-talents.api";
import type { RhTalentDetail } from "@/types/rh-talents.types";
import type { RhTalentListItem } from "@/types/rh-talents.types";
import {
    RH_ALERT_ERROR,
    RH_AVATAR,
    RH_MODAL_OVERLAY,
    RH_STATUS_ACTIVE,
    RH_STATUS_INACTIVE,
    RH_STATUS_ON_LEAVE,
    RH_SURFACE_CARD,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
    RH_TEXT_SECONDARY,
    WS_TEXT_FAINT,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type RhTalentDrawerTab = "overview" | "skills" | "employment" | "absences";

const LEGACY_TABS = new Set(["availability", "assignments", "ai"]);

export type RhTalentDrawerMode = "view" | "edit-profile" | "edit-employment";

const TABS: { id: RhTalentDrawerTab; label: string }[] = [
    { id: "overview", label: "Vue d'ensemble" },
    { id: "skills", label: "Compétences" },
    { id: "employment", label: "Emploi & Contrat" },
    { id: "absences", label: "Absences" },
];

const STATUS_META: Record<string, { label: string; cls: string }> = {
    active: { label: "Actif", cls: RH_STATUS_ACTIVE },
    inactive: { label: "Inactif", cls: RH_STATUS_INACTIVE },
    onleave: { label: "En congé", cls: RH_STATUS_ON_LEAVE },
};

function initials(name: string): string {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join("");
}

export type TalentDrawerProps = {
    open: boolean;
    talentId: string | null;
    listPreview?: RhTalentListItem | null;
    availabilityPreview?: RhTalentAvailabilitySummary | null;
    activeTab: RhTalentDrawerTab;
    onTabChange: (tab: RhTalentDrawerTab) => void;
    enterpriseId: string;
    apiBase: string;
    token?: string;
    onClose: () => void;
    onTalentUpdated?: (talent: RhTalentListItem) => void;
    onOpenProject?: (projectId: string) => void;
    skillsPostCreateCta?: boolean;
    initialEditMode?: boolean;
    onInitialEditModeConsumed?: () => void;
};

export function TalentDrawer({
    open,
    talentId,
    listPreview,
    availabilityPreview,
    activeTab,
    onTabChange,
    enterpriseId,
    apiBase,
    token,
    onClose,
    onTalentUpdated,
    onOpenProject,
    skillsPostCreateCta,
    initialEditMode = false,
    onInitialEditModeConsumed,
}: TalentDrawerProps) {
    const { push: pushToast } = useToast();
    const [detail, setDetail] = useState<RhTalentDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [mode, setMode] = useState<RhTalentDrawerMode>("view");
    const [employmentFormMode, setEmploymentFormMode] = useState<"create" | "edit">("edit");

    const reloadDetail = async (id: string) => {
        const t = await fetchRhTalentDetail(id, { apiBase, token, enterprise_id: enterpriseId });
        setDetail(t);
        return t;
    };

    useEffect(() => {
        if (!open || !talentId) {
            setDetail(null);
            setErr(null);
            setMode("view");
            return;
        }
        let on = true;
        setLoading(true);
        setErr(null);
        fetchRhTalentDetail(talentId, { apiBase, token, enterprise_id: enterpriseId })
            .then((t) => {
                if (on) setDetail(t);
            })
            .catch((e: unknown) => {
                if (on) setErr(toRhTalentsUserMessage(e));
            })
            .finally(() => {
                if (on) setLoading(false);
            });
        return () => {
            on = false;
        };
    }, [open, talentId, enterpriseId, apiBase, token]);

    useEffect(() => {
        if (!open) setMode("view");
    }, [open]);

    useEffect(() => {
        setMode("view");
    }, [talentId]);

    useEffect(() => {
        if (!open || !initialEditMode) return;
        if (detail || listPreview) {
            setMode("edit-profile");
            onInitialEditModeConsumed?.();
        }
    }, [open, initialEditMode, detail, listPreview, onInitialEditModeConsumed]);

    const editTalent: RhTalentEditInitial | null = useMemo(() => {
        if (detail) return rhTalentDetailToEditInitial(detail);
        if (listPreview) return rhTalentListItemToEditInitial(listPreview);
        return null;
    }, [detail, listPreview]);

    useEffect(() => {
        if (LEGACY_TABS.has(activeTab as string)) {
            onTabChange("overview");
        }
    }, [activeTab, onTabChange]);

    if (!open || !talentId) return null;

    const displayName = detail?.name ?? listPreview?.name ?? "Talent";
    const sm = detail
        ? STATUS_META[detail.status] ?? { label: detail.status, cls: RH_STATUS_INACTIVE }
        : listPreview
          ? STATUS_META[listPreview.status] ?? { label: listPreview.status, cls: RH_STATUS_INACTIVE }
          : null;

    const exitEditMode = () => setMode("view");

    const enterProfileEdit = () => {
        if (editTalent) setMode("edit-profile");
    };

    const enterEmploymentEdit = (formMode: "create" | "edit") => {
        setEmploymentFormMode(formMode);
        onTabChange("employment");
        setMode("edit-employment");
    };

    const handleProfileSaved = async (updated: RhTalentListItem) => {
        onTalentUpdated?.(updated);
        setMode("view");
        if (talentId) {
            try {
                await reloadDetail(talentId);
            } catch {
                /* ignore */
            }
        }
    };

    const handleEmploymentSaved = async () => {
        pushToast(
            employmentFormMode === "create" ? "Contrat enregistré" : "Contrat mis à jour",
            "success",
        );
        setMode("view");
        if (talentId) {
            try {
                await reloadDetail(talentId);
            } catch {
                /* ignore */
            }
        }
    };

    const isView = mode === "view";
    const isProfileEdit = mode === "edit-profile" && editTalent != null;
    const isEmploymentEdit = mode === "edit-employment" && detail != null;
    const isEditPanel = isProfileEdit || isEmploymentEdit;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <button type="button" className={cx("absolute inset-0", RH_MODAL_OVERLAY)} aria-label="Fermer" onClick={onClose} />
            <div
                className={cx(
                    "relative flex h-full w-full max-w-[640px] flex-col overflow-hidden shadow-xl",
                    RH_SURFACE_CARD,
                )}
                role="dialog"
                aria-modal="true"
            >
                <div className="shrink-0 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    <div className="px-3 pb-0 pt-3">
                        <div className="flex items-start gap-2.5 pr-8">
                            {isEditPanel ? (
                                <div className="min-w-0 flex-1">
                                    <button
                                        type="button"
                                        onClick={exitEditMode}
                                        className={cx(
                                            "mb-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800",
                                            RH_TEXT_SECONDARY,
                                        )}
                                    >
                                        <ArrowLeft size={14} aria-hidden />
                                        Retour à la fiche
                                    </button>
                                    {isProfileEdit && editTalent ? (
                                        <TalentEditDrawerHeader talentName={editTalent.name} />
                                    ) : null}
                                    {isEmploymentEdit ? (
                                        <TalentEmploymentDrawerHeader talentName={displayName} mode={employmentFormMode} />
                                    ) : null}
                                </div>
                            ) : (
                                <>
                                    <div
                                        className={cx(
                                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                                            RH_AVATAR,
                                        )}
                                    >
                                        {initials(displayName)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <h2 className={cx("truncate text-base font-bold tracking-tight", RH_TEXT_PRIMARY)}>
                                                {displayName}
                                            </h2>
                                            {sm ? (
                                                <span
                                                    className={cx(
                                                        "shrink-0 rounded-full px-2 py-px text-[9px] font-semibold uppercase tracking-wide",
                                                        sm.cls,
                                                    )}
                                                >
                                                    {sm.label}
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className={cx("truncate text-xs", RH_TEXT_MUTED)}>
                                            {detail?.job_title ?? listPreview?.job_title ?? "—"}
                                            {(detail?.department ?? listPreview?.department)
                                                ? ` · ${detail?.department ?? listPreview?.department}`
                                                : ""}
                                        </p>
                                        {editTalent ? (
                                            <button
                                                type="button"
                                                onClick={enterProfileEdit}
                                                className={cx(
                                                    "mt-1.5 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800",
                                                    RH_TEXT_SECONDARY,
                                                )}
                                            >
                                                <Pencil size={13} aria-hidden />
                                                Modifier le profil
                                            </button>
                                        ) : null}
                                    </div>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className={cx(
                                    "absolute right-3 top-3 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800",
                                    WS_TEXT_FAINT,
                                )}
                                aria-label="Fermer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {isView ? (
                            <nav className="mt-3 flex gap-0.5 overflow-x-auto pb-0" aria-label="Sections talent">
                                {TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => onTabChange(tab.id)}
                                        className={cx(
                                            "shrink-0 rounded-t-md px-2.5 py-1.5 text-[11px] font-semibold transition",
                                            activeTab === tab.id
                                                ? "border border-b-0 border-slate-200 bg-white text-ws-accent dark:border-slate-700 dark:bg-slate-900"
                                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        ) : null}
                    </div>
                </div>

                {isProfileEdit && editTalent ? (
                    <div className="flex min-h-0 flex-1 flex-col bg-slate-50/80 dark:bg-slate-950/40">
                        <TalentEditPanel
                            key={editTalent.id}
                            talent={editTalent}
                            apiBase={apiBase}
                            token={token}
                            embedInDrawer
                            onCancel={exitEditMode}
                            onSaved={(t) => void handleProfileSaved(t)}
                        />
                    </div>
                ) : null}

                {isEmploymentEdit && detail ? (
                    <div className="flex min-h-0 flex-1 flex-col bg-slate-50/80 dark:bg-slate-950/40">
                        <TalentEmploymentEditPanel
                            key={`${detail.id}-${employmentFormMode}`}
                            talentId={talentId}
                            apiBase={apiBase}
                            token={token}
                            mode={employmentFormMode}
                            onCancel={exitEditMode}
                            onSaved={() => void handleEmploymentSaved()}
                        />
                    </div>
                ) : null}

                {isView ? (
                    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/50 p-3 dark:bg-slate-950/30">
                        {loading && (
                            <div className={cx("flex h-32 items-center justify-center", WS_TEXT_FAINT)}>
                                <RefreshCw className="mr-2 animate-spin" size={16} /> Chargement…
                            </div>
                        )}
                        {err && (
                            <div className={cx("flex items-center gap-2 p-3", RH_ALERT_ERROR)}>
                                <AlertTriangle size={15} /> {err}
                            </div>
                        )}

                        {!loading && !err && activeTab === "skills" ? (
                            <TalentSkillsSection
                                talentId={talentId}
                                apiBase={apiBase}
                                token={token}
                                showPostCreateCta={skillsPostCreateCta}
                            />
                        ) : null}

                        {!loading && !err && detail && activeTab === "overview" ? (
                            <TalentOverviewTab
                                talentId={talentId}
                                detail={detail}
                                listPreview={listPreview}
                                availabilityPreview={availabilityPreview}
                                apiBase={apiBase}
                                token={token}
                                onEdit={enterProfileEdit}
                                onOpenProject={onOpenProject}
                                onGoToTab={onTabChange}
                            />
                        ) : null}

                        {!loading && !err && detail && activeTab === "employment" ? (
                            <TalentEmploymentTab
                                talentId={talentId}
                                token={token}
                                apiBase={apiBase}
                                onRequestEmploymentEdit={enterEmploymentEdit}
                            />
                        ) : null}

                        {!loading && !err && talentId && activeTab === "absences" ? (
                            <div className="pb-4">
                                <TalentAbsencesSection talentId={talentId} token={token} />
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
