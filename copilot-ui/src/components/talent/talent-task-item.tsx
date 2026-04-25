import { cx } from "@/utils/cx";

type TalentTaskItemProps = {
    title: string;
    meta?: string;
    status?: string;
    priority?: string;
};

function badgeTone(priority?: string): string {
    const p = String(priority ?? "").toLowerCase();
    if (p.includes("urgent")) return "bg-error-primary/15 text-error-primary";
    if (p.includes("moyen") || p.includes("medium")) return "bg-warning-primary/15 text-warning-primary";
    if (p.includes("done") || p.includes("fait")) return "bg-success-primary/15 text-success-primary";
    return "bg-brand-secondary/15 text-brand-secondary";
}

export function TalentTaskItem({ title, meta, status, priority }: TalentTaskItemProps) {
    const done = String(status ?? "").toLowerCase().includes("done") || String(status ?? "").toLowerCase().includes("term");
    return (
        <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition hover:bg-[#f7f6f3]">
            <div className={cx("mt-1 size-4 rounded-full border-[1.5px]", done ? "border-[#22c27a] bg-[#22c27a]" : "border-black/10")} />
            <div className="min-w-0 flex-1">
                <p className={cx("text-[13.5px] text-[#18171e]", done && "line-through text-[#a09db5]")}>{title}</p>
                {meta ? <p className="mt-0.5 text-[11.5px] text-[#a09db5]">{meta}</p> : null}
            </div>
            <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", badgeTone(priority))}>{priority || status || "N/A"}</span>
        </div>
    );
}

