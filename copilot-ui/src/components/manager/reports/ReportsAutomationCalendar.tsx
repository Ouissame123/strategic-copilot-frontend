import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "@/utils/cx";
import { REPORT_CARD } from "./reports-shared";
import { eventsForDate, type CalendarDayEvent, type ReportAutomation } from "./reports-automation";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

type ReportsAutomationCalendarProps = {
    automations: ReportAutomation[];
    month?: Date;
    onMonthChange?: (d: Date) => void;
};

export function ReportsAutomationCalendar({ automations, month: controlledMonth, onMonthChange }: ReportsAutomationCalendarProps) {
    const [internalMonth, setInternalMonth] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });
    const viewMonth = controlledMonth ?? internalMonth;

    const setViewMonth = (d: Date) => {
        if (onMonthChange) onMonthChange(d);
        else setInternalMonth(d);
    };

    const [hovered, setHovered] = useState<{ day: number; events: CalendarDayEvent[]; x: number; y: number } | null>(null);

    const { year, monthIndex, weeks, monthLabel } = useMemo(() => {
        const y = viewMonth.getFullYear();
        const m = viewMonth.getMonth();
        const first = new Date(y, m, 1);
        const last = new Date(y, m + 1, 0);
        const startPad = (first.getDay() + 6) % 7;
        const daysInMonth = last.getDate();
        const cells: (number | null)[] = [];
        for (let i = 0; i < startPad; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        while (cells.length % 7 !== 0) cells.push(null);
        const w: (number | null)[][] = [];
        for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7));
        const label = viewMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
        return { year: y, monthIndex: m, weeks: w, monthLabel: label };
    }, [viewMonth]);

    const today = new Date();
    const isToday = (day: number) =>
        today.getFullYear() === year && today.getMonth() === monthIndex && today.getDate() === day;

    const prevMonth = () => setViewMonth(new Date(year, monthIndex - 1, 1));
    const nextMonth = () => setViewMonth(new Date(year, monthIndex + 1, 1));

    return (
        <section className={REPORT_CARD + " p-5 sm:p-6"}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold capitalize text-slate-900 dark:text-slate-50">{monthLabel}</h2>
                    <p className="mt-0.5 text-sm text-slate-500">Générations planifiées</p>
                </div>
                <div className="flex gap-1">
                    <button
                        type="button"
                        onClick={prevMonth}
                        className="rounded-lg border border-slate-200/80 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        aria-label="Mois précédent"
                    >
                        <ChevronLeft className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={nextMonth}
                        className="rounded-lg border border-slate-200/80 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        aria-label="Mois suivant"
                    >
                        <ChevronRight className="size-4" />
                    </button>
                </div>
            </div>

            <svg viewBox="0 0 280 220" className="mx-auto w-full max-w-md" role="img" aria-label="Calendrier des planifications">
                <rect width="280" height="220" rx="12" className="fill-slate-50 dark:fill-slate-800/50" />
                {WEEKDAYS.map((wd, i) => (
                    <text
                        key={wd + i}
                        x={20 + i * 37}
                        y={22}
                        textAnchor="middle"
                        className="fill-slate-400 text-[10px] font-semibold"
                    >
                        {wd}
                    </text>
                ))}
                {weeks.map((row, ri) =>
                    row.map((day, ci) => {
                        if (day == null) return null;
                        const date = new Date(year, monthIndex, day);
                        const events = eventsForDate(date, automations);
                        const x = 12 + ci * 37;
                        const y = 32 + ri * 30;
                        const uniqueColors = [...new Set(events.map((e) => e.color))].slice(0, 3);
                        return (
                            <g
                                key={`${ri}-${ci}`}
                                className="cursor-pointer"
                                onMouseEnter={(e) => {
                                    const rect = (e.currentTarget as SVGGElement).getBoundingClientRect();
                                    setHovered({
                                        day,
                                        events,
                                        x: rect.left + rect.width / 2,
                                        y: rect.top,
                                    });
                                }}
                                onMouseLeave={() => setHovered(null)}
                            >
                                <rect
                                    x={x}
                                    y={y}
                                    width={32}
                                    height={26}
                                    rx={8}
                                    className={cx(
                                        isToday(day)
                                            ? "fill-indigo-100 stroke-indigo-400 dark:fill-indigo-950/50 dark:stroke-indigo-500"
                                            : "fill-white stroke-slate-200/80 dark:fill-slate-900 dark:stroke-slate-700",
                                    )}
                                    strokeWidth={isToday(day) ? 1.5 : 1}
                                />
                                <text x={x + 16} y={y + 14} textAnchor="middle" className="fill-slate-700 text-[11px] font-medium dark:fill-slate-200">
                                    {day}
                                </text>
                                {uniqueColors.map((color, di) => (
                                    <circle key={di} cx={x + 10 + di * 6} cy={y + 21} r={2.5} fill={color} />
                                ))}
                            </g>
                        );
                    }),
                )}
            </svg>

            {hovered && hovered.events.length > 0 ? (
                <div
                    className="pointer-events-none fixed z-50 w-56 -translate-x-1/2 -translate-y-full rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
                    style={{ left: hovered.x, top: hovered.y - 8 }}
                    role="tooltip"
                >
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                        {hovered.day} {monthLabel.split(" ")[0]}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                        {hovered.events.map((ev) => (
                            <li key={ev.automationId} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: ev.color }} />
                                <span className="font-medium text-slate-800 dark:text-slate-200">{ev.title}</span>
                                <span className="text-slate-400">· {ev.time}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-indigo-500" /> Comité
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-amber-500" /> Risques
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500" /> RH
                </span>
            </div>
        </section>
    );
}
