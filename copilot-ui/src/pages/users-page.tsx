import { useCallback, useState } from "react";
import { Edit01, UserPlus01 } from "@untitledui/icons";
import { Heading } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { Table, TableCard } from "@/components/application/table/table";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Avatar } from "@/components/base/avatar/avatar";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import type { CreateUserInput, User, UserInput, UserRole, UserStatus } from "@/hooks/use-users";
import { useUsers } from "@/hooks/use-users";
import { cx } from "@/utils/cx";

const CREATE_ROLES: UserRole[] = ["manager", "talent"];
const FILTER_ROLES: UserRole[] = ["rh", "manager", "talent"];
const STATUSES: UserStatus[] = ["pending", "active", "disabled"];

const getInitials = (first: string, last: string) =>
    `${first.trim().charAt(0) || ""}${last.trim().charAt(0) || ""}`.toUpperCase() || "?";

export function UsersPage() {
    const { t } = useTranslation(["users", "common"]);
    useCopilotPage("users", t("users:title"));
    const {
        users,
        total: userCount,
        page,
        setPage,
        totalPages,
        search,
        setSearch,
        roleFilter,
        setRoleFilter,
        statusFilter,
        setStatusFilter,
        isLoading,
        error,
        saving,
        retry,
        createUser,
        updateUser,
        setUserStatus,
        resetUserPassword,
    } = useUsers();

    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<CreateUserInput>({
        firstName: "",
        lastName: "",
        email: "",
        role: "talent",
        status: "active",
        initialPassword: "",
        mustChangePassword: true,
        passwordValidityMonths: 6,
    });
    const [resetTarget, setResetTarget] = useState<User | null>(null);
    const [resetPassword, setResetPassword] = useState("");

    const openCreate = useCallback(() => {
        setFormMode("create");
        setEditingId(null);
        setDraft({
            firstName: "",
            lastName: "",
            email: "",
            role: "talent",
            status: "active",
            initialPassword: "",
            mustChangePassword: true,
            passwordValidityMonths: 6,
        });
        setFormOpen(true);
    }, []);

    const openEdit = useCallback((user: User) => {
        setFormMode("edit");
        setEditingId(user.id);
        setDraft({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            status: user.status,
            initialPassword: "",
            mustChangePassword: true,
            passwordValidityMonths: 6,
        });
        setFormOpen(true);
    }, []);

    const submitForm = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            try {
                if (formMode === "create") {
                    await createUser(draft);
                } else if (editingId) {
                    const payload: UserInput = {
                        firstName: draft.firstName,
                        lastName: draft.lastName,
                        email: draft.email,
                        role: draft.role,
                        status: draft.status,
                    };
                    await updateUser(editingId, payload);
                }
                setFormOpen(false);
            } catch {
                /* error surfaced via hook */
            }
        },
        [createUser, draft, editingId, formMode, updateUser],
    );

    const confirmResetPassword = useCallback(async () => {
        if (!resetTarget || !resetPassword.trim()) return;
        try {
            await resetUserPassword(resetTarget.id, resetPassword.trim(), true);
            setResetTarget(null);
            setResetPassword("");
        } catch {
            /* surfaced via hook */
        }
    }, [resetPassword, resetTarget, resetUserPassword]);

    const onPageChange = useCallback(
        (next: number) => setPage(Math.max(1, Math.min(totalPages, next))),
        [setPage, totalPages],
    );

    const roleFilterButtons: { label: string; value: "all" | UserRole }[] = [
        { label: t("filters.roleAll"), value: "all" },
        ...FILTER_ROLES.map((r) => ({ label: t(`roles.${r}`), value: r })),
    ];

    const statusFilterButtons: { label: string; value: "all" | UserStatus }[] = [
        { label: t("filters.statusAll"), value: "all" },
        ...STATUSES.map((s) => ({ label: t(`statuses.${s}`), value: s })),
    ];

    const roleItems = (formMode === "create" ? CREATE_ROLES : FILTER_ROLES).map((r) => ({
        id: r,
        label: t(`roles.${r}`),
    }));
    const statusItems = STATUSES.map((s) => ({ id: s, label: t(`statuses.${s}`) }));

    return (
        <div className="space-y-8">
            <header className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{t("eyebrow")}</p>
                        <h1 className="mt-1 text-display-xs font-semibold text-primary md:text-display-sm">{t("title")}</h1>
                        <p className="mt-2 text-md text-tertiary">{t("subtitle")}</p>
                    </div>
                    <Button color="primary" iconLeading={UserPlus01} onClick={openCreate}>
                        {t("addUser")}
                    </Button>
                </div>

                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Input
                        label={t("common:search")}
                        placeholder={t("searchPlaceholder")}
                        value={search}
                        onChange={setSearch}
                        className="max-w-md"
                    />
                    <span className="text-sm text-tertiary">{t("count", { count: userCount })}</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    {roleFilterButtons.map((b) => (
                        <Button
                            key={`role-${b.value}`}
                            size="sm"
                            color={roleFilter === b.value ? "primary" : "secondary"}
                            className={cx(roleFilter === b.value && "pointer-events-none")}
                            onClick={() => setRoleFilter(b.value)}
                        >
                            {b.label}
                        </Button>
                    ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                    {statusFilterButtons.map((b) => (
                        <Button
                            key={`status-${b.value}`}
                            size="sm"
                            color={statusFilter === b.value ? "primary" : "secondary"}
                            className={cx(statusFilter === b.value && "pointer-events-none")}
                            onClick={() => setStatusFilter(b.value)}
                        >
                            {b.label}
                        </Button>
                    ))}
                </div>
            </header>

            <UsersTableSection
                users={users}
                isLoading={isLoading}
                error={error}
                onRetry={retry}
                onEdit={openEdit}
                onToggleStatus={setUserStatus}
                onResetPassword={(u) => {
                    setResetTarget(u);
                    setResetPassword("");
                }}
                saving={saving}
                page={page}
                totalPages={totalPages}
                onPageChange={onPageChange}
                t={t}
            />

            <ModalOverlay isOpen={formOpen} onOpenChange={setFormOpen} isDismissable>
                <Modal>
                    <Dialog className="w-full max-w-lg p-4 sm:p-6">
                        <form
                            onSubmit={submitForm}
                            className="w-full max-w-lg rounded-2xl border border-secondary bg-primary p-6 shadow-xl ring-1 ring-secondary/80"
                        >
                            <Heading slot="title" className="text-lg font-semibold text-primary">
                                {formMode === "create" ? t("modal.createTitle") : t("modal.editTitle")}
                            </Heading>

                            <div className="mt-6 space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Input
                                        label={t("form.firstName")}
                                        value={draft.firstName}
                                        onChange={(v) => setDraft((d) => ({ ...d, firstName: v }))}
                                        isRequired
                                    />
                                    <Input
                                        label={t("form.lastName")}
                                        value={draft.lastName}
                                        onChange={(v) => setDraft((d) => ({ ...d, lastName: v }))}
                                        isRequired
                                    />
                                </div>
                                <Input
                                    label={t("form.email")}
                                    type="email"
                                    value={draft.email}
                                    onChange={(v) => setDraft((d) => ({ ...d, email: v }))}
                                    isRequired
                                    autoComplete="email"
                                />
                                <Select
                                    label={t("form.role")}
                                    selectedKey={draft.role}
                                    onSelectionChange={(key) =>
                                        key != null && setDraft((d) => ({ ...d, role: String(key) as UserRole }))
                                    }
                                    items={roleItems}
                                    size="md"
                                >
                                    {(item) => <Select.Item {...item} />}
                                </Select>
                                {formMode === "create" && (
                                    <Input
                                        label={t("form.initialPassword")}
                                        type="password"
                                        value={draft.initialPassword}
                                        onChange={(v) => setDraft((d) => ({ ...d, initialPassword: v }))}
                                        isRequired
                                        autoComplete="new-password"
                                    />
                                )}
                                <Select
                                    label={t("form.status")}
                                    selectedKey={draft.status}
                                    onSelectionChange={(key) =>
                                        key != null && setDraft((d) => ({ ...d, status: String(key) as UserStatus }))
                                    }
                                    items={statusItems}
                                    size="md"
                                >
                                    {(item) => <Select.Item {...item} />}
                                </Select>
                            </div>

                            <div className="mt-8 flex flex-wrap justify-end gap-3">
                                <Button type="button" color="secondary" onClick={() => setFormOpen(false)}>
                                    {t("buttons.cancel")}
                                </Button>
                                <Button type="submit" color="primary" isLoading={saving}>
                                    {formMode === "create" ? t("buttons.create") : t("buttons.save")}
                                </Button>
                            </div>
                        </form>
                    </Dialog>
                </Modal>
            </ModalOverlay>

            <ModalOverlay isOpen={resetTarget != null} onOpenChange={(open) => !open && setResetTarget(null)} isDismissable>
                <Modal>
                    <Dialog className="w-full max-w-md p-4 sm:p-6">
                        <div className="w-full max-w-md rounded-2xl border border-secondary bg-primary p-6 shadow-xl ring-1 ring-secondary/80">
                            <Heading slot="title" className="text-lg font-semibold text-primary">
                                {t("modal.resetPasswordTitle")}
                            </Heading>
                            <p className="mt-3 text-sm text-secondary">
                                {resetTarget &&
                                    t("modal.resetPasswordBody", {
                                        name: `${resetTarget.firstName} ${resetTarget.lastName}`.trim() || resetTarget.email,
                                    })}
                            </p>
                            <div className="mt-4">
                                <Input
                                    label={t("form.initialPassword")}
                                    type="password"
                                    value={resetPassword}
                                    onChange={setResetPassword}
                                    isRequired
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="mt-8 flex flex-wrap justify-end gap-3">
                                <Button type="button" color="secondary" onClick={() => setResetTarget(null)}>
                                    {t("buttons.cancel")}
                                </Button>
                                <Button
                                    type="button"
                                    color="primary"
                                    isLoading={saving}
                                    isDisabled={!resetPassword.trim()}
                                    onClick={confirmResetPassword}
                                >
                                    {t("buttons.resetPassword")}
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>

        </div>
    );
}

function UsersTableSection({
    users,
    isLoading,
    error,
    onRetry,
    onEdit,
    onToggleStatus,
    onResetPassword,
    saving,
    page,
    totalPages,
    onPageChange,
    t,
}: {
    users: User[];
    isLoading: boolean;
    error: string | null;
    onRetry: () => void;
    onEdit: (u: User) => void;
    onToggleStatus: (id: string, s: UserStatus) => void;
    onResetPassword: (u: User) => void;
    saving: boolean;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    t: (key: string, options?: Record<string, string | number>) => string;
}) {
    if (isLoading) {
        return (
            <TableCard.Root size="md">
                <TableCard.Header title={t("title")} description={t("subtitle")} />
                <div className="flex min-h-64 items-center justify-center bg-primary p-8">
                    <LoadingIndicator type="line-simple" size="md" label={t("table.loading")} />
                </div>
            </TableCard.Root>
        );
    }

    if (error) {
        return (
            <TableCard.Root size="md">
                <TableCard.Header title={t("title")} description={t("subtitle")} />
                <div className="bg-primary px-4 py-10 md:px-6">
                    <EmptyState size="md">
                        <EmptyState.Content>
                            <EmptyState.Title>{t("errors.load")}</EmptyState.Title>
                            <EmptyState.Description>{error}</EmptyState.Description>
                        </EmptyState.Content>
                        <EmptyState.Footer>
                            <Button color="secondary" onClick={onRetry}>
                                {t("common:retry")}
                            </Button>
                        </EmptyState.Footer>
                    </EmptyState>
                </div>
            </TableCard.Root>
        );
    }

    if (users.length === 0) {
        return (
            <TableCard.Root size="md">
                <TableCard.Header title={t("title")} description={t("subtitle")} />
                <div className="bg-primary px-4 py-10 md:px-6">
                    <EmptyState size="md">
                        <EmptyState.Header>
                            <EmptyState.FeaturedIcon color="gray" />
                        </EmptyState.Header>
                        <EmptyState.Content>
                            <EmptyState.Title>{t("table.empty")}</EmptyState.Title>
                        </EmptyState.Content>
                    </EmptyState>
                </div>
            </TableCard.Root>
        );
    }

    return (
        <TableCard.Root size="md">
            <TableCard.Header title={t("title")} description={t("subtitle")} />
            <Table aria-label={t("table.ariaLabel")} className="min-w-full">
                <Table.Header className="sticky top-0 z-10">
                    <Table.Head id="name" label={t("table.name")} />
                    <Table.Head id="email" label={t("table.email")} />
                    <Table.Head id="role" label={t("table.role")} />
                    <Table.Head id="status" label={t("table.status")} />
                    <Table.Head id="actions" label={t("table.actions")} />
                </Table.Header>
                <Table.Body items={users}>
                    {(user) => (
                        <Table.Row id={user.id}>
                            <Table.Cell>
                                <div className="flex items-center gap-3">
                                    <Avatar size="sm" initials={getInitials(user.firstName, user.lastName)} />
                                    <span className="font-medium text-primary">
                                        {`${user.firstName} ${user.lastName}`.trim() || user.email}
                                    </span>
                                </div>
                            </Table.Cell>
                            <Table.Cell>
                                <span className="text-sm text-secondary">{user.email}</span>
                            </Table.Cell>
                            <Table.Cell>
                                <span className="text-sm text-secondary">{t(`roles.${user.role}`)}</span>
                            </Table.Cell>
                            <Table.Cell>
                                <BadgeWithDot
                                    color={user.status === "active" ? "success" : user.status === "pending" ? "warning" : "gray"}
                                    type="pill-color"
                                    size="sm"
                                >
                                    {t(`statuses.${user.status}`)}
                                </BadgeWithDot>
                            </Table.Cell>
                            <Table.Cell>
                                <Dropdown.Root>
                                    <Dropdown.DotsButton aria-label={t("table.actions")} />
                                    <Dropdown.Popover className="w-min">
                                        <Dropdown.Menu>
                                            <Dropdown.Item
                                                icon={Edit01}
                                                label={t("actions.edit")}
                                                onAction={() => onEdit(user)}
                                            />
                                            <Dropdown.Item
                                                label={t("actions.resetPassword")}
                                                onAction={() => onResetPassword(user)}
                                            />
                                            <Dropdown.Separator />
                                            <Dropdown.Item
                                                label={
                                                    user.status === "disabled" ? t("actions.activate") : t("actions.deactivate")
                                                }
                                                onAction={() =>
                                                    onToggleStatus(user.id, user.status === "disabled" ? "active" : "disabled")
                                                }
                                                isDisabled={saving}
                                            />
                                        </Dropdown.Menu>
                                    </Dropdown.Popover>
                                </Dropdown.Root>
                            </Table.Cell>
                        </Table.Row>
                    )}
                </Table.Body>
            </Table>
            <PaginationCardMinimal page={page} total={totalPages} align="right" onPageChange={onPageChange} />
        </TableCard.Root>
    );
}
