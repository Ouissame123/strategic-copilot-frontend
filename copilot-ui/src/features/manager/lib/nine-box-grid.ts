import { readRecordNumber, readRecordString } from "@/features/manager/lib/dashboard-display";

export type NineBoxMatrixTalent = {
    talent_name: string;
    performance_score: number;
    potential_score: number;
};

export type NineBoxCellMeta = {
    label: string;
    icon: string;
    color: "yellow" | "green" | "orange" | "blue" | "red";
};

export const NINE_BOX_CELL_META: readonly (readonly NineBoxCellMeta[])[] = [
    [
        { label: "Future Star", icon: "✨", color: "yellow" },
        { label: "Future Leader", icon: "🚀", color: "green" },
        { label: "Star", icon: "⭐", color: "green" },
    ],
    [
        { label: "Inconsistent", icon: "⚖", color: "orange" },
        { label: "Core Player", icon: "💪", color: "blue" },
        { label: "High Potential", icon: "📈", color: "green" },
    ],
    [
        { label: "Risk", icon: "⚠", color: "red" },
        { label: "Effective", icon: "🛡", color: "orange" },
        { label: "Trusted Pro", icon: "🎯", color: "blue" },
    ],
] as const;

export const NINE_BOX_CELL_SURFACE: Record<NineBoxCellMeta["color"], string> = {
    yellow: "bg-yellow-50 border-yellow-200",
    green: "bg-green-50 border-green-200",
    orange: "bg-orange-50 border-orange-200",
    blue: "bg-blue-50 border-blue-200",
    red: "bg-red-50 border-red-200",
};

export function getNineBoxCellLevels(performanceScore: number, potentialScore: number): { pLevel: number; xLevel: number } {
    const pLevel = potentialScore >= 7 ? 2 : potentialScore >= 4 ? 1 : 0;
    const xLevel = performanceScore >= 7 ? 2 : performanceScore >= 4 ? 1 : 0;
    return { pLevel, xLevel };
}

function readMatrixArray(matrix: unknown): unknown[] {
    if (Array.isArray(matrix)) return matrix;
    if (matrix != null && typeof matrix === "object" && !Array.isArray(matrix)) {
        const root = matrix as Record<string, unknown>;
        const talents = root.talents;
        if (Array.isArray(talents)) return talents;
        const grid = root.grid;
        if (grid != null && typeof grid === "object" && !Array.isArray(grid)) {
            const nested = (grid as Record<string, unknown>).talents;
            if (Array.isArray(nested)) return nested;
        }
    }
    return [];
}

export function parseNineBoxMatrixTalents(matrix: unknown): NineBoxMatrixTalent[] {
    return readMatrixArray(matrix)
        .map((row) => {
            const performance_score = readRecordNumber(row, "performance_score");
            const potential_score = readRecordNumber(row, "potential_score");
            const talent_name =
                readRecordString(row, "talent_name") ??
                readRecordString(row, "name") ??
                readRecordString(row, "full_name");
            if (performance_score == null || potential_score == null || !talent_name) return null;
            return { talent_name, performance_score, potential_score };
        })
        .filter((entry): entry is NineBoxMatrixTalent => entry != null);
}

export function buildNineBoxTalentGrid(matrix: unknown): NineBoxMatrixTalent[][][] {
    const grid: NineBoxMatrixTalent[][][] = Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () => [] as NineBoxMatrixTalent[]),
    );

    for (const talent of parseNineBoxMatrixTalents(matrix)) {
        const { pLevel, xLevel } = getNineBoxCellLevels(talent.performance_score, talent.potential_score);
        grid[2 - pLevel][xLevel].push(talent);
    }

    return grid;
}
