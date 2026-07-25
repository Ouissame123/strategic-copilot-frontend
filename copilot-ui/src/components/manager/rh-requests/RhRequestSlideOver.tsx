import { Button } from "@/components/base/buttons/button";
import { PriorityDot } from "@/components/manager/inbox-triage/PriorityDot";
import { SlideOverShell } from "@/components/manager/inbox-triage/SlideOverShell";
import { formatAbsoluteDateFr } from "@/components/manager/inbox-triage/triage-ui";
import {
    formatTalentLoad,
    parseRequestMessage,
} from "@/components/manager/rh-requests/formatRequestMessage";
import { RhStatusBadge, RhTypeBadge } from "@/components/manager/rh-requests/rh-request-badges";
import { formatRelativeShort } from "@/lib/format-relative-short";
import { isRhActionPendingStatus, labelRhActionType } from "@/lib/manager-rh-actions-labels";
import type { RhActionItem } from "@/types/manager-rh-actions.types";

type RhRequestSlideOverProps = {
    open: boolean;
    item: RhActionItem | null;
    onClose: () => void;
    onCancel: (id: string) => void;
    isCancelling: boolean;
};

export function RhRequestSlideOver({ open, item, onClose, onCancel, isCancelling }: RhRequestSlideOverProps) {
    if (!item) return null;

    const parsed = parseRequestMessage(item.message);
    const canCancel = isRhActionPendingStatus(item.status);
    const createdAbs = formatAbsoluteDateFr(item.created_at);

    return (
        <SlideOverShell
            open={open}
            onClose={onClose}
            title={labelRhActionType(item.type)}
            titleId="rh-request-drawer-title"
            headerAside={
                <div className="mb-1 flex flex-wrap gap-1.5">
                    <RhTypeBadge type={item.type} />
                    <RhStatusBadge status={item.status} />
                </div>
            }
            footer={
                canCancel ? (
                    <Button
                        type="button"
                        color="secondary"
                        isLoading={isCancelling}
                        onClick={() => onCancel(item.id)}
                    >
                        Annuler la demande
                    </Button>
                ) : (
                    <p className="text-xs text-tertiary">Lecture seule — aucune action manager disponible.</p>
                )
            }
        >
            <div className="space-y-6">
                <section className="space-y-3 text-sm">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">Métadonnées</h3>
                    <dl className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                            <dt className="text-tertiary">Priorité</dt>
                            <dd>
                                <PriorityDot priority={item.priority} />
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <dt className="text-tertiary">Créée</dt>
                            <dd className="text-secondary" title={createdAbs || undefined}>
                                {formatRelativeShort(item.created_at)}
                                {createdAbs ? <span className="mt-0.5 block text-[11px] text-tertiary">{createdAbs}</span> : null}
                            </dd>
                        </div>
                        {item.project_id ? (
                            <div className="flex items-start justify-between gap-3">
                                <dt className="shrink-0 text-tertiary">Projet</dt>
                                <dd className="truncate text-right font-mono text-xs text-secondary">{item.project_id}</dd>
                            </div>
                        ) : null}
                    </dl>
                </section>

                <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">Message</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-secondary">
                        {parsed.summary || "—"}
                    </p>
                </section>

                {parsed.talents.length > 0 ? (
                    <section>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                            Réaffectation · talents
                        </h3>
                        <ul className="mt-3 space-y-2">
                            {parsed.talents.map((talent, index) => (
                                <li
                                    key={talent.talent_id ?? `${talent.talent_name}-${index}`}
                                    className="rounded-xl border border-secondary bg-secondary_subtle/40 p-3 text-sm"
                                >
                                    <p className="font-semibold text-primary">{talent.talent_name}</p>
                                    <div className="mt-2 grid gap-1 text-xs text-secondary sm:grid-cols-2">
                                        <span>
                                            Compétences :{" "}
                                            {talent.matching_skills_count != null &&
                                            String(talent.matching_skills_count).trim() !== ""
                                                ? String(talent.matching_skills_count)
                                                : "—"}
                                        </span>
                                        <span>Charge actuelle : {formatTalentLoad(talent.current_load_pct)}</span>
                                        <span className="sm:col-span-2">
                                            Allocation proposée : {formatTalentLoad(talent.proposed_allocation_pct)}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null}

                {item.response_message ? (
                    <section>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">Réponse</h3>
                        <div className="mt-2 rounded-xl border border-secondary bg-secondary_subtle/50 p-3 text-sm text-secondary">
                            {item.response_message}
                        </div>
                    </section>
                ) : null}
            </div>
        </SlideOverShell>
    );
}
