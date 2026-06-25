import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { NativeSelect } from "@/components/base/select/select-native";
import { generateInitialPassword } from "@/hooks/useOnboardTalent";
import { useGrantPortalAccess } from "@/hooks/useGrantPortalAccess";
import { useUnlinkedTalents } from "@/hooks/useUnlinkedTalents";
import type { OnboardTalentResponse } from "@/types/talent-onboard";
import {
    CompactTalentPreview,
    FieldError,
    FieldLabel,
    ONBOARD_INPUT_COMPACT_CLASS,
    PasswordField,
    useVisibleErrors,
    validateGrantFields,
} from "./onboard-portal-shared";

export type ExistingTalentFormHandle = {
    submit: () => void;
    isValid: boolean;
};

type ExistingTalentFormProps = {
    isBusy: boolean;
    resetKey?: string;
    onSuccess: (data: OnboardTalentResponse, password: string) => void;
    onPendingChange?: (pending: boolean) => void;
    onValidChange?: (valid: boolean) => void;
    initialTalentId?: string | null;
};

export const ExistingTalentForm = forwardRef<ExistingTalentFormHandle, ExistingTalentFormProps>(
    function ExistingTalentForm(
        {
            isBusy: parentBusy,
            resetKey,
            onSuccess,
            onPendingChange,
            onValidChange,
            initialTalentId = null,
        },
        ref,
    ) {
        const grant = useGrantPortalAccess();

        const [search, setSearch] = useState("");
        const [debouncedSearch, setDebouncedSearch] = useState("");
        const [selectedTalentId, setSelectedTalentId] = useState("");
        const [password, setPassword] = useState("");
        const [touched, setTouched] = useState<Record<string, boolean>>({});
        const [submitAttempted, setSubmitAttempted] = useState(false);

        useEffect(() => {
            const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
            return () => window.clearTimeout(t);
        }, [search]);

        useEffect(() => {
            if (initialTalentId) setSelectedTalentId(initialTalentId);
        }, [initialTalentId]);

        useEffect(() => {
            onPendingChange?.(grant.isPending);
        }, [grant.isPending, onPendingChange]);

        useEffect(() => () => onPendingChange?.(false), [onPendingChange]);

        useEffect(() => {
            setSearch("");
            setDebouncedSearch("");
            setSelectedTalentId(initialTalentId ?? "");
            setPassword("");
            setTouched({});
            setSubmitAttempted(false);
        }, [resetKey, initialTalentId]);

        const unlinkedQuery = useUnlinkedTalents({ search: debouncedSearch, limit: 200 }, true);

        const talents = unlinkedQuery.data?.items ?? unlinkedQuery.data?.talents ?? [];
        const unlinkedCount = unlinkedQuery.data?.count;

        const selectedTalent = useMemo(
            () => talents.find((t) => t.talent_id === selectedTalentId) ?? null,
            [talents, selectedTalentId],
        );

        const errors = useMemo(
            () => validateGrantFields(selectedTalentId, password),
            [selectedTalentId, password],
        );
        const isValid = Object.keys(errors).length === 0;
        const showError = useVisibleErrors(errors, touched, submitAttempted);
        const isBusy = parentBusy || grant.isPending;

        useEffect(() => {
            onValidChange?.(isValid);
        }, [isValid, onValidChange]);

        const talentOptions = useMemo(() => {
            const base = [{ label: "Sélectionner un talent…", value: "" }];
            if (unlinkedQuery.isLoading) {
                return [{ label: "Chargement…", value: "", disabled: true }];
            }
            if (talents.length === 0) {
                return [{ label: "✨ Tous les talents ont déjà un compte", value: "", disabled: true }];
            }
            return [
                ...base,
                ...talents.map((t) => ({
                    label: `${t.name} — ${t.email}`,
                    value: t.talent_id,
                })),
            ];
        }, [talents, unlinkedQuery.isLoading]);

        const searchPlaceholder =
            typeof unlinkedCount === "number"
                ? `Rechercher parmi ${unlinkedCount} talent(s)…`
                : "Nom, email ou poste…";

        const touch = useCallback((field: string) => {
            setTouched((prev) => ({ ...prev, [field]: true }));
        }, []);

        const handleSubmit = useCallback(() => {
            setSubmitAttempted(true);
            if (!isValid || !selectedTalentId) return;
            grant.mutate(
                { talent_id: selectedTalentId, password },
                { onSuccess: (data) => onSuccess(data, password) },
            );
        }, [grant, isValid, onSuccess, password, selectedTalentId]);

        useImperativeHandle(ref, () => ({ submit: handleSubmit, isValid }), [handleSubmit, isValid]);

        return (
            <div className="space-y-3">
                <div className="space-y-1">
                    <FieldLabel htmlFor="existing-talent-search" required compact>
                        Rechercher un talent
                    </FieldLabel>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-tertiary" />
                        <input
                            id="existing-talent-search"
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            disabled={isBusy}
                            placeholder={searchPlaceholder}
                            className={ONBOARD_INPUT_COMPACT_CLASS + " pl-8"}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <FieldLabel htmlFor="existing-talent-select" required compact>
                        Sélectionner un talent
                    </FieldLabel>
                    <NativeSelect
                        id="existing-talent-select"
                        value={selectedTalentId}
                        onChange={(e) => setSelectedTalentId(e.target.value)}
                        onBlur={() => touch("talent")}
                        disabled={isBusy || unlinkedQuery.isLoading}
                        options={talentOptions}
                        selectClassName={
                            showError("talent") ? "!h-9 !py-1.5 !text-sm ring-1 ring-error-primary" : "!h-9 !py-1.5 !text-sm"
                        }
                    />
                    <FieldError message={showError("talent")} />
                </div>

                {selectedTalent ? <CompactTalentPreview talent={selectedTalent} /> : null}

                <PasswordField
                    id="existing-talent-password"
                    value={password}
                    onChange={setPassword}
                    onBlur={() => touch("password")}
                    onGenerate={() => setPassword(generateInitialPassword())}
                    disabled={isBusy}
                    error={showError("password")}
                />
            </div>
        );
    },
);
