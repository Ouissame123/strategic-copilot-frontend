import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { validationsApi, type PendingValidationsRequest } from "@/services/validations.api";

export function useValidations(body: PendingValidationsRequest | null) {
    const enterpriseId = body?.enterprise_id?.trim() ?? "";
    const managerUserId = body?.manager_user_id ?? null;
    const enabled = Boolean(enterpriseId);

    return useQuery({
        queryKey: queryKeys.manager.validations(enterpriseId, managerUserId),
        queryFn: async () => {
            const res = await validationsApi.list({
                enterprise_id: enterpriseId,
                manager_user_id: managerUserId,
            });
            return res.data;
        },
        enabled,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
    });
}
