import { useCallback, useEffect, useMemo, useState } from "react";
import {
    changeRhStaffPassword,
    createRhStaffAccount,
    createRhUserFromExistingTalent,
    createRhTalentAccount,
    deleteRhStaffAccount,
    deleteRhTalentAccount,
    fetchRhAccountsPageData,
    listRhDeletedAccounts,
    listRhStaffAccounts,
    listRhTalentAccounts,
    mapRhAccountsApiError,
    toggleRhStaffStatus,
    toggleRhTalentStatus,
} from "@/api/rh-accounts.api";
import { ApiError } from "@/api/errors";
import type {
    CreateRhStaffAccountBody,
    CreateRhTalentAccountBody,
    RhAccountsTabId,
    RhDeletedAccount,
    RhStaffAccount,
    RhTalentAccount,
} from "@/types/rh-accounts.types";
import { flippedRhAccountStatus } from "@/utils/accounts-email-utils";

type ListState<T> = {
    items: T[];
    isLoading: boolean;
    error: string | null;
};

const INITIAL_LIST = <T,>(): ListState<T> => ({
    items: [],
    isLoading: true,
    error: null,
});

export function useRhAccounts(activeTab: RhAccountsTabId) {
    const [staff, setStaff] = useState<ListState<RhStaffAccount>>(INITIAL_LIST);
    const [talents, setTalents] = useState<ListState<RhTalentAccount>>(INITIAL_LIST);
    const [deleted, setDeleted] = useState<ListState<RhDeletedAccount>>(INITIAL_LIST);
    const [mutating, setMutating] = useState(false);
    const [deletedLoaded, setDeletedLoaded] = useState(false);
    const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

    const loadStaff = useCallback(async (signal?: AbortSignal) => {
        setStaff((s) => ({ ...s, isLoading: true, error: null }));
        try {
            const items = await listRhStaffAccounts({ signal });
            setStaff({ items, isLoading: false, error: null });
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            setStaff({ items: [], isLoading: false, error: mapRhAccountsApiError(err, "list") });
        }
    }, []);

    const loadTalents = useCallback(async (signal?: AbortSignal) => {
        setTalents((s) => ({ ...s, isLoading: true, error: null }));
        try {
            const items = await listRhTalentAccounts({ signal });
            setTalents({ items, isLoading: false, error: null });
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            setTalents({ items: [], isLoading: false, error: mapRhAccountsApiError(err, "list") });
        }
    }, []);

    const loadDeleted = useCallback(async (signal?: AbortSignal) => {
        setDeleted((s) => ({ ...s, isLoading: true, error: null }));
        try {
            const items = await listRhDeletedAccounts({ signal });
            setDeleted({ items, isLoading: false, error: null });
            setDeletedLoaded(true);
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            setDeleted({ items: [], isLoading: false, error: mapRhAccountsApiError(err, "list") });
        }
    }, []);

    useEffect(() => {
        const c = new AbortController();
        const { signal } = c;

        setStaff((s) => ({ ...s, isLoading: true, error: null }));
        setTalents((s) => ({ ...s, isLoading: true, error: null }));

        void fetchRhAccountsPageData({ signal })
            .then(({ staff: staffRes, talents: talentsRes }) => {
                setStaff({ items: staffRes.users, isLoading: false, error: null });
                setTalents({ items: talentsRes.talents, isLoading: false, error: null });
            })
            .catch((err) => {
                if (err instanceof Error && err.name === "AbortError") return;
                const msg = mapRhAccountsApiError(err, "list");
                setStaff({ items: [], isLoading: false, error: msg });
                setTalents({ items: [], isLoading: false, error: msg });
            });

        return () => c.abort();
    }, []);

    useEffect(() => {
        if (activeTab === "deleted" && !deletedLoaded) {
            const c = new AbortController();
            void loadDeleted(c.signal);
            return () => c.abort();
        }
        return undefined;
    }, [activeTab, deletedLoaded, loadDeleted]);

    const retry = useCallback(() => {
        if (activeTab === "staff") void loadStaff();
        else if (activeTab === "talents") void loadTalents();
        else void loadDeleted();
    }, [activeTab, loadStaff, loadTalents, loadDeleted]);

    const createStaff = useCallback(async (body: CreateRhStaffAccountBody) => {
        setMutating(true);
        try {
            const res = await createRhStaffAccount(body);
            await loadStaff();
            return res;
        } catch (err) {
            throw err instanceof ApiError ? err : new ApiError(mapRhAccountsApiError(err, "create-staff"));
        } finally {
            setMutating(false);
        }
    }, [loadStaff]);

    const createTalent = useCallback(async (body: CreateRhTalentAccountBody) => {
        setMutating(true);
        try {
            const res = await createRhTalentAccount(body);
            await loadTalents();
            return res;
        } catch (err) {
            throw err instanceof ApiError ? err : new ApiError(mapRhAccountsApiError(err, "create-talent"));
        } finally {
            setMutating(false);
        }
    }, [loadTalents]);

    const createStaffFromExistingTalent = useCallback(
        async (body: CreateRhStaffAccountBody) => {
            setMutating(true);
            try {
                const res = await createRhUserFromExistingTalent(body);
                await Promise.all([loadStaff(), loadTalents()]);
                return res;
            } catch (err) {
                throw err instanceof ApiError ? err : new ApiError(mapRhAccountsApiError(err, "create-staff"));
            } finally {
                setMutating(false);
            }
        },
        [loadStaff, loadTalents],
    );

    const removeStaff = useCallback(
        async (userId: string) => {
            setMutating(true);
            try {
                const res = await deleteRhStaffAccount(userId);
                await loadStaff();
                return res;
            } catch (err) {
                throw err instanceof ApiError ? err : new ApiError(mapRhAccountsApiError(err, "delete-staff"));
            } finally {
                setMutating(false);
            }
        },
        [loadStaff],
    );

    const removeTalent = useCallback(
        async (talentId: string) => {
            setMutating(true);
            try {
                const res = await deleteRhTalentAccount(talentId);
                await loadTalents();
                return res;
            } catch (err) {
                throw err instanceof ApiError ? err : new ApiError(mapRhAccountsApiError(err, "delete-talent"));
            } finally {
                setMutating(false);
            }
        },
        [loadTalents],
    );

    const updateStaffPassword = useCallback(async (userId: string, newPassword: string) => {
        setMutating(true);
        try {
            const res = await changeRhStaffPassword(userId, newPassword);
            return res;
        } catch (err) {
            throw err instanceof ApiError ? err : new ApiError(mapRhAccountsApiError(err, "change-password"));
        } finally {
            setMutating(false);
        }
    }, []);

    const toggleStaffStatus = useCallback(async (userId: string) => {
        setTogglingIds((prev) => new Set(prev).add(userId));
        try {
            const res = await toggleRhStaffStatus(userId);
            const current = staff.items.find((u) => u.id === userId);
            const nextStatus = res.user?.status ?? flippedRhAccountStatus(current?.status);
            setStaff((s) => ({
                ...s,
                items: s.items.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u)),
            }));
            return res;
        } catch (err) {
            throw err instanceof ApiError ? err : new ApiError(mapRhAccountsApiError(err, "patch-staff"));
        } finally {
            setTogglingIds((prev) => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        }
    }, [staff.items]);

    const toggleTalentStatus = useCallback(async (talentId: string) => {
        setTogglingIds((prev) => new Set(prev).add(talentId));
        try {
            const res = await toggleRhTalentStatus(talentId);
            const current = talents.items.find((t) => t.id === talentId);
            const nextStatus = res.talent?.status ?? flippedRhAccountStatus(current?.status);
            setTalents((s) => ({
                ...s,
                items: s.items.map((t) => (t.id === talentId ? { ...t, status: nextStatus } : t)),
            }));
            return res;
        } catch (err) {
            throw err instanceof ApiError ? err : new ApiError(mapRhAccountsApiError(err, "patch-talent"));
        } finally {
            setTogglingIds((prev) => {
                const next = new Set(prev);
                next.delete(talentId);
                return next;
            });
        }
    }, [talents.items]);

    const managers = useMemo(
        () => staff.items.filter((u) => u.role === "manager"),
        [staff.items],
    );

    const counts = useMemo(
        () => ({
            staff: staff.items.length,
            talents: talents.items.length,
            deleted: deleted.items.length,
        }),
        [staff.items.length, talents.items.length, deleted.items.length],
    );

    return {
        staff,
        talents,
        deleted,
        managers,
        counts,
        mutating,
        togglingIds,
        retry,
        createStaff,
        createStaffFromExistingTalent,
        createTalent,
        removeStaff,
        removeTalent,
        updateStaffPassword,
        toggleStaffStatus,
        toggleTalentStatus,
        refreshStaff: loadStaff,
        refreshTalents: loadTalents,
        refreshDeleted: loadDeleted,
    };
}

/** Alias demandé par la spec intégration. */
export { useRhAccounts as useAccountsApi };
