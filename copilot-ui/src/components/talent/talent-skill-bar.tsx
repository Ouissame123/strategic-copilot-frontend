type TalentSkillBarProps = {
    name: string;
    valueLabel?: string;
    valuePct?: number;
};

export function TalentSkillBar({ name, valueLabel, valuePct }: TalentSkillBarProps) {
    const pct = Number.isFinite(valuePct) ? Math.max(0, Math.min(100, valuePct ?? 0)) : null;
    return (
        <div className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-primary">{name}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-brand-secondary" style={{ width: `${pct ?? 0}%` }} />
                </div>
            </div>
            <span className="w-12 text-right text-xs font-semibold text-secondary">{valueLabel || (pct != null ? `${pct}%` : "—")}</span>
        </div>
    );
}

