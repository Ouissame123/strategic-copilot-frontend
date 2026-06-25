import { useState, type ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import type { BoardPackGenerateParams } from "@/api/manager-reports.api";
import { Button } from "@/components/base/buttons/button";
import { useGenerateBoardPack } from "@/hooks/use-manager-reports";
import { cx } from "@/utils/cx";

function FormRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-500">{label}</span>
            {children}
        </label>
    );
}

const selectClass =
    "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export function BoardPackCard() {
    const [params, setParams] = useState<BoardPackGenerateParams>({
        period: "last_30_days",
        language: "fr",
        includeCharts: true,
        includeAIRecommendations: true,
    });
    const generate = useGenerateBoardPack();

    return (
        <article className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
            <header className="mb-3 flex items-center gap-2">
                <BarChart3 className="size-5 text-violet-600" aria-hidden />
                <h3 className="font-medium text-slate-900 dark:text-slate-100">Board Pack exécutif</h3>
                <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
                    PDF
                </span>
            </header>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                Synthèse pour le comité : KPI, top projets à risque, décisions récentes.
            </p>

            <div className="space-y-3">
                <FormRow label="Période">
                    <select
                        value={params.period}
                        onChange={(e) =>
                            setParams((p) => ({ ...p, period: e.target.value as BoardPackGenerateParams["period"] }))
                        }
                        className={selectClass}
                    >
                        <option value="last_7_days">7 derniers jours</option>
                        <option value="last_30_days">30 derniers jours</option>
                        <option value="last_90_days">90 derniers jours</option>
                        <option value="ytd">Depuis le 1ᵉʳ janvier</option>
                    </select>
                </FormRow>

                <FormRow label="Langue">
                    <select
                        value={params.language}
                        onChange={(e) =>
                            setParams((p) => ({ ...p, language: e.target.value as BoardPackGenerateParams["language"] }))
                        }
                        className={selectClass}
                    >
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                    </select>
                </FormRow>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={params.includeCharts}
                            onChange={(e) => setParams((p) => ({ ...p, includeCharts: e.target.checked }))}
                            className="rounded border-slate-300"
                        />
                        Graphiques
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={params.includeAIRecommendations}
                            onChange={(e) => setParams((p) => ({ ...p, includeAIRecommendations: e.target.checked }))}
                            className="rounded border-slate-300"
                        />
                        Recommandations IA
                    </label>
                </div>
            </div>

            <Button
                type="button"
                color="primary"
                className={cx("mt-4 w-full justify-center")}
                isLoading={generate.isPending}
                isDisabled={generate.isPending}
                onClick={() => generate.mutate(params)}
            >
                Générer le PDF
            </Button>
        </article>
    );
}
