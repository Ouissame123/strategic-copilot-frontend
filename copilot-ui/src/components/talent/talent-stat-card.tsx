import { cx } from "@/utils/cx";

export function TalentStatCard({
    label,
    value,
    hint,
    tone,
}: {
    label: string;
    value: string;
    hint?: string;
    tone?: "default" | "warning" | "success";
}) {
    const ring =
        tone === "warning"
            ? "ring-warning-primary/25"
            : tone === "success"
              ? "ring-success-primary/20"
              : "ring-black/5";
    return (
        <div className={cx("rounded-xl border border-black/5 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 md:py-4", ring)}>
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#a09db5]">{label}</p>
            <p className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-[#18171e]">{value}</p>
            {hint ? <p className="mt-1 text-xs text-tertiary">{hint}</p> : null}
        </div>
    );
}
