import { useCallback, useEffect, useMemo, useState } from "react";
import * as skillsApi from "@/api/skills.api";
import type { CrudMutationResult, Skill, SkillCreateDTO, SkillUpdateDTO } from "@/types/crud-domain";
import { toUserMessage } from "@/hooks/crud/error-message";
import { ApiError } from "@/utils/apiClient";

type ListQuery = Record<string, string | number | undefined | null>;

export function useSkills(query?: ListQuery) {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const queryKey = useMemo(() => JSON.stringify(query ?? {}), [query]);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setSkills(await skillsApi.list(query));
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError") return;
            setError(toUserMessage(e));
            setSkills([]);
        } finally {
            setLoading(false);
        }
    }, [query, queryKey]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { skills, loading, error, refresh };
}

export function useSkill(id: string | undefined) {
    const [skill, setSkill] = useState<Skill | null>(null);
    const [loading, setLoading] = useState(Boolean(id));
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!id) {
            setSkill(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            setSkill(await skillsApi.getById(id));
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError") return;
            setError(toUserMessage(e));
            setSkill(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { skill, loading, error, refresh };
}

export function useCreateSkill() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<CrudMutationResult<Skill> | null>(null);

    const create = useCallback(async (body: SkillCreateDTO) => {
        setLoading(true);
        setError(null);
        try {
            const res = await skillsApi.create(body);
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

export function useUpdateSkill() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<CrudMutationResult<Skill> | null>(null);

    const update = useCallback(async (id: string, body: SkillUpdateDTO) => {
        setLoading(true);
        setError(null);
        try {
            const res = await skillsApi.update(id, body);
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

export function useDeleteSkill() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<CrudMutationResult<unknown> | null>(null);

    const remove = useCallback(async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await skillsApi.remove(id);
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
