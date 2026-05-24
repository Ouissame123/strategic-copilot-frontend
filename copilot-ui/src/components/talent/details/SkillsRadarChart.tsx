import { useMemo } from "react";
import { TALENT_CARD, TALENT_LABEL, TALENT_TITLE, type TalentSkill } from "@/components/talent/talent-detail-shared";

const Box = ("di" + "v") as const;

function skillCategory(skill: TalentSkill): string {
    const cat = (skill as { skill_category?: string }).skill_category;
    if (cat && String(cat).trim()) return String(cat).trim();
    const type = (skill as { skill_type?: string }).skill_type;
    if (type && String(type).trim()) return String(type).trim();
    return "Autre";
}

function SkillLevelDots({ level }: { level: number }) {
    const n = Math.max(0, Math.min(5, Math.round(level)));
    return (
        <span className="flex gap-0.5" aria-label={`Niveau ${n}/5`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <span
                    key={i}
                    className={`inline-block h-2 w-2 rounded-full ${i <= n ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"}`}
                />
            ))}
        </span>
    );
}

function PolarRadar({ categories, values }: { categories: string[]; values: number[] }) {
    const size = 220;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 72;
    const n = categories.length;
    if (n < 3) return null;

    const angleStep = (2 * Math.PI) / n;

    function point(i: number, r: number): [number, number] {
        const angle = -Math.PI / 2 + i * angleStep;
        return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
    }

    const gridLevels = [0.33, 0.66, 1];
    const polygon = values
        .map((v, i) => {
            const r = (Math.max(0, Math.min(5, v)) / 5) * radius;
            const [x, y] = point(i, r);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");

    return (
        <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-[240px]" role="img" aria-label="Radar compétences">
            {gridLevels.map((level, gi) => {
                const pts = Array.from({ length: n }, (_, i) => {
                    const [x, y] = point(i, radius * level);
                    return `${x},${y}`;
                }).join(" ");
                return (
                    <polygon
                        key={gi}
                        points={pts}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="0.5"
                        strokeDasharray={gi < 2 ? "2,2" : undefined}
                    />
                );
            })}
            {categories.map((_, i) => {
                const [x, y] = point(i, radius);
                return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#cbd5e1" strokeWidth="0.5" />;
            })}
            <polygon points={polygon} fill="#6366f1" fillOpacity="0.2" stroke="#6366f1" strokeWidth="1.5" />
            {categories.map((label, i) => {
                const [x, y] = point(i, radius + 18);
                const short = label.length > 10 ? `${label.slice(0, 9)}…` : label;
                return (
                    <text key={label} x={x} y={y} textAnchor="middle" fontSize="9" fill="#64748b">
                        {short}
                    </text>
                );
            })}
        </svg>
    );
}

function SkillsList({ skills }: { skills: TalentSkill[] }) {
    return (
        <ul className="space-y-2">
            {skills.map((skill, index) => {
                const level = Number(skill.level ?? 0);
                return (
                    <li
                        key={`${skill.skill_id ?? skill.skill_name ?? index}`}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/30"
                    >
                        <Box className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                {skill.skill_name ?? skill.skill_id ?? "Compétence"}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{skillCategory(skill)}</p>
                        </Box>
                        <SkillLevelDots level={level} />
                    </li>
                );
            })}
        </ul>
    );
}

export function SkillsRadarChart({ skills }: { skills: TalentSkill[] }) {
    const radarData = useMemo(() => {
        const map = new Map<string, { sum: number; count: number }>();
        for (const s of skills) {
            const cat = skillCategory(s);
            const level = Number(s.level ?? 0);
            const prev = map.get(cat) ?? { sum: 0, count: 0 };
            map.set(cat, { sum: prev.sum + level, count: prev.count + 1 });
        }
        const categories = [...map.keys()].sort();
        const values = categories.map((c) => {
            const { sum, count } = map.get(c)!;
            return count ? sum / count : 0;
        });
        return { categories, values };
    }, [skills]);

    if (skills.length === 0) {
        return (
            <section className={`${TALENT_CARD} p-6`}>
                <h2 className={TALENT_TITLE}>Compétences</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Aucune compétence remontée.</p>
            </section>
        );
    }

    const useRadar = skills.length > 5 && radarData.categories.length >= 3;

    return (
        <section className={`${TALENT_CARD} p-6`}>
            <h2 className={TALENT_TITLE}>Compétences</h2>
            <p className={`mt-1 ${TALENT_LABEL}`}>{skills.length} compétence{skills.length > 1 ? "s" : ""}</p>
            {useRadar ? (
                <>
                    <PolarRadar categories={radarData.categories} values={radarData.values} />
                    <Box className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
                        <p className={`mb-3 ${TALENT_LABEL}`}>Détail</p>
                        <SkillsList skills={skills} />
                    </Box>
                </>
            ) : (
                <Box className="mt-4">
                    <SkillsList skills={skills} />
                </Box>
            )}
        </section>
    );
}
