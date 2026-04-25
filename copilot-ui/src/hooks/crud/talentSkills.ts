import { useCallback, useEffect, useMemo, useState } from "react";
import * as talentSkillsApi from "@/api/talentSkills.api";
import type { CrudMutationResult, TalentSkill, TalentSkillCreateDTO, TalentSkillUpdateDTO } from "@/types/crud-domain";
import { toUserMessage } from "@/hooks/crud/error-message";
import { ApiError } from "@/utils/apiClient";

type ListQuery = Record<string, string | number | undefined | null>;

export function useTalentSkills(query?: ListQuery) {
    const [talentSkills, setTalentSkills] = useState<TalentSkill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const queryKey = useMemo(() => JSON.stringify(query ?? {}), [query]);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setTalentSkills(await talentSkillsApi.list(query));
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError") return;
            setError(toUserMessage(e));
            setTalentSkills([]);
        } finally {
            setLoading(false);
        }
    }, [query, queryKey]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { talentSkills, loading, error, refresh };
}

export function useTalentSkill(id: string | undefined) {
    const [talentSkill, setTalentSkill] = useState<TalentSkill | null>(null);
    const [loading, setLoading] = useState(Boolean(id));
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!id) {
            setTalentSkill(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            setTalentSkill(await talentSkillsApi.getById(id));
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError") return;
            setError(toUserMessage(e));
            setTalentSkill(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { talentSkill, loading, error, refresh };
}

export function useCreateTalentSkill() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<CrudMutationResult<TalentSkill> | null>(null);

    const create = useCallback(async (body: TalentSkillCreateDTO) => {
        setLoading(true);
        setError(null);
        try {
            const res = await talentSkillsApi.create(body);
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

export function useUpdateTalentSkill() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<CrudMutationResult<TalentSkill> | null>(null);

    const update = useCallback(async (id: string, body: TalentSkillUpdateDTO) => {
        setLoading(true);
        setError(null);
        try {
            const res = await talentSkillsApi.update(id, body);
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

export function useDeleteTalentSkill() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<CrudMutationResult<unknown> | null>(null);

    const remove = useCallback(async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await talentSkillsApi.remove(id);
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
