import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchTalentsWebhookList, type TalentsWebhookRow } from "@/api/talents-webhook-list.api";
import { toUserMessage } from "@/hooks/crud/error-message";

export function useTalentsWebhookList() {
    const [items, setItems] = useState<TalentsWebhookRow[]>([]);
    const [total, setTotal] = useState(0);
    const [meta, setMeta] = useState<Record<string, unknown>>({});
    const [raw, setRaw] = useState<unknown>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await fetchTalentsWebhookList();
            setItems(r.items);
            setTotal(r.total);
            setMeta(r.meta);
            setRaw(r.raw);
        } catch (e) {
            setItems([]);
            setTotal(0);
            setMeta({});
            setRaw(null);
            setError(toUserMessage(e));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return useMemo(
        () => ({
            items,
            total,
            meta,
            raw,
            loading,
            error,
            refresh,
        }),
        [items, total, meta, raw, loading, error, refresh],
    );
}
