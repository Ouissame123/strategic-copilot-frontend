/**
 * Services WF_RH Availability — vue overview & détail talent.
 */
export {
    availabilityDetailFromSummary,
    fetchAvailabilityOverview,
    fetchTalentAvailability,
    indexAvailabilityOverview,
    mapRhAvailabilityError,
    RhAvailabilityApiError,
    resolveRhAvailabilityWebhookRoot,
    rhAvailabilityOverviewUrl,
    rhTalentAvailabilityUrl,
} from "@/api/rh-availability.api";

export type {
    RhAvailabilityOverviewResponse,
    RhAvailabilityStatus,
    RhTalentAvailabilityDetail,
    RhTalentAvailabilitySummary,
} from "@/types/rh-availability.types";
