import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { validationsApi, type ValidationsListParams } from "@/services/validations.api";

export function useValidations(scope: "mine" | "enterprise" = "mine", params?: Omit<ValidationsListParams, "scope">) {
    return useQuery({
        queryKey: queryKeys.manager.validations(scope, params),
        queryFn: async () => {
            const res = await validationsApi.list({ scope, ...params });
            return res.data;
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
    });
}
