import { Calendar, Mail, MoreVertical, Pencil, Play, Trash2 } from "lucide-react";
import { useState } from "react";
import { cx } from "@/utils/cx";
import type { MockSchedule } from "./reports-shared";
import { REPORT_CARD } from "./reports-shared";

type ScheduleCardProps = {
    schedule: MockSchedule;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    onRunNow?: (id: string) => void;
    onToggleActive?: (id: string, active: boolean) => void;
};

export function ScheduleCard({ schedule, onEdit, onDelete, onRunNow, onToggleActive }: ScheduleCardProps) {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <article className={REPORT_CARD + " p-5 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-50">{schedule.name}</h3>
                        <span
                            className={cx(
                                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                                schedule.active
                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : "bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400",
                            )}
                        >
                            {schedule.active ? "Actif" : "Inactif"}
                        </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <Calendar className="size-3.5 shrink-0" />
                        {schedule.frequency}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <Mail className="size-3.5 shrink-0" />
                        {schedule.recipients}
                    </p>
                </div>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setMenuOpen((v) => !v)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Actions"
                    >
                        <MoreVertical className="size-4" />
                    </button>
                    {menuOpen ? (
                        <>
                            <button type="button" className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-label="Fermer" />
                            <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                                {onEdit ? (
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            onEdit(schedule.id);
                                        }}
                                    >
                                        <Pencil className="size-4" /> Modifier
                                    </button>
                                ) : null}
                                {onRunNow ? (
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            onRunNow(schedule.id);
                                        }}
                                    >
                                        <Play className="size-4" /> Exécuter maintenant
                                    </button>
                                ) : null}
                                {onToggleActive ? (
                                    <button
                                        type="button"
                                        className="flex w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            onToggleActive(schedule.id, !schedule.active);
                                        }}
                                    >
                                        {schedule.active ? "Désactiver" : "Activer"}
                                    </button>
                                ) : null}
                                {onDelete ? (
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            onDelete(schedule.id);
                                        }}
                                    >
                                        <Trash2 className="size-4" /> Supprimer
                                    </button>
                                ) : null}
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                    <dt className="text-slate-500">Dernier envoi</dt>
                    <dd className="font-medium text-slate-800 dark:text-slate-200">{schedule.lastSent}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                    <dt className="text-slate-500">Prochain envoi</dt>
                    <dd className="font-medium text-slate-800 dark:text-slate-200">{schedule.nextSent}</dd>
                </div>
            </dl>
        </article>
    );
}
