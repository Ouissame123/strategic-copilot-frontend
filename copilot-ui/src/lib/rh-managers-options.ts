import type { RhManagerListItem } from "@/types/rh-assignments.types";

export type RhManagerOption = RhManagerListItem;

export function formatManagerSelectLabel(manager: RhManagerListItem): string {
    return `${manager.full_name} — ${manager.email}`;
}

export function managersToSelectOptions(managers: RhManagerListItem[]): RhManagerListItem[] {
    return [...managers].sort((a, b) => a.full_name.localeCompare(b.full_name, "fr"));
}
