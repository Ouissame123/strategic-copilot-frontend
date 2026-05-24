/**

 * Modal modification talent RH — PATCH /webhook/wf-rh-talents-update-v1/rh/talents/:id.

 * Utilisé hors drawer (rare) ; le drawer embarque TalentEditPanel en mode inline.

 */

import { X } from "lucide-react";

import { TalentEditPanel } from "@/components/rh/talent/TalentEditPanel";

import type { RhTalentDetail, RhTalentListItem } from "@/types/rh-talents.types";

import {

    RH_MODAL_OVERLAY,

    RH_MODAL_PANEL,

    RH_TEXT_MUTED,

    RH_TEXT_PRIMARY,

    WS_MODAL_HEADER,

    WS_TEXT_FAINT,

} from "@/utils/rh-workspace-theme";

import { cx } from "@/utils/cx";



export type RhTalentEditInitial = {

    id: string;

    name: string;

    email?: string | null;

    phone?: string | null;

    job_title?: string | null;

    department?: string | null;

    seniority_level?: string | null;

    status: string;

    hire_date?: string | null;

    bio?: string | null;

};



export function rhTalentListItemToEditInitial(t: RhTalentListItem): RhTalentEditInitial {

    return {

        id: t.id,

        name: t.name,

        email: t.email,

        phone: t.phone,

        job_title: t.job_title,

        department: t.department,

        seniority_level: t.seniority_level,

        status: t.status,

        hire_date: t.hire_date,

        bio: null,

    };

}



export function rhTalentDetailToEditInitial(d: RhTalentDetail): RhTalentEditInitial {

    return {

        id: d.id,

        name: d.name,

        email: d.email,

        phone: d.phone,

        job_title: d.job_title,

        department: d.department,

        seniority_level: d.seniority_level,

        status: d.status,

        hire_date: d.hire_date,

        bio: d.bio,

    };

}



export type EditTalentModalProps = {

    open: boolean;

    talent: RhTalentEditInitial | null;

    onClose: () => void;

    apiBase?: string;

    token?: string;

    onUpdated?: (talent: RhTalentListItem) => void;

};



export function EditTalentModal({ open, talent, onClose, apiBase, token, onUpdated }: EditTalentModalProps) {

    if (!open || !talent) return null;



    return (

        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">

            <button

                type="button"

                className={cx("absolute inset-0", RH_MODAL_OVERLAY)}

                aria-label="Fermer"

                onClick={onClose}

            />

            <div

                role="dialog"

                aria-modal="true"

                aria-labelledby="edit-talent-title"

                className={cx(RH_MODAL_PANEL, "flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden")}

            >

                <div className={cx("flex shrink-0 items-start justify-between px-4 py-3", WS_MODAL_HEADER)}>

                    <div>

                        <h2 id="edit-talent-title" className={cx("text-base font-semibold", RH_TEXT_PRIMARY)}>

                            Modifier le talent

                        </h2>

                        <p className={cx("text-[11px]", RH_TEXT_MUTED)}>{talent.name}</p>

                    </div>

                    <button

                        type="button"

                        onClick={onClose}

                        className={cx("rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800", WS_TEXT_FAINT)}

                        aria-label="Fermer"

                    >

                        <X size={18} />

                    </button>

                </div>

                <TalentEditPanel

                    talent={talent}

                    apiBase={apiBase}

                    token={token}

                    onCancel={onClose}

                    onSaved={(updated) => {

                        onUpdated?.(updated);

                        onClose();

                    }}

                />

            </div>

        </div>

    );

}


