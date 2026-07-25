import type { RhRequestStatusBucket } from "@/utils/rh-requests-decision";
import type { ReallocationProposal } from "./utils/parseReallocation";

export type RhActionFilterId = "all" | "urgent" | "reallocation" | "pending";

export type RhActionCardModel = {
    id: string;
    type: string;
    statusLabel: string;
    statusBucket: RhRequestStatusBucket | null;
    priority: string;
    projectName: string;
    projectId: string;
    createdAt: string;
    fallbackTitle: string;
    fallbackDescription: string;
    recommendedAction: string;
    proposals: ReallocationProposal[] | null;
    duplicateCount: number;
};
