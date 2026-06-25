import { Button } from "@/components/base/buttons/button";
import type { ValidationDedupEntry } from "@/lib/manager-validations-list-utils";
import { validationTypeLabel } from "./validation-ui";
import { validationCardClass } from "./validation-ui";

type ValidationActionDialogProps = {
    open: boolean;
    onClose: () => void;
    entry: ValidationDedupEntry;
    detailHref: string;
};

export function ValidationActionDialog({ open, onClose, entry, detailHref }: ValidationActionDialogProps) {
    if (!open) return null;

    const { item, count } = entry;
    const typeLabel = validationTypeLabel[item.type] ?? item.type_label;

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px]"
                aria-label="Fermer"
                onClick={onClose}
            />
            <div
                className={validationCardClass + " fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 p-6 shadow-xl"}
                role="dialog"
                aria-modal="true"
                aria-labelledby="validation-action-title"
            >
                <h2 id="validation-action-title" className="text-base font-semibold text-primary">
                    Traiter la validation
                </h2>
                <p className="mt-1 text-xs text-tertiary">
                    {typeLabel}
                    {count > 1 ? ` · ${count} occurrences regroupées` : ""}
                </p>

                <div className="mt-4 space-y-2 text-sm">
                    <p className="font-medium text-primary">{item.project_name || item.type_label}</p>
                    {item.talent_name ? <p className="text-secondary">Talent : {item.talent_name}</p> : null}
                    {item.why ? <p className="text-secondary">{item.why}</p> : null}
                    <p className="text-xs text-tertiary">
                        Priorité {item.priority_score}/100 · {item.blocking ? "Bloquant" : "Standard"}
                    </p>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <Button type="button" color="secondary" size="sm" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button type="button" color="primary" size="sm" href={detailHref} onClick={onClose}>
                        Ouvrir pour traiter
                    </Button>
                </div>
            </div>
        </>
    );
}
