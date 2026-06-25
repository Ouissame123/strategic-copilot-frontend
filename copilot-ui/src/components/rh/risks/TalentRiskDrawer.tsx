import { useNavigate } from "react-router";
import { X } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { useTalentRisks } from "@/hooks/useRhRisks";
import {
    formatAllocationPct,
    formatContractDate,
    SEVERITY_BORDER,
} from "@/lib/rh-risks-display";
import { cx } from "@/utils/cx";

type TalentRiskDrawerProps = {
    talentId: string;
    onClose: () => void;
};

export function TalentRiskDrawer({ talentId, onClose }: TalentRiskDrawerProps) {
    const navigate = useNavigate();
    const detail = useTalentRisks(talentId);

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 bg-overlay/60 backdrop-blur-[2px]"
                aria-label="Fermer"
                onClick={onClose}
            />
            <aside
                className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-[480px] flex-col border-l border-secondary bg-primary shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="talent-risk-drawer-title"
            >
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-secondary px-4 py-3">
                    <h2 id="talent-risk-drawer-title" className="line-clamp-2 text-base font-semibold text-primary">
                        {detail.data?.talent.name ?? "Talent"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-lg p-2 text-tertiary transition hover:bg-secondary_subtle hover:text-primary"
                        aria-label="Fermer"
                    >
                        <X className="size-5" aria-hidden />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    {detail.isPending ? (
                        <p className="p-4 text-sm text-tertiary">Chargement…</p>
                    ) : detail.error || !detail.data?.talent ? (
                        <div className="space-y-3 p-4">
                            <p className="text-sm text-rose-700">Impossible de charger le détail du talent.</p>
                            <Button color="secondary" size="sm" onPress={() => void detail.refetch()}>
                                Réessayer
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4 p-4">
                            <div className="space-y-1 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
                                <p>
                                    <strong>Séniorité :</strong> {detail.data.talent.seniority_level || "—"}
                                </p>
                                <p>
                                    <strong>Allocation actuelle :</strong>{" "}
                                    {formatAllocationPct(detail.data.talent.current_allocation_pct)}
                                </p>
                                <p>
                                    <strong>Contrat fin :</strong> {formatContractDate(detail.data.talent.contract_end_date)}
                                </p>
                                <p>
                                    <strong>Manager :</strong>{" "}
                                    {detail.data.talent.manager_user_id ? "✓ Assigné" : "⚠ Aucun"}
                                </p>
                            </div>

                            <section>
                                <h4 className="mb-2 text-xs uppercase tracking-widest text-slate-500">
                                    Risques détectés ({detail.data.risks.length})
                                </h4>
                                <ul className="space-y-2">
                                    {detail.data.risks.map((r) => (
                                        <li
                                            key={r.id}
                                            className={cx(
                                                "rounded-md border border-slate-200 p-3 border-l-4 dark:border-slate-700",
                                                SEVERITY_BORDER[r.severity],
                                            )}
                                        >
                                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                                <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                                    {r.risk_type_label}
                                                </span>
                                                <span
                                                    className={cx(
                                                        "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                                        r.severity === "critical"
                                                            ? "border-red-200 bg-red-50 text-red-800"
                                                            : "border-amber-200 bg-amber-50 text-amber-900",
                                                    )}
                                                >
                                                    {r.severity_label}
                                                </span>
                                            </div>
                                            <p className="text-sm text-primary">{r.title}</p>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            <Button
                                color="primary"
                                className="w-full"
                                onPress={() => {
                                    navigate(`/workspace/rh/employees?talentId=${encodeURIComponent(talentId)}`);
                                    onClose();
                                }}
                            >
                                Voir la fiche complète
                            </Button>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
