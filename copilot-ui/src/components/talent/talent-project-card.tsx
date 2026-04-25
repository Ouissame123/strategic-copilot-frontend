import { cx } from "@/utils/cx";

type TalentProjectCardProps = {
    name: string;
    subtitle?: string;
    status?: string;
    progressLabel?: string;
    progressValue?: number;
    dueLabel?: string;
};

function statusTone(status?: string): string {
    const s = String(status ?? "").toLowerCase();
    if (s.includes("risk") || s.includes("retard")) return "bg-warning-primary/15 text-warning-primary";
    if (s.includes("done") || s.includes("term")) return "bg-gray-200 text-gray-700";
    if (s.includes("start") || s.includes("demarr")) return "bg-blue-100 text-blue-700";
    return "bg-success-primary/15 text-success-primary";
}

export function TalentProjectCard({ name, subtitle, status, progressLabel, progressValue, dueLabel }: TalentProjectCardProps) {
    const value = Number.isFinite(progressValue) ? Math.max(0, Math.min(100, progressValue ?? 0)) : null;
    return (
        <article className="rounded-xl border border-black/5 bg-white p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5 hover:border-[#7c6ef5]/45">
            <div className="mb-2 flex items-start justify-between gap-2">
                <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", statusTone(status))}>{status || "N/A"}</span>
                <span className="text-xs text-[#a09db5]">{dueLabel || "—"}</span>
            </div>
            <p className="text-[14.5px] font-semibold text-[#18171e]">{name}</p>
            <p className="mt-1 text-xs text-[#a09db5]">{subtitle || "—"}</p>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#f7f6f3]">
                <div className="h-full rounded-full bg-[#7c6ef5]" style={{ width: `${value ?? 0}%` }} />
            </div>
            <p className="mt-2 text-xs text-[#a09db5]">{progressLabel || (value != null ? `${value}%` : "—")}</p>
        </article>
    );
}

