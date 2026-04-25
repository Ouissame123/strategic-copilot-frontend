import { useCallback, useEffect, useMemo, useState } from "react";
import * as projectsApi from "@/api/projects.api";
import type { CrudMutationResult, Project, ProjectCreateDTO, ProjectUpdateDTO } from "@/types/crud-domain";
import { ApiError } from "@/utils/apiClient";
import { toUserMessage } from "@/hooks/crud/error-message";

type ListQuery = Record<string, string | number | undefined | null>;

export function useProjects(query?: ListQuery) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const queryKey = useMemo(() => JSON.stringify(query ?? {}), [query]);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await projectsApi.list(query);
            setProjects(data);
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError") return;
            setError(toUserMessage(e));
            setProjects([]);
        } finally {
            setLoading(false);
        }
    }, [query, queryKey]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { projects, loading, error, refresh };
}

export function useProject(id: string | undefined) {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(Boolean(id));
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!id) {
            setProject(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await projectsApi.getById(id);
            setProject(data);
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError") return;
            setError(toUserMessage(e));
            setProject(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { project, loading, error, refresh };
}

export function useCreateProject() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<CrudMutationResult<Project> | null>(null);

    const create = useCallback(async (body: ProjectCreateDTO) => {
        setLoading(true);
        setError(null);
        try {
            const res = await projectsApi.create(body);
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

export function useUpdateProject() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<CrudMutationResult<Project> | null>(null);

    const update = useCallback(async (id: string, body: ProjectUpdateDTO) => {
        setLoading(true);
        setError(null);
        try {
            const res = await projectsApi.update(id, body);
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

export function useDeleteProject() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<CrudMutationResult<unknown> | null>(null);

    const remove = useCallback(async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await projectsApi.remove(id);
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
