import { Edit01, RefreshCw01, UserPlus01 } from "@untitledui/icons";
import { useEffect, useMemo, useState } from "react";
import { Heading } from "react-aria-components";
import { useSearchParams } from "react-router";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { Table, TableCard } from "@/components/application/table/table";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { ErrorState } from "@/components/ui/ErrorState";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import type { CreateUserRole, User, UserStatus } from "@/hooks/use-users";
import { useUsers } from "@/hooks/use-users";

export default function RhAccountsWorkspacePage() {
    useCopilotPage("none", "Comptes & accès");
    const [params, setParams] = useSearchParams();
    const {
        users,
        total,
        page,
        totalPages,
        setPage,
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
    } = useUsers({ pageSize: 50 });

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [resetOpenFor, setResetOpenFor] = useState<User | null>(null);
    const [editing, setEditing] = useState<User | null>(null);
    const [resetPassword, setResetPassword] = useState("");
    const [createError, setCreateError] = useState<string | null>(null);
    const [editError, setEditError] = useState<string | null>(null);
    const [resetError, setResetError] = useState<string | null>(null);
    const [enterpriseFilter, setEnterpriseFilter] = useState("all");
    const [connectionFilter, setConnectionFilter] = useState("all");
    const [expirationFilter, setExpirationFilter] = useState("all");

    const [createDraft, setCreateDraft] = useState({
        firstName: "",
        lastName: "",
        email: "",
        role: "manager" as CreateUserRole,
        password: "",
    });

    const [editDraft, setEditDraft] = useState({
        firstName: "",
        lastName: "",
        email: "",
        role: "manager" as "rh" | "manager" | "talent",
        status: "active" as UserStatus,
    });

    useEffect(() => {
        if (params.get("create") === "1") {
            setCreateOpen(true);
            const next = new URLSearchParams(params);
            next.delete("create");
            setParams(next, { replace: true });
        }
    }, [params, setParams]);

    const enterprises = useMemo(
        () =>
            Array.from(
                new Set(users.map((u) => (u.enterpriseName ?? u.enterpriseId ?? "").trim()).filter(Boolean)),
            ).sort((a, b) => a.localeCompare(b)),
        [users],
    );

    const filteredUsers = useMemo(() => {
        const now = Date.now();
        return users.filter((u) => {
            const enterpriseLabel = (u.enterpriseName ?? u.enterpriseId ?? "").trim();
            const matchesEnterprise = enterpriseFilter === "all" || enterpriseLabel === enterpriseFilter;
            const matchesConnection = connectionFilter === "all" || (u.onlineStatus ?? "unknown") === connectionFilter;
            const expiryTime = u.expiresAt ? new Date(u.expiresAt).getTime() : NaN;
            const isExpired = Number.isFinite(expiryTime) && expiryTime < now;
            const isSoon = Number.isFinite(expiryTime) && expiryTime >= now && expiryTime - now <= 1000 * 60 * 60 * 24 * 7;
            const matchesExpiration =
                expirationFilter === "all" ||
                (expirationFilter === "expired" && isExpired) ||
                (expirationFilter === "soon" && isSoon) ||
                (expirationFilter === "none" && !u.expiresAt);
            return matchesEnterprise && matchesConnection && matchesExpiration;
        });
    }, [users, enterpriseFilter, connectionFilter, expirationFilter]);

    const kpis = useMemo(() => {
        const now = Date.now();
        const expired = filteredUsers.filter((u) => {
            if (!u.expiresAt) return false;
            const ts = new Date(u.expiresAt).getTime();
            return Number.isFinite(ts) && ts < now;
        }).length;
        const online = filteredUsers.filter((u) => u.onlineStatus === "online").length;
        const pending = filteredUsers.filter((u) => u.status === "pending").length;
        const active = filteredUsers.filter((u) => u.status === "active").length;
        const actionRequired = filteredUsers.filter((u) => u.status === "pending" || u.status === "expired").length;
        return [
            { label: "Total comptes", value: total || filteredUsers.length },
            { label: "Comptes actifs", value: active },
            { label: "En attente", value: pending },
            { label: "Comptes expirés", value: expired },
            { label: "En ligne", value: online },
            { label: "Action requise", value: actionRequired },
        ];
    }, [filteredUsers, total]);

    const submitCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);
        try {
            await createUser({
                firstName: createDraft.firstName,
                lastName: createDraft.lastName,
                email: createDraft.email,
                role: createDraft.role,
                initialPassword: createDraft.password,
                mustChangePassword: true,
            });
            setCreateOpen(false);
            setCreateDraft({ firstName: "", lastName: "", email: "", role: "manager", password: "" });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Impossible de créer le compte.";
            setCreateError(msg);
        }
    };

    const openEdit = (user: User) => {
        setEditing(user);
        setEditDraft({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            status: user.status,
        });
        setEditOpen(true);
    };

    const submitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        setEditError(null);
        try {
            await updateUser(editing.id, editDraft);
            setEditOpen(false);
            setEditing(null);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Impossible de modifier ce compte.";
            setEditError(msg);
        }
    };

    const submitResetPassword = async () => {
        if (!resetOpenFor || !resetPassword.trim()) return;
        setResetError(null);
        try {
            await resetUserPassword(resetOpenFor.id, resetPassword.trim(), true);
            setResetOpenFor(null);
            setResetPassword("");
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Impossible de réinitialiser le mot de passe.";
            setResetError(msg);
        }
    };

    const resetFilters = () => {
        setRoleFilter("all");
        setStatusFilter("all");
        setEnterpriseFilter("all");
        setConnectionFilter("all");
        setExpirationFilter("all");
        setSearch("");
    };

    const roleBadge = (role: User["role"]) => (
        <BadgeWithDot color={role === "rh" ? "brand" : role === "manager" ? "warning" : "success"} type="pill-color" size="sm">
            {role === "rh" ? "RH" : role === "manager" ? "Manager" : "Talent"}
        </BadgeWithDot>
    );

    const statusBadge = (status: User["status"]) => (
        <BadgeWithDot
            color={status === "active" ? "success" : status === "pending" ? "warning" : status === "expired" ? "error" : "gray"}
            type="pill-color"
            size="sm"
        >
            {status === "active"
                ? "Active"
                : status === "pending"
                  ? "Pending"
                  : status === "expired"
                    ? "Expired"
                    : "Disabled"}
        </BadgeWithDot>
    );

    const connectionBadge = (online: User["onlineStatus"]) => {
        const state = online ?? "unknown";
        return (
            <BadgeWithDot color={state === "online" ? "success" : state === "offline" ? "gray" : "warning"} type="pill-color" size="sm">
                {state === "online" ? "En ligne" : state === "offline" ? "Hors ligne" : "Inconnu"}
            </BadgeWithDot>
        );
    };

    const formatDate = (value: string | undefined) => {
        if (!value) return "Non défini";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleString("fr-FR");
    };

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow="Comptes"
            title="Comptes & accès"
            description="Créez, gérez et supervisez les comptes des managers et talents."
            actions={
                <div className="flex gap-2">
                    <Button color="secondary" size="sm" iconLeading={RefreshCw01} onClick={retry}>
                        Actualiser
                    </Button>
                    <Button color="primary" size="sm" iconLeading={UserPlus01} onClick={() => setCreateOpen(true)}>
                        Ajouter un utilisateur
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                {isLoading ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={`kpi-skeleton-${i}`} className="h-24 animate-pulse rounded-2xl border border-secondary bg-secondary/40" />
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {kpis.map((kpi) => (
                            <div key={kpi.label} className="rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80">
                                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{kpi.label}</p>
                                <p className="mt-2 text-display-xs font-semibold text-primary">{kpi.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80">
                    <div className="flex flex-wrap items-end gap-3">
                        <Input
                            label="Recherche"
                            placeholder="Nom ou e-mail"
                            value={search}
                            onChange={setSearch}
                            className="min-w-[220px] max-w-md"
                        />
                        <Select
                            label="Rôle"
                            selectedKey={roleFilter}
                            onSelectionChange={(key) => key && setRoleFilter(String(key) as "all" | "rh" | "manager" | "talent")}
                            items={[
                                { id: "all", label: "Tous" },
                                { id: "rh", label: "RH" },
                                { id: "manager", label: "Manager" },
                                { id: "talent", label: "Talent" },
                            ]}
                            size="md"
                        >
                            {(item) => <Select.Item {...item} />}
                        </Select>
                        <Select
                            label="Statut"
                            selectedKey={statusFilter}
                            onSelectionChange={(key) => key && setStatusFilter(String(key) as "all" | UserStatus)}
                            items={[
                                { id: "all", label: "Tous" },
                                { id: "pending", label: "Pending" },
                                { id: "active", label: "Active" },
                                { id: "disabled", label: "Disabled" },
                                { id: "expired", label: "Expired" },
                            ]}
                            size="md"
                        >
                            {(item) => <Select.Item {...item} />}
                        </Select>
                        <Select
                            label="Entreprise"
                            selectedKey={enterpriseFilter}
                            onSelectionChange={(key) => key && setEnterpriseFilter(String(key))}
                            items={[{ id: "all", label: "Toutes" }, ...enterprises.map((e) => ({ id: e, label: e }))]}
                            size="md"
                        >
                            {(item) => <Select.Item {...item} />}
                        </Select>
                        <Select
                            label="Connexion"
                            selectedKey={connectionFilter}
                            onSelectionChange={(key) => key && setConnectionFilter(String(key))}
                            items={[
                                { id: "all", label: "Tous" },
                                { id: "online", label: "En ligne" },
                                { id: "offline", label: "Hors ligne" },
                                { id: "unknown", label: "Inconnu" },
                            ]}
                            size="md"
                        >
                            {(item) => <Select.Item {...item} />}
                        </Select>
                        <Select
                            label="Expiration"
                            selectedKey={expirationFilter}
                            onSelectionChange={(key) => key && setExpirationFilter(String(key))}
                            items={[
                                { id: "all", label: "Toutes" },
                                { id: "expired", label: "Expiré" },
                                { id: "soon", label: "Bientôt" },
                                { id: "none", label: "Non définie" },
                            ]}
                            size="md"
                        >
                            {(item) => <Select.Item {...item} />}
                        </Select>
                        <Button color="secondary" size="sm" onClick={resetFilters}>
                            Reset filtres
                        </Button>
                        <span className="text-sm text-tertiary">{filteredUsers.length} résultat(s)</span>
                    </div>
                </div>

                {error ? (
                    <ErrorState
                        title="Impossible de charger les comptes"
                        message="Le chargement a échoué. Vérifiez votre session RH et la réponse backend."
                        detail={error}
                        onRetry={retry}
                        retryLabel="Réessayer"
                        className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80"
                    />
                ) : null}

                {!error ? (
                    <TableCard.Root size="md">
                        <TableCard.Header title="Comptes utilisateurs" description="Gestion des identités et accès." />
                        {isLoading ? (
                            <div className="h-56 animate-pulse bg-secondary/30" />
                        ) : filteredUsers.length === 0 ? (
                            <div className="bg-primary px-4 py-10 md:px-6">
                                <EmptyState size="md">
                                    <EmptyState.Header>
                                        <EmptyState.FeaturedIcon color="gray" />
                                    </EmptyState.Header>
                                    <EmptyState.Content>
                                        <EmptyState.Title>Aucun compte correspondant.</EmptyState.Title>
                                    </EmptyState.Content>
                                </EmptyState>
                            </div>
                        ) : (
                            <>
                                <Table aria-label="Comptes et accès RH" className="min-w-full">
                                    <Table.Header className="sticky top-0 z-10">
                                        <Table.Head id="user" label="Utilisateur" />
                                        <Table.Head id="enterprise" label="Entreprise" />
                                        <Table.Head id="role" label="Rôle" />
                                        <Table.Head id="status" label="Statut" />
                                        <Table.Head id="connection" label="Connexion" />
                                        <Table.Head id="activity" label="Dernière activité" />
                                        <Table.Head id="expiration" label="Expiration" />
                                        <Table.Head id="actions" label="Actions" />
                                    </Table.Header>
                                    <Table.Body items={filteredUsers}>
                                        {(user) => (
                                            <Table.Row id={user.id}>
                                                <Table.Cell>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-primary">
                                                            {[user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email}
                                                        </p>
                                                        <p className="truncate text-xs text-tertiary">{user.email}</p>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell>{user.enterpriseName ?? user.enterpriseId ?? "Non disponible"}</Table.Cell>
                                                <Table.Cell>{roleBadge(user.role)}</Table.Cell>
                                                <Table.Cell>{statusBadge(user.status)}</Table.Cell>
                                                <Table.Cell>{connectionBadge(user.onlineStatus)}</Table.Cell>
                                                <Table.Cell>{user.lastActivityAt ? formatDate(user.lastActivityAt) : "Jamais connecté"}</Table.Cell>
                                                <Table.Cell>{formatDate(user.expiresAt)}</Table.Cell>
                                                <Table.Cell>
                                                    <Dropdown.Root>
                                                        <Dropdown.DotsButton aria-label="Actions" />
                                                        <Dropdown.Popover className="w-min">
                                                            <Dropdown.Menu>
                                                                <Dropdown.Item icon={Edit01} label="Modifier" onAction={() => openEdit(user)} />
                                                                <Dropdown.Item
                                                                    label="Réinitialiser mot de passe"
                                                                    onAction={() => setResetOpenFor(user)}
                                                                />
                                                                <Dropdown.Separator />
                                                                <Dropdown.Item
                                                                    label={user.status === "disabled" ? "Activer" : "Désactiver"}
                                                                    onAction={() =>
                                                                        setUserStatus(user.id, user.status === "disabled" ? "active" : "disabled")
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
                                <PaginationCardMinimal page={page} total={totalPages} align="right" onPageChange={setPage} />
                            </>
                        )}
                    </TableCard.Root>
                ) : null}
            </div>

            <ModalOverlay
                isOpen={createOpen}
                onOpenChange={(open) => {
                    setCreateOpen(open);
                    if (!open) setCreateError(null);
                }}
                isDismissable
            >
                <Modal>
                    <Dialog className="w-full max-w-lg p-4 sm:p-6">
                        <form onSubmit={submitCreate} className="rounded-2xl border border-secondary bg-primary p-6 shadow-xl ring-1 ring-secondary/80">
                            <Heading slot="title" className="text-lg font-semibold text-primary">
                                Ajouter un utilisateur
                            </Heading>
                            <div className="mt-5 space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Input label="Prénom" value={createDraft.firstName} onChange={(v) => setCreateDraft((d) => ({ ...d, firstName: v }))} isRequired />
                                    <Input label="Nom" value={createDraft.lastName} onChange={(v) => setCreateDraft((d) => ({ ...d, lastName: v }))} isRequired />
                                </div>
                                <Input
                                    label="E-mail"
                                    type="email"
                                    value={createDraft.email}
                                    onChange={(v) => setCreateDraft((d) => ({ ...d, email: v }))}
                                    isRequired
                                />
                                <Select
                                    label="Rôle"
                                    selectedKey={createDraft.role}
                                    onSelectionChange={(key) => key && setCreateDraft((d) => ({ ...d, role: String(key) as CreateUserRole }))}
                                    items={[
                                        { id: "manager", label: "Manager" },
                                        { id: "talent", label: "Talent" },
                                    ]}
                                    size="md"
                                >
                                    {(item) => <Select.Item {...item} />}
                                </Select>
                                <Input
                                    label="Mot de passe initial"
                                    type="password"
                                    value={createDraft.password}
                                    onChange={(v) => setCreateDraft((d) => ({ ...d, password: v }))}
                                    isRequired
                                />
                                {createError ? (
                                    <p className="rounded-lg border border-error-secondary bg-error-primary/10 px-3 py-2 text-sm text-error-primary">
                                        {createError}
                                    </p>
                                ) : null}
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <Button type="button" color="secondary" onClick={() => setCreateOpen(false)}>
                                    Annuler
                                </Button>
                                <Button type="submit" color="primary" isLoading={saving}>
                                    Créer
                                </Button>
                            </div>
                        </form>
                    </Dialog>
                </Modal>
            </ModalOverlay>

            <ModalOverlay
                isOpen={editOpen}
                onOpenChange={(open) => {
                    setEditOpen(open);
                    if (!open) setEditError(null);
                }}
                isDismissable
            >
                <Modal>
                    <Dialog className="w-full max-w-lg p-4 sm:p-6">
                        <form onSubmit={submitEdit} className="rounded-2xl border border-secondary bg-primary p-6 shadow-xl ring-1 ring-secondary/80">
                            <Heading slot="title" className="text-lg font-semibold text-primary">
                                Modifier le compte
                            </Heading>
                            <div className="mt-5 space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Input label="Prénom" value={editDraft.firstName} onChange={(v) => setEditDraft((d) => ({ ...d, firstName: v }))} isRequired />
                                    <Input label="Nom" value={editDraft.lastName} onChange={(v) => setEditDraft((d) => ({ ...d, lastName: v }))} isRequired />
                                </div>
                                <Input label="E-mail" type="email" value={editDraft.email} onChange={(v) => setEditDraft((d) => ({ ...d, email: v }))} isRequired />
                                <Select
                                    label="Rôle"
                                    selectedKey={editDraft.role}
                                    onSelectionChange={(key) =>
                                        key && setEditDraft((d) => ({ ...d, role: String(key) as "rh" | "manager" | "talent" }))
                                    }
                                    items={[
                                        { id: "rh", label: "RH" },
                                        { id: "manager", label: "Manager" },
                                        { id: "talent", label: "Talent" },
                                    ]}
                                    size="md"
                                >
                                    {(item) => <Select.Item {...item} />}
                                </Select>
                                <Select
                                    label="Statut"
                                    selectedKey={editDraft.status}
                                    onSelectionChange={(key) => key && setEditDraft((d) => ({ ...d, status: String(key) as UserStatus }))}
                                    items={[
                                        { id: "pending", label: "Pending" },
                                        { id: "active", label: "Active" },
                                        { id: "disabled", label: "Disabled" },
                                        { id: "expired", label: "Expired" },
                                    ]}
                                    size="md"
                                >
                                    {(item) => <Select.Item {...item} />}
                                </Select>
                                {editError ? (
                                    <p className="rounded-lg border border-error-secondary bg-error-primary/10 px-3 py-2 text-sm text-error-primary">
                                        {editError}
                                    </p>
                                ) : null}
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <Button type="button" color="secondary" onClick={() => setEditOpen(false)}>
                                    Annuler
                                </Button>
                                <Button type="submit" color="primary" isLoading={saving}>
                                    Enregistrer
                                </Button>
                            </div>
                        </form>
                    </Dialog>
                </Modal>
            </ModalOverlay>

            <ModalOverlay
                isOpen={resetOpenFor != null}
                onOpenChange={(open) => {
                    if (!open) {
                        setResetOpenFor(null);
                        setResetError(null);
                    }
                }}
                isDismissable
            >
                <Modal>
                    <Dialog className="w-full max-w-md p-4 sm:p-6">
                        <div className="rounded-2xl border border-secondary bg-primary p-6 shadow-xl ring-1 ring-secondary/80">
                            <Heading slot="title" className="text-lg font-semibold text-primary">
                                Réinitialiser mot de passe
                            </Heading>
                            <p className="mt-2 text-sm text-secondary">
                                Définissez un nouveau mot de passe initial pour {resetOpenFor?.email ?? "cet utilisateur"}.
                            </p>
                            <div className="mt-4">
                                <Input
                                    label="Nouveau mot de passe"
                                    type="password"
                                    value={resetPassword}
                                    onChange={setResetPassword}
                                    isRequired
                                />
                                {resetError ? (
                                    <p className="mt-3 rounded-lg border border-error-secondary bg-error-primary/10 px-3 py-2 text-sm text-error-primary">
                                        {resetError}
                                    </p>
                                ) : null}
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <Button type="button" color="secondary" onClick={() => setResetOpenFor(null)}>
                                    Annuler
                                </Button>
                                <Button type="button" color="primary" isLoading={saving} isDisabled={!resetPassword.trim()} onClick={submitResetPassword}>
                                    Réinitialiser
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </WorkspacePageShell>
    );
}
