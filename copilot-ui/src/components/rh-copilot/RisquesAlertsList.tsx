import { AlertTriangle } from "@untitledui/icons";

export function RisquesAlertsList({ risques }: { risques: string[] }) {
    if (!risques?.length) return null;

    return (
        <div className="mt-3 rounded-md border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-800 dark:bg-orange-950/20">
            <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="size-4 text-orange-600 dark:text-orange-400" aria-hidden />
                <h4 className="text-xs font-semibold uppercase tracking-wide text-orange-800 dark:text-orange-200">
                    Risques détectés ({risques.length})
                </h4>
            </div>
            <ul className="space-y-1 text-sm text-orange-900 dark:text-orange-100">
                {risques.map((r, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                        <span className="mt-1 text-orange-500">•</span>
                        <span>{r}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
