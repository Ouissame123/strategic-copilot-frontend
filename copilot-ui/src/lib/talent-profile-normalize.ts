import type { ProfileResponse } from "@/types/talent-profile";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function arr(value: unknown): string[] {
    return Array.isArray(value) ? value.map(String) : [];
}

export function normalizeTalentProfileResponse(raw: unknown): ProfileResponse {
    const root = unwrapN8nRoot(raw);
    const profile = asRecord(root.profile ?? root);
    const editable = asRecord(profile.editable);
    const managerRaw = profile.manager;
    const manager =
        managerRaw && typeof managerRaw === "object" && !Array.isArray(managerRaw)
            ? (managerRaw as ProfileResponse["profile"]["manager"])
            : null;
    const accountRaw = asRecord(profile.account);

    return {
        status: "success",
        profile: {
            ...(profile as ProfileResponse["profile"]),
            editable: {
                bio: String(editable.bio ?? ""),
                pro_phone: String(editable.pro_phone ?? ""),
                address: String(editable.address ?? ""),
                city: String(editable.city ?? ""),
                country: String(editable.country ?? ""),
                personal_phone: String(editable.personal_phone ?? ""),
            },
            manager,
            account: {
                user_id: String(accountRaw.user_id ?? ""),
                email: String(accountRaw.email ?? profile.email ?? ""),
                must_change_password: Boolean(accountRaw.must_change_password),
            },
        },
        editable_fields: arr(root.editable_fields),
        readonly_fields: arr(root.readonly_fields),
    };
}
