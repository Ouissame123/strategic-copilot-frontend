import { motion } from "motion/react";
import { FileText, MessageCircle, X } from "lucide-react";
import { Heading } from "react-aria-components";
import type { KpiBucket, PriorityFilter } from "./rh-requests-utils";
import { priorityLabel, priorityPillClass, statusLabel, statusPillClass } from "./rh-requests-utils";
import { Button } from "@/components/base/buttons/button";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { cx } from "@/utils/cx";

/** Seule transition PATCH autorisée pour le manager (WF_Manager_RH_Actions). */
export { MANAGER_RH_CANCEL_PATCH_BODY } from "@/api/rh-actions.constants";

type RHRequestDetailModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    typeLabel: string;
    projectLabel: string | null;
    sentAtDisplay: string | null;
    description: string;
    rhResponse: string | null;
    assignedTo: string | null;
    priorityBucket: PriorityFilter;
    statusBucket: KpiBucket;
    labels: {
        dialogAccessibleTitle: string;
        detailEyebrow: string;
        detailProject: string;
        detailSentAt: string;
        detailMessage: string;
        detailRhResponse: string;
        detailAssignedTo: string;
        close: string;
    };
    tr: (k: string) => string;
};

function MetadataInfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex min-h-[5.25rem] flex-col justify-center rounded-2xl border border-secondary/60 bg-secondary_subtle/30 px-5 py-4 shadow-sm dark:bg-secondary_subtle/15">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-tertiary">{label}</p>
            <p className="mt-2 text-sm font-semibold leading-snug text-primary">{value}</p>
        </div>
    );
}

const typeBadgeClass =
    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset bg-violet-50/95 text-violet-900 ring-violet-200/90 dark:bg-violet-950/45 dark:text-violet-100 dark:ring-violet-800/55";

export function RHRequestDetailModal({
    open,
    onOpenChange,
    title,
    typeLabel,
    projectLabel,
    sentAtDisplay,
    description,
    rhResponse,
    assignedTo,
    priorityBucket,
    statusBucket,
    labels,
    tr,
}: RHRequestDetailModalProps) {
    const metaCards: { label: string; value: string }[] = [];
    if (projectLabel) metaCards.push({ label: labels.detailProject, value: projectLabel });
    if (sentAtDisplay) metaCards.push({ label: labels.detailSentAt, value: sentAtDisplay });
    if (assignedTo) metaCards.push({ label: labels.detailAssignedTo, value: assignedTo });

    return (
        <ModalOverlay isOpen={open} onOpenChange={onOpenChange} isDismissable>
            <Modal>
                <Dialog className="w-full max-w-[680px] min-w-0 overflow-hidden rounded-[28px] border border-secondary/80 bg-primary shadow-[0_24px_64px_-16px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.04] dark:border-secondary dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.45)] dark:ring-white/[0.06]">
                    <Heading slot="title" className="sr-only">
                        {labels.dialogAccessibleTitle}
                    </Heading>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                        className="relative flex w-full min-w-0 flex-col p-8"
                    >
                        <button
                            type="button"
                            className="absolute right-6 top-6 z-10 rounded-xl p-2 text-tertiary transition-colors hover:bg-secondary_subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                            aria-label={labels.close}
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="size-5" strokeWidth={1.75} aria-hidden />
                        </button>

                        <header className="pr-12">
                            <div className="flex gap-5">
                                <div
                                    className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-violet-500/14 text-violet-600 shadow-inner ring-1 ring-violet-500/20 dark:bg-violet-500/18 dark:text-violet-300 dark:ring-violet-400/15"
                                    aria-hidden
                                >
                                    <FileText className="size-7" strokeWidth={1.65} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">
                                        {labels.detailEyebrow}
                                    </p>
                                    <h2 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-primary md:text-[1.65rem] md:leading-snug">
                                        {title}
                                    </h2>
                                    <div className="mt-5 flex flex-wrap gap-2">
                                        <span className={typeBadgeClass}>{typeLabel}</span>
                                        <span
                                            className={cx(
                                                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                                                priorityPillClass(priorityBucket),
                                            )}
                                        >
                                            {priorityLabel(priorityBucket, tr)}
                                        </span>
                                        <span
                                            className={cx(
                                                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                                                statusPillClass(statusBucket),
                                            )}
                                        >
                                            {statusLabel(statusBucket, tr)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </header>

                        <div className="mt-10 space-y-10">
                            {metaCards.length > 0 ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {metaCards.map((c) => (
                                        <MetadataInfoCard key={c.label} label={c.label} value={c.value} />
                                    ))}
                                </div>
                            ) : null}

                            <section>
                                <h3 className="text-sm font-semibold text-primary">{labels.detailMessage}</h3>
                                <div className="mt-3 rounded-2xl border border-secondary/70 bg-secondary_subtle/35 p-5 shadow-sm dark:bg-secondary_subtle/20">
                                    <p className="max-h-60 overflow-y-auto whitespace-pre-wrap text-sm font-medium leading-relaxed text-primary">
                                        {description}
                                    </p>
                                </div>
                            </section>

                            {rhResponse ? (
                                <section>
                                    <h3 className="text-sm font-semibold text-primary">{labels.detailRhResponse}</h3>
                                    <div className="mt-3 flex gap-4 rounded-2xl border border-violet-200/90 bg-gradient-to-br from-violet-50/95 to-violet-50/40 p-5 shadow-sm dark:border-violet-800/55 dark:from-violet-950/50 dark:to-violet-950/25">
                                        <MessageCircle
                                            className="mt-0.5 size-5 shrink-0 text-violet-500 dark:text-violet-400"
                                            strokeWidth={1.75}
                                            aria-hidden
                                        />
                                        <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm font-medium leading-relaxed text-primary">
                                            {rhResponse}
                                        </p>
                                    </div>
                                </section>
                            ) : null}
                        </div>

                        <footer className="mt-12 flex justify-center">
                            <Button
                                type="button"
                                color="secondary"
                                size="md"
                                className="h-10 w-[140px] shrink-0 justify-center rounded-xl border border-secondary/80 bg-primary font-semibold shadow-sm ring-1 ring-secondary/40 transition hover:border-secondary hover:bg-secondary_subtle/70 hover:shadow-md"
                                onClick={() => onOpenChange(false)}
                            >
                                {labels.close}
                            </Button>
                        </footer>
                    </motion.div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
