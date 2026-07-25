import { Download, FileText, Loader2, Printer, Sparkles } from "lucide-react";
import { cx } from "@/utils/cx";
import { REPORT_CARD } from "./reports-shared";

type QuickActionsBarProps = {
    onBoardPack: () => void;
    onProjectPdf: () => void;
    onExportCsv: () => void;
    onPrint: () => void;
    onDownloadLastPdf?: () => void;
    boardPackBusy?: boolean;
    dossierBusy?: boolean;
    boardPackDisabled?: boolean;
    projectPdfDisabled?: boolean;
    exportDisabled?: boolean;
    hasLastPdf?: boolean;
};

const btnPrimary =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:scale-[1.01] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100";

const btnSecondary =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:border-primary-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function QuickActionsBar({
    onBoardPack,
    onProjectPdf,
    onExportCsv,
    onPrint,
    onDownloadLastPdf,
    boardPackBusy,
    dossierBusy,
    boardPackDisabled,
    projectPdfDisabled,
    exportDisabled,
    hasLastPdf,
}: QuickActionsBarProps) {
    return (
        <section className={REPORT_CARD + " p-5 sm:p-6"}>
            <div className="mb-4">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Actions rapides</h2>
                <p className="mt-1 text-sm text-slate-500">Générez ou exportez vos livrables en un clic.</p>
            </div>
            <div className="flex flex-wrap gap-3">
                <button type="button" disabled={boardPackDisabled || boardPackBusy} onClick={onBoardPack} className={btnPrimary}>
                    {boardPackBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    {boardPackBusy ? "Génération…" : "Générer pack comité"}
                </button>
                <button type="button" disabled={projectPdfDisabled || dossierBusy} onClick={onProjectPdf} className={btnSecondary}>
                    {dossierBusy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                    {dossierBusy ? "Génération…" : "Générer PDF projet"}
                </button>
                <button type="button" disabled={exportDisabled} onClick={onExportCsv} className={btnSecondary}>
                    <Download className="size-4" />
                    Export CSV
                </button>
                {hasLastPdf && onDownloadLastPdf ? (
                    <button type="button" onClick={onDownloadLastPdf} className={btnSecondary}>
                        <FileText className="size-4 text-emerald-600" />
                        Télécharger PDF
                    </button>
                ) : null}
                <button type="button" onClick={onPrint} className={cx(btnSecondary, "border-dashed")}>
                    <Printer className="size-4" />
                    Imprimer / PDF
                </button>
            </div>
        </section>
    );
}
