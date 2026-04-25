import { useCallback, useEffect, useMemo, useState } from "react";
import * as assignmentsApi from "@/api/assignments.api";
import type { Assignment, AssignmentCreateDTO, AssignmentUpdateDTO, CrudMutationResult } from "@/types/crud-domain";
import { toUserMessage } from "@/hooks/crud/error-message";
import { ApiError } from "@/utils/apiClient";

type ListQuery = Record<string, string | number | undefined | null>;

export function useAssignments(query?: ListQuery) {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const queryKey = useMemo(() => JSON.stringify(query ?? {}), [query]);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setAssignments(await assignmentsApi.list(query));
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError") return;
            setError(toUserMessage(e));
            setAssignments([]);
        } finally {
            setLoading(false);
        }
    }, [query, queryKey]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { assignments, loading, error, refresh };
}

export function useAssignment(id: string | undefined) {
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [loading, setLoading] = useState(Boolean(id));
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!id) {
            setAssignment(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            setAssignment(await assignmentsApi.getById(id));
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError") return;
            setError(toUserMessage(e));
            setAssignment(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { assignment, loading, error, refresh };
}

export function useCreateAssignment() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<CrudMutationResult<Assignment> | null>(null);

    const create = useCallback(async (body: AssignmentCreateDTO) => {
        setLoading(true);
        setError(null);
        try {
            const res = await assignmentsApi.create(body);
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

export function useUpdateAssignment() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<CrudMutationResult<Assignment> | null>(null);

    const update = useCallback(async (id: string, body: AssignmentUpdateDTO) => {
        setLoading(true);
        setError(null);
        try {
            const res = await assignmentsApi.update(id, body);
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

export function useDeleteAssignment() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<CrudMutationResult<unknown> | null>(null);

    const remove = useCallback(async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await assignmentsApi.remove(id);
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
