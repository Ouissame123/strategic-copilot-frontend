type Point = { label: string; value: number };

type TalentWorkloadChartProps = {
    title?: string;
    points: Point[];
};

export function TalentWorkloadChart({ title = "Charge hebdomadaire", points }: TalentWorkloadChartProps) {
    return (
        <section className="rounded-xl border border-black/5 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <h3 className="text-sm font-semibold text-primary">{title}</h3>
            {points.length === 0 ? (
                <p className="mt-3 text-sm text-tertiary">Aucune serie disponible.</p>
            ) : (
                <div className="mt-4 flex h-44 items-end gap-2">
                    {points.map((point) => {
                        const value = Math.max(0, Math.min(100, point.value));
                        return (
                            <div key={`${point.label}-${point.value}`} className="flex flex-1 flex-col items-center gap-2">
                                <span className="text-xs font-semibold text-secondary">{value}%</span>
                                <div className="w-full rounded-t-md bg-[#7c6ef5]/90" style={{ height: `${value}%` }} />
                                <span className="text-xs text-tertiary">{point.label}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

