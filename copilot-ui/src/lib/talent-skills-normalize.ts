import type { CatalogSkill, MySkill, SkillGap, SkillsSummary } from "@/types/talent-skills";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function arr<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

export function normalizeMySkillsList(raw: unknown): MySkill[] {
    const root = unwrapN8nRoot(raw);
    return arr<MySkill>(root.items ?? root.skills ?? root.data);
}

export function normalizeSkillsSummary(raw: unknown): SkillsSummary {
    const root = unwrapN8nRoot(raw);
    const summary = asRecord(root.summary ?? root);
    const byLevel = asRecord(summary.by_level);
    return {
        total: Number(summary.total ?? 0),
        certified: Number(summary.certified ?? 0),
        avg_level: Number(summary.avg_level ?? 0),
        by_level: {
            expert: Number(byLevel.expert ?? 0),
            intermediate: Number(byLevel.intermediate ?? 0),
            beginner: Number(byLevel.beginner ?? 0),
        },
        recently_used: Number(summary.recently_used ?? 0),
        by_category: arr(summary.by_category),
    };
}

export function normalizeCatalogSkills(raw: unknown): CatalogSkill[] {
    const root = unwrapN8nRoot(raw);
    return arr<CatalogSkill>(root.items ?? root.skills ?? root.data);
}

export function normalizeSkillGaps(raw: unknown): SkillGap[] {
    const root = unwrapN8nRoot(raw);
    return arr<SkillGap>(root.items ?? root.gaps ?? root.data);
}

export function normalizeMySkill(raw: unknown): MySkill {
    const root = unwrapN8nRoot(raw);
    const skill = root.skill ?? root.data ?? root;
    return skill as MySkill;
}
