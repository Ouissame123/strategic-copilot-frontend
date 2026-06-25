import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { extractCatalogFromResponse } from "@/api/rh-skills.api";
import { API_ROUTES } from "@/lib/api-routes";
import { httpClient } from "@/lib/http-client";
import {
    mapRawCatalogToSkillOptions,
    sortSkillPickerOptions,
    type SkillPickerOption,
} from "@/components/manager/mission-control/requirement-utils";

export const SKILLS_CATALOG_QUERY_KEY = ["manager", "skills-catalog"] as const;

export class SkillsCatalogQueryError extends Error {
    readonly httpStatus: number;

    constructor(httpStatus: number, message?: string) {
        super(message ?? `Skills catalog request failed (${httpStatus}).`);
        this.name = "SkillsCatalogQueryError";
        this.httpStatus = httpStatus;
    }
}

async function fetchSkillsCatalog(signal?: AbortSignal): Promise<SkillPickerOption[]> {
    try {
        const { data } = await httpClient.get<unknown>(API_ROUTES.skillsCatalog(), { signal });
        return sortSkillPickerOptions(mapRawCatalogToSkillOptions(extractCatalogFromResponse(data)));
    } catch (err) {
        if (isAxiosError(err)) {
            throw new SkillsCatalogQueryError(err.response?.status ?? 0);
        }
        throw err;
    }
}

export function useSkillsCatalogQuery(enabled = true) {
    return useQuery({
        queryKey: SKILLS_CATALOG_QUERY_KEY,
        queryFn: ({ signal }) => fetchSkillsCatalog(signal),
        enabled,
        staleTime: 5 * 60_000,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}
