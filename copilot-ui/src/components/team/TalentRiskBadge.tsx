import { riskLevelStyles } from "@/components/talent/talent-detail-shared";
import type { TalentListItem } from "@/types/api.types";
import { resolveTalentRiskLevel } from "@/components/team/team-list-utils";

export function TalentRiskBadge({ talent }: { talent: TalentListItem }) {
    const level = resolveTalentRiskLevel(talent);
    const { badge, label } = riskLevelStyles(level);

    return (
        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge}`}>{label}</span>
    );
}
