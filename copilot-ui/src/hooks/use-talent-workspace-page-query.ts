import { useQuery } from "@tanstack/react-query";
import { fetchTalentWorkspacePage, type TalentWorkspacePageKey } from "@/api/talent-workspace-pages.api";
import { unwrapDataPayload } from "@/utils/unwrap-api-payload";

function parseItems(payload: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(payload)) {
        return payload.map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}));
    }
    if (!payload || typeof payload !== "object") return [];
    const o = payload as Record<string, unknown>;
    const source = o.items ?? o.data ?? o.results ?? o.rows ?? o.list;
    if (!Array.isArray(source)) return [];
    return source.map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}));
}

export function useTalentWorkspacePageQuery(page: TalentWorkspacePageKey) {
    return useQuery({
        queryKey: ["talent", "workspace-page", page],
        queryFn: ({ signal }) => fetchTalentWorkspacePage(page, { signal }),
        select: (raw) => {
            const root = unwrapDataPayload(raw) as Record<string, unknown>;
            return {
                raw,
                root,
                items: parseItems(root),
            };
        },
    });
}

