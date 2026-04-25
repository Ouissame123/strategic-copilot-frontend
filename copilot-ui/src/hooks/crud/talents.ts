import { useCallback, useEffect, useMemo, useState } from "react";
import * as talentsApi from "@/api/talents.api";
import type { CrudMutationResult, Talent, TalentCreateDTO, TalentUpdateDTO } from "@/types/crud-domain";
import { toUserMessage } from "@/hooks/crud/error-message";
import { ApiError } from "@/utils/apiClient";

type ListQuery = Record<string, string | number | undefined | null>;

export function useTalents(query?: ListQuery) {
    const [talents, setTalents] = useState<Talent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const queryKey = useMemo(() => JSON.stringify(query ?? {}), [query]);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setTalents(await talentsApi.list(query));
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError") return;
            setError(toUserMessage(e));
            setTalents([]);
        } finally {
            setLoading(false);
        }
    }, [query, queryKey]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { talents, loading, error, refresh };
}

export function useTalent(id: string | undefined) {
    const [talent, setTalent] = useState<Talent | null>(null);
    const [loading, setLoading] = useState(Boolean(id));
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!id) {
            setTalent(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            setTalent(await talentsApi.getById(id));
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError") return;
            setError(toUserMessage(e));
            setTalent(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { talent, loading, error, refresh };
}

export function useCreateTalent() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<CrudMutationResult<Talent> | null>(null);

    const create = useCallback(async (body: TalentCreateDTO) => {
        setLoading(true);
        setError(null);
        try {
            const res = await talentsApi.create(body);
            setLastResult(res);
            return res;
        } catch (e) {
            const msg = toUserMessage(e);
            setError(msg);
            throw e instanceof ApiError ? e : new ApiError(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    const resetLast = useCallback(() => setLastResult(null), []);

    return { create, loading, error, lastResult, resetLast };
}

export function useUpdateTalent() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<CrudMutationResult<Talent> | null>(null);

    const update = useCallback(async (id: string, body: TalentUpdateDTO) => {
        setLoading(true);
        setError(null);
        try {
            const res = await talentsApi.update(id, body);
            setLastResult(res);
            return res;
        } catch (e) {
            const msg = toUserMessage(e);
            setError(msg);
            throw e instanceof ApiError ? e : new ApiError(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    const resetLast = useCallback(() => setLastResult(null), []);

    return { update, loading, error, lastResult, resetLast };
}

export function useDeleteTalent() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<CrudMutationResult<unknown> | null>(null);

    const remove = useCallback(async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await talentsApi.remove(id);
            setLastResult(res);
            return res;
        } catch (e) {
            const msg = toUserMessage(e);
            setError(msg);
            throw e instanceof ApiError ? e : new ApiError(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    const resetLast = useCallback(() => setLastResult(null), []);

    return { remove, loading, error, lastResult, resetLast };
}
