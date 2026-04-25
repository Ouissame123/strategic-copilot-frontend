/** Affichage défensif des réponses GET talent — pas de règle métier, uniquement lecture de champs. */

import { asRecord, firstArray, firstScalar } from "@/utils/unwrap-api-payload";

export function talentRootFromPayload(raw: unknown): Record<string, unknown> {
    return raw ? (typeof raw === "object" && !Array.isArray(raw) ? asRecord(raw) : {}) : {};
}

export function pickTalentId(root: Record<string, unknown>): string | undefined {
    const direct = firstScalar(root, ["talent_id", "talentId", "id"]);
    if (direct != null && String(direct).trim() !== "") return String(direct).trim();
    const profile = root.profile;
    if (profile && typeof profile === "object" && !Array.isArray(profile)) {
        const p = asRecord(profile);
        const id = firstScalar(p, ["talent_id", "talentId", "id"]);
        if (id != null && String(id).trim() !== "") return String(id).trim();
    }
    return undefined;
}

export function displayField(row: Record<string, unknown>, keys: string[]): string {
    for (const k of keys) {
        const v = row[k];
        if (v != null && String(v).trim() !== "") return String(v);
    }
    return "—";
}

export function parseWorkloadPercent(root: Record<string, unknown>): string {
    const v = firstScalar(root, [
        "workload_pct",
        "workload_percent",
        "capacity_load_pct",
        "load_pct",
        "total_workload_pct",
        "global_load_pct",
    ]);
    if (v == null) return "—";
    return String(v);
}

export function countTasksByPredicate(
    tasks: unknown[],
    predicate: (row: Record<string, unknown>) => boolean,
): number {
    let n = 0;
    for (const t of tasks) {
        if (t && typeof t === "object" && !Array.isArray(t) && predicate(asRecord(t))) n += 1;
    }
    return n;
}

/** Tâches considérées comme urgentes si le serveur expose priorité / échéance proche (libellés bruts). */
export function isUrgentTaskRow(row: Record<string, unknown>): boolean {
    const p = String(row.priority ?? row.urgency ?? row.priority_level ?? "")
        .trim()
        .toLowerCase();
    if (p === "urgent" || p === "high" || p === "haute" || p === "critical" || p === "p0" || p === "p1") return true;
    return false;
}

export function tasksFromRoot(root: Record<string, unknown>): Array<Record<string, unknown>> {
    return firstArray(root, ["tasks", "my_tasks", "assignments", "task_items"]).map((x) =>
        x && typeof x === "object" && !Array.isArray(x) ? asRecord(x) : {},
    );
}

export function projectsFromRoot(root: Record<string, unknown>): Array<Record<string, unknown>> {
    return firstArray(root, ["assigned_projects", "projects", "my_projects"]).map((x) =>
        x && typeof x === "object" && !Array.isArray(x) ? asRecord(x) : {},
    );
}

export function notificationsFromRoot(root: Record<string, unknown>): Array<Record<string, unknown>> {
    return firstArray(root, ["notifications", "talent_notifications", "alerts", "inbox"]).map((x) =>
        x && typeof x === "object" && !Array.isArray(x) ? asRecord(x) : {},
    );
}

export function deadlinesFromRoot(root: Record<string, unknown>): Array<Record<string, unknown>> {
    return firstArray(root, ["deadlines", "upcoming_deadlines", "milestones", "due_items"]).map((x) =>
        x && typeof x === "object" && !Array.isArray(x) ? asRecord(x) : {},
    );
}

export function trainingFromRoot(root: Record<string, unknown>): Array<Record<string, unknown>> {
    return firstArray(root, ["recommended_training", "training_recommendations", "trainings", "courses"]).map((x) =>
        x && typeof x === "object" && !Array.isArray(x) ? asRecord(x) : {},
    );
}

export function skillGapsFromRoot(root: Record<string, unknown>): Array<Record<string, unknown>> {
    return firstArray(root, ["skill_gaps", "skill_gaps_detected", "gaps"]).map((x) =>
        x && typeof x === "object" && !Array.isArray(x) ? asRecord(x) : {},
    );
}
