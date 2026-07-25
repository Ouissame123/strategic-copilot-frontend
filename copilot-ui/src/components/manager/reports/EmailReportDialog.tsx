import { useEffect, useState } from "react";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import type { ReportHistoryItem } from "@/components/reports/types";
import { Button } from "@/components/base/buttons/button";
import { parseEmailRecipients } from "@/components/manager/reports/reports-page-utils";
import { useSendReportEmail } from "@/hooks/use-manager-reports";

type EmailReportDialogProps = {
    report: ReportHistoryItem | null;
    onClose: () => void;
};

export function EmailReportDialog({ report, onClose }: EmailReportDialogProps) {
    const [recipientsRaw, setRecipientsRaw] = useState("");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const sendEmail = useSendReportEmail();

    useEffect(() => {
        if (!report) return;
        setRecipientsRaw("");
        setSubject(`Rapport Copilote Stratégique — ${report.type}`);
        setMessage("");
    }, [report]);

    const handleSend = () => {
        if (!report) return;
        const recipients = parseEmailRecipients(recipientsRaw);
        if (recipients.length === 0) return;
        sendEmail.mutate(
            {
                report_id: report.reportId,
                recipients,
                subject: subject.trim() || `Rapport Copilote Stratégique — ${report.type}`,
                message: message.trim(),
            },
            { onSuccess: () => onClose() },
        );
    };

    return (
        <ModalOverlay isOpen={Boolean(report)} onOpenChange={(open) => !open && onClose()} isDismissable={!sendEmail.isPending}>
            <Modal>
                <Dialog className="w-full max-w-lg p-4 sm:p-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-950">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Envoyer le rapport par email</h2>

                        <div className="mt-4 space-y-3">
                            <label className="grid gap-1 text-sm">
                                <span className="text-xs font-medium text-slate-500">Destinataires *</span>
                                <input
                                    type="text"
                                    value={recipientsRaw}
                                    onChange={(e) => setRecipientsRaw(e.target.value)}
                                    placeholder="email1@exemple.com, email2@exemple.com"
                                    className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                                />
                            </label>
                            <label className="grid gap-1 text-sm">
                                <span className="text-xs font-medium text-slate-500">Sujet</span>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                                />
                            </label>
                            <label className="grid gap-1 text-sm">
                                <span className="text-xs font-medium text-slate-500">Message</span>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={4}
                                    className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                                />
                            </label>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <Button type="button" color="secondary" onClick={onClose} isDisabled={sendEmail.isPending}>
                                Annuler
                            </Button>
                            <Button
                                type="button"
                                color="primary"
                                isLoading={sendEmail.isPending}
                                isDisabled={sendEmail.isPending || parseEmailRecipients(recipientsRaw).length === 0}
                                onClick={handleSend}
                            >
                                Envoyer
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
