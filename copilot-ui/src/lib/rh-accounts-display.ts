import type { RhStaffRole } from "@/types/rh-accounts.types";

export const ROLE_BADGE: Record<RhStaffRole, { label: string; className: string }> = {
    manager: { label: "Manager", className: "border-violet-200 bg-violet-50 text-violet-900" },
    rh: { label: "RH", className: "border-sky-200 bg-sky-50 text-sky-900" },
    admin: { label: "Admin", className: "border-amber-200 bg-amber-50 text-amber-900" },
};

export function isUserActive(status: string | undefined): boolean {
    return String(status ?? "active").toLowerCase() === "active";
}

export function isTalentActive(status: string | undefined): boolean {
    return String(status ?? "active").toLowerCase() === "active";
}

export function readBackendMessage(payload: { message?: string } | undefined, fallback: string): string {
    const msg = payload?.message?.trim();
    return msg || fallback;
}
