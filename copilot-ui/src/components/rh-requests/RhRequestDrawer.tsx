import { useMemo } from "react";
import { Link } from "react-router";
import { X } from "lucide-react";
import { MANAGER_RH_CANCEL_PATCH_BODY } from "@/api/rh-actions.constants";
import {
    isRhRequestDecider,
    primaryMessage,
    rhDetailModalGate,
    responseMessageFromRow,
    priorityLabel,
    statusLabel,
    stripLeadingSubjectPrefix,
    type RhRequestViewerRole,
} from "@/components/manager/rh-requests/rh-requests-utils";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { formatRhRequestMessage } from "./formatRhRequestMessage";
import {
    extractCandidates,
    extractPayloadJson,
    priorityBadgeClass,
    statusBadgeClass,
    type RhRequestViewModel,
    typeBadgeClass,
} from "./rhRequestFormatters";

type RhRequestDrawerProps = {
    item: RhRequestViewModel | null;
    open: boolean;
    onClose: () => void;
    tr: (k: string) => string;
    onAccept: () => void;
    onReject: () => void;
    onExecute: () => void;
    onCancel?: () => void;
    /** Manager : détail + annulation si en attente. RH : accepter / refuser / terminer. */
    viewerRole?: RhRequestViewerRole;
    isPatching?: boolean;
    labels: {
        project: string;
        sentAt: string;
        message: string;
        rhResponse: string;
        payload: string;
        candidates: string;
        impact: string;
        accept: string;
        reject: string;
        execute: string;
        cancel: string;
        close: string;
        openProject: string;
    };
};

function candidateLabel(c: unknown): string {
    if (!c || typeof c !== "object") return String(c ?? "—");
    const o = c as Record<string, unknown>;
    return String(o.talent_name ?? o.name ?? o.full_name ?? o.label ?? "Candidat");
}

export function RhRequestDrawer({
    item,
    open,
    onClose,
    tr,
    onAccept,
    onReject,
    onExecute,
    onCancel,
    viewerRole = "manager",
    isPatching,
    labels,
}: RhRequestDrawerProps) {
    const isRhDecider = isRhRequestDecider(viewerRole);
    const gate = useMemo(() => (item ? rhDetailModalGate(item.raw) : "none"), [item]);
    const payload = useMemo(() => (item ? extractPayloadJson(item.raw) : null), [item]);
    const candidates = useMemo(() => (item ? extractCandidates(item.raw) : []), [item]);
    const rhResponse = item ? responseMessageFromRow(item.raw) : "";

    const messageText = useMemo(() => {
        if (!item) return "";
        const raw = primaryMessage(item.raw);
        return stripLeadingSubjectPrefix(raw || item.description);
    }, [item]);

    const impactText = useMemo(() => {
        if (!payload || typeof payload !== "object") return null;
        const o = payload as Record<string, unknown>;
        const impact = o.impact ?? o.tradeoffs ?? o.trade_offs;
        if (typeof impact === "string") return impact;
        if (impact && typeof impact === "object") return JSON.stringify(impact, null, 2);
        return null;
    }, [payload]);

    const projectId = item ? String(item.raw.project_id ?? "").trim() : "";
    const projectName = item ? String(item.raw.project_name ?? "").trim() : "";

    if (!open || !item) return null;

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px]"
                aria-label={labels.close}
                onClick={onClose}
            />
            <aside
                className="fixed top-0 right-0 z-50 flex h-screen w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                role="dialog"
                aria-modal="true"
                aria-label={item.objectLabel}
            >
                <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">{item.objectLabel}</h2>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset", typeBadgeClass(item.typeKey))}>
                                {item.typeLabel}
                            </span>
                            <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset", priorityBadgeClass(item.priorityBucket))}>
                                {priorityLabel(item.priorityBucket, tr)}
                            </span>
                            <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset", statusBadgeClass(item.statusBucket))}>
                                {statusLabel(item.statusBucket, tr)}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500">{item.sourceDisplay}</span>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={labels.close}>
                        <X className="size-5" />
                    </button>
                </header>

                <div className="flex-1 overflow-x-hidden overflow-y-auto px-5 py-4 space-y-5">
                    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                        <p className="text-xs font-semibold uppercase text-slate-500">{labels.project}</p>
                        {projectName && projectId ? (
                            <Link
                                to={`/workspace/rh/projects/${encodeURIComponent(projectId)}`}
                                className="mt-2 inline-block text-xs font-semibold text-brand-secondary hover:underline"
                            >
                                {item.projectLabel}
                            </Link>
                        ) : item.projectLabel && item.projectLabel !== "Aucun projet" ? (
                            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{item.projectLabel}</p>
                        ) : (
                            <p className="mt-1 text-sm text-slate-400">Projet non renseigné</p>
                        )}
                        <p className="mt-2 text-xs text-slate-500">
                            {labels.sentAt} : {item.createdLabel}
                        </p>
                    </section>

                    <section className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{labels.message}</h3>
                        <div className="mt-2 break-words whitespace-normal rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                            {formatRhRequestMessage(messageText)}
                        </div>
                    </section>

                    {rhResponse ? (
                        <section>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{labels.rhResponse}</h3>
                            <p className="mt-2 break-words whitespace-normal rounded-xl border border-violet-200 bg-violet-50/50 p-3 text-sm dark:border-violet-900 dark:bg-violet-950/30">
                                {rhResponse}
                            </p>
                        </section>
                    ) : null}

                    {payload ? (
                        <section>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{labels.payload}</h3>
                            <pre className="mt-2 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-3 text-[11px] text-slate-100 dark:border-slate-700">
                                {typeof payload === "string" ? payload : JSON.stringify(payload, null, 2)}
                            </pre>
                        </section>
                    ) : null}

                    {candidates.length > 0 ? (
                        <section>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{labels.candidates}</h3>
                            <ul className="mt-2 space-y-2">
                                {candidates.map((c, i) => (
                                    <li key={i} className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                                        {candidateLabel(c)}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ) : null}

                    {impactText ? (
                        <section>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{labels.impact}</h3>
                            <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-950">
                                {impactText}
                            </pre>
                        </section>
                    ) : null}
                </div>

                <footer className="flex flex-wrap gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
                    {isRhDecider && (gate === "pending" || gate === "accepted") ? (
                        <>
                            <Button type="button" color="primary" size="sm" onClick={onAccept} isLoading={isPatching}>
                                {labels.accept}
                            </Button>
                            <Button type="button" color="secondary-destructive" size="sm" onClick={onReject} isLoading={isPatching}>
                                {labels.reject}
                            </Button>
                        </>
                    ) : null}
                    {isRhDecider && (gate === "accepted" || gate === "in_progress") ? (
                        <Button type="button" color="secondary" size="sm" onClick={onExecute} isLoading={isPatching}>
                            {labels.execute}
                        </Button>
                    ) : null}
                    {!isRhDecider && gate === "pending" && onCancel ? (
                        <Button type="button" color="secondary-destructive" size="sm" onClick={onCancel} isLoading={isPatching}>
                            {labels.cancel}
                        </Button>
                    ) : null}
                    <Button type="button" color="secondary" size="sm" className="ml-auto" onClick={onClose}>
                        {labels.close}
                    </Button>
                </footer>
            </aside>
        </>
    );
}

export { MANAGER_RH_CANCEL_PATCH_BODY };
