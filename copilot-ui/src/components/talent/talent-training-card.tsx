type TalentTrainingCardProps = {
    title: string;
    provider?: string;
    progressLabel?: string;
    progressValue?: number;
    status?: string;
};

export function TalentTrainingCard({ title, provider, progressLabel, progressValue, status }: TalentTrainingCardProps) {
    const value = Number.isFinite(progressValue) ? Math.max(0, Math.min(100, progressValue ?? 0)) : null;
    return (
        <article className="rounded-xl border border-secondary bg-primary p-4 shadow-xs">
            <p className="text-sm font-semibold text-primary">{title}</p>
            <p className="mt-1 text-xs text-tertiary">{provider || "—"}</p>
            <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-brand-secondary" style={{ width: `${value ?? 0}%` }} />
                </div>
                <span className="text-xs text-tertiary">{progressLabel || (value != null ? `${value}%` : "—")}</span>
            </div>
            <p className="mt-2 text-xs font-medium text-secondary">{status || "N/A"}</p>
        </article>
    );
}

