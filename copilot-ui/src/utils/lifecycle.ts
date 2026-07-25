import type { LifecycleStatus, LifecycleStep, LifecycleStepState } from "@/types/api.types";

export const LIFECYCLE_STEPS: Array<{
    id: LifecycleStatus;
    labelKey: string;
    dbStatus: string;
    canTransitionTo: LifecycleStatus[];
}> = [
    { id: "initiation", labelKey: "lifecycle.initiation", dbStatus: "planned", canTransitionTo: ["planned"] },
    { id: "planned", labelKey: "lifecycle.planned", dbStatus: "planned", canTransitionTo: ["active", "cancelled"] },
    { id: "active", labelKey: "lifecycle.active", dbStatus: "active", canTransitionTo: ["on_hold", "completed", "cancelled"] },
    { id: "on_hold", labelKey: "lifecycle.on_hold", dbStatus: "on_hold", canTransitionTo: ["active", "cancelled"] },
    { id: "completed", labelKey: "lifecycle.completed", dbStatus: "completed", canTransitionTo: [] },
    { id: "cancelled", labelKey: "lifecycle.cancelled", dbStatus: "cancelled", canTransitionTo: [] },
];

const ORDER: LifecycleStatus[] = ["initiation", "planned", "active", "on_hold", "completed"];

export function lifecycleDbStatusForStep(stepId: LifecycleStatus): string {
    return LIFECYCLE_STEPS.find((s) => s.id === stepId)?.dbStatus ?? stepId;
}

export function canTransitionLifecycle(fromStatus: string, toStepId: LifecycleStatus): boolean {
    const normalized = String(fromStatus ?? "planned").trim().toLowerCase();
    const fromStep =
        normalized === "cancelled"
            ? "cancelled"
            : normalized === "completed"
              ? "completed"
              : normalized === "on_hold"
                ? "on_hold"
                : normalized === "active"
                  ? "active"
                  : "planned";
    const fromDef = LIFECYCLE_STEPS.find((s) => s.id === fromStep) ?? LIFECYCLE_STEPS[1];
    return fromDef.canTransitionTo.includes(toStepId);
}

function statusToOrderIndex(currentStatus: string): number {
    const s = String(currentStatus ?? "planned").trim().toLowerCase();
    if (s === "cancelled") return -1;
    if (s === "completed") return ORDER.indexOf("completed");
    if (s === "on_hold") return ORDER.indexOf("active");
    if (s === "active") return ORDER.indexOf("active");
    return ORDER.indexOf("planned");
}

export function buildLifecycleSteps(currentStatus: string): LifecycleStep[] {
    const s = String(currentStatus ?? "planned").trim().toLowerCase();
    if (s === "cancelled") {
        return ORDER.map((id) => ({
            id,
            label: id,
            state: "idle" as LifecycleStepState,
        }));
    }

    const currentIdx = statusToOrderIndex(s);
    return ORDER.map((id, idx) => {
        let state: LifecycleStepState = "idle";
        if (idx < currentIdx) state = "done";
        else if (idx === currentIdx) {
            state = s === "on_hold" ? "blocked" : "active";
        }
        return { id, label: id, state };
    });
}
