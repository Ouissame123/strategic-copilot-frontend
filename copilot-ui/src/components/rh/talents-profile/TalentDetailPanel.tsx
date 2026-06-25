import { useEffect } from "react";
import { Power, Trash2, X } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { PortalAccessBadge } from "@/components/rh/talents-profile/PortalAccessBadge";
import { formatRelativeTimeFr } from "@/lib/rh-request-display";
import type { TalentProfile } from "@/types/rh-talents-profile.types";
import { cx } from "@/utils/cx";

type TalentDetailPanelProps = {
    talent: TalentProfile | null;
    onClose: () => void;
    onToggle: (t: TalentProfile) => void;
    onDelete: (t: TalentProfile) => void;
};

export function TalentDetailPanel({ talent, onClose, onToggle, onDelete }: TalentDetailPanelProps) {
    useEffect(() => {
        if (!talent) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [talent, onClose]);

    if (!talent) return null;

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 animate-inbox-fade-in bg-black/30"
                aria-label="Fermer"
                onClick={onClose}
            />
            <aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="talent-profile-panel-title"
                className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-[480px] flex-col border-l border-ws-border bg-ws-card shadow-lg animate-inbox-slide-in"
            >
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-ws-border-subtle px-5 py-4">
                    <div className="min-w-0">
                        <h2 id="talent-profile-panel-title" className="text-base font-semibold text-ws-primary">
                            {talent.name}
                        </h2>
                        <p className="text-xs text-ws-muted">{talent.email}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded p-1 text-ws-muted hover:bg-ws-subtle"
                        aria-label="Fermer"
                    >
                        <X className="size-5" />
                    </button>
                </header>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <PortalAccessBadge hasAccess={talent.has_portal_access} />
                        <span
                            className={cx(
                                "rounded-md border px-2 py-0.5 text-xs",
                                talent.status === "active"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-slate-50 text-slate-600",
                            )}
                        >
                            {talent.status === "active" ? "● Actif" : "○ Inactif"}
                        </span>
                        {talent.seniority_level ? (
                            <span className="rounded-md border border-ws-border px-2 py-0.5 text-xs">{talent.seniority_level}</span>
                        ) : null}
                    </div>

                    <section className="space-y-1 text-sm">
                        <PropRow label="Poste" value={talent.job_title} />
                        <PropRow label="Département" value={talent.department ?? "—"} />
                        <PropRow label="Téléphone" value={talent.phone ?? "—"} />
                        <PropRow label="Date d'embauche" value={talent.hire_date ?? "—"} />
                        <PropRow label="Fin de contrat" value={talent.contract_end_date ?? "—"} />
                    </section>

                    <section>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ws-faint">Manager</h3>
                        {talent.has_manager ? (
                            <div className="mt-2 rounded-md border border-ws-border-subtle p-3">
                                <p className="text-sm font-medium text-ws-primary">{talent.manager_name}</p>
                                <p className="text-xs text-ws-muted">{talent.manager_email}</p>
                            </div>
                        ) : (
                            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">Aucun manager attribué</p>
                        )}
                    </section>

                    <section className="space-y-1 text-sm">
                        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ws-faint">Audit</h3>
                        <PropRow label="Créé" value={formatRelativeTimeFr(talent.created_at)} />
                        <PropRow label="Modifié" value={formatRelativeTimeFr(talent.updated_at)} />
                        <PropRow label="user_id portail" value={talent.user_id ?? "— (pas d'accès)"} />
                    </section>
                </div>

                <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-ws-border-subtle p-4">
                    <Button color="secondary" size="sm" onPress={() => onToggle(talent)}>
                        <Power className="mr-1 size-3.5" aria-hidden />
                        {talent.status === "active" ? "Désactiver" : "Réactiver"}
                    </Button>
                    <Button
                        color="primary-destructive"
                        size="sm"
                        onPress={() => onDelete(talent)}
                    >
                        <Trash2 className="mr-1 size-3.5" aria-hidden />
                        Supprimer
                    </Button>
                </footer>
            </aside>
        </>
    );
}

function PropRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3 py-1">
            <span className="text-ws-muted">{label}</span>
            <span className="font-medium text-ws-primary">{value}</span>
        </div>
    );
}
