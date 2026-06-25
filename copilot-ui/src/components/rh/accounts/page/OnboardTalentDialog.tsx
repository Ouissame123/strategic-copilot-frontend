import { useCallback, useEffect, useRef, useState } from "react";
import { Heading } from "react-aria-components";
import { Link2, UserPlus, X } from "lucide-react";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import {
    ExistingTalentForm,
    type ExistingTalentFormHandle,
} from "@/components/rh/accounts/page/ExistingTalentForm";
import {
    NEW_TALENT_INITIAL_FORM,
    NewTalentOnboardForm,
    type NewTalentFormHandle,
    type NewTalentFormValues,
} from "@/components/rh/accounts/page/NewTalentOnboardForm";
import { ONBOARD_DESCRIPTIONS, OnboardSuccessPanel } from "@/components/rh/accounts/page/onboard-portal-shared";
import { Button } from "@/components/base/buttons/button";
import { useOnboardTalent } from "@/hooks/useOnboardTalent";
import type { OnboardTalentPayload, OnboardTalentResponse } from "@/types/talent-onboard";
import { cx } from "@/utils/cx";

type OnboardMode = "new" | "existing";

type OnboardTalentDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialMode?: OnboardMode;
    initialTalentId?: string | null;
};

type SuccessState = {
    response: OnboardTalentResponse;
    password: string;
};

export function OnboardTalentDialog({
    open,
    onOpenChange,
    initialMode = "new",
    initialTalentId = null,
}: OnboardTalentDialogProps) {
    const nameRef = useRef<HTMLInputElement>(null);
    const newFormRef = useRef<NewTalentFormHandle>(null);
    const existingFormRef = useRef<ExistingTalentFormHandle>(null);
    const onboardMutation = useOnboardTalent();

    const [mode, setMode] = useState<OnboardMode>("new");
    const [form, setForm] = useState<NewTalentFormValues>(NEW_TALENT_INITIAL_FORM);
    const [grantPending, setGrantPending] = useState(false);
    const [newFormValid, setNewFormValid] = useState(false);
    const [existingFormValid, setExistingFormValid] = useState(false);
    const [success, setSuccess] = useState<SuccessState | null>(null);

    const isBusy = onboardMutation.isPending || grantPending;
    const isFormValid = mode === "new" ? newFormValid : existingFormValid;
    const submitLabel = mode === "new" ? "Créer le talent" : "Donner accès portail";

    const handleGrantPendingChange = useCallback((pending: boolean) => {
        setGrantPending(pending);
    }, []);

    useEffect(() => {
        if (!open) {
            setMode("new");
            setForm(NEW_TALENT_INITIAL_FORM);
            setGrantPending(false);
            setNewFormValid(false);
            setExistingFormValid(false);
            setSuccess(null);
            return;
        }
        setMode(initialMode);
        if (initialMode === "new") {
            const frame = requestAnimationFrame(() => nameRef.current?.focus());
            const formResetKey = `${open}-${mode}`;

    return () => cancelAnimationFrame(frame);
        }
        return undefined;
    }, [open, initialMode]);

    const handleClose = () => {
        if (isBusy && !success) return;
        onOpenChange(false);
    };

    const handleNewTalentSubmit = (payload: OnboardTalentPayload) => {
        onboardMutation.mutate(payload, {
            onSuccess: (response) => {
                setGrantPending(false);
                setSuccess({ response, password: payload.password });
            },
        });
    };

    const handleExistingSuccess = (response: OnboardTalentResponse, password: string) => {
        setGrantPending(false);
        setSuccess({ response, password });
    };

    const handleReset = () => {
        setSuccess(null);
        setForm(NEW_TALENT_INITIAL_FORM);
        setMode("new");
        requestAnimationFrame(() => nameRef.current?.focus());
    };

    const handleSubmit = () => {
        if (mode === "new") {
            newFormRef.current?.submit();
        } else {
            existingFormRef.current?.submit();
        }
    };

    const formResetKey = `${open}-${mode}`;

    return (
        <ModalOverlay isOpen={open} onOpenChange={(next) => !next && handleClose()} isDismissable={!!success || !isBusy}>
            <Modal>
                <Dialog className="w-full max-w-[560px] p-0">
                    <div className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl border border-secondary bg-primary shadow-xl ring-1 ring-secondary/80">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isBusy && !success}
                            className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-tertiary transition hover:bg-secondary_subtle hover:text-primary"
                            aria-label="Fermer"
                        >
                            <X className="size-4" />
                        </button>

                        {success ? (
                            <OnboardSuccessPanel
                                response={success.response}
                                password={success.password}
                                onClose={handleClose}
                                onReset={handleReset}
                                resetLabel={
                                    success.response.operation === "grant_access"
                                        ? "Donner accès à un autre"
                                        : "Créer un autre talent"
                                }
                            />
                        ) : (
                            <>
                                <header className="shrink-0 border-b border-secondary px-6 pb-4 pt-6 pr-12">
                                    <Heading slot="title" className="text-base font-semibold text-primary">
                                        Donner accès au portail talent
                                    </Heading>
                                    <p className="mt-1 text-sm text-secondary">{ONBOARD_DESCRIPTIONS[mode]}</p>
                                </header>

                                <div className="shrink-0 px-6 pb-2 pt-3">
                                    <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary_subtle p-1">
                                        <button
                                            type="button"
                                            onClick={() => setMode("new")}
                                            disabled={isBusy}
                                            className={cx(
                                                "inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition sm:text-sm",
                                                mode === "new"
                                                    ? "bg-primary font-medium text-primary shadow-sm"
                                                    : "text-tertiary hover:text-primary",
                                            )}
                                        >
                                            <UserPlus className="size-3.5" />
                                            Nouveau talent
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMode("existing")}
                                            disabled={isBusy}
                                            className={cx(
                                                "inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition sm:text-sm",
                                                mode === "existing"
                                                    ? "bg-primary font-medium text-primary shadow-sm"
                                                    : "text-tertiary hover:text-primary",
                                            )}
                                        >
                                            <Link2 className="size-3.5" />
                                            Talent existant
                                        </button>
                                    </div>
                                </div>

                                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                                    {mode === "new" ? (
                                        <NewTalentOnboardForm
                                            ref={newFormRef}
                                            form={form}
                                            onFormChange={setForm}
                                            isBusy={isBusy}
                                            resetKey={formResetKey}
                                            nameInputRef={nameRef}
                                            onSubmit={handleNewTalentSubmit}
                                            onValidChange={setNewFormValid}
                                        />
                                    ) : (
                                        <ExistingTalentForm
                                            ref={existingFormRef}
                                            isBusy={isBusy}
                                            resetKey={open}
                                            onSuccess={handleExistingSuccess}
                                            onPendingChange={handleGrantPendingChange}
                                            onValidChange={setExistingFormValid}
                                            initialTalentId={initialTalentId}
                                        />
                                    )}
                                </div>

                                <footer className="flex shrink-0 justify-end gap-3 border-t border-secondary px-6 py-4">
                                    <Button type="button" color="secondary" isDisabled={isBusy} onClick={handleClose}>
                                        Annuler
                                    </Button>
                                    <Button
                                        type="button"
                                        color="primary"
                                        isLoading={isBusy}
                                        isDisabled={!isFormValid || isBusy}
                                        onClick={handleSubmit}
                                    >
                                        {submitLabel}
                                    </Button>
                                </footer>
                            </>
                        )}
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
