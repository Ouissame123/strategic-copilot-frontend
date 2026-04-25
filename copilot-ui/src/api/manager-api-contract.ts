const UUID_V4ISH_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertUuid(value: string, field: string): string {
    const trimmed = value.trim();
    if (!UUID_V4ISH_REGEX.test(trimmed)) {
        throw new Error(`${field} invalide (UUID requis).`);
    }
    return trimmed;
}

export function assertEnterpriseId(enterpriseId: string | undefined | null): string {
    if (!enterpriseId?.trim()) {
        throw new Error("enterprise_id manquant.");
    }
    return assertUuid(enterpriseId, "enterprise_id");
}

