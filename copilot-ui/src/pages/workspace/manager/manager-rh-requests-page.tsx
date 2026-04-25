import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { InfoCircle, Plus } from "@untitledui/icons";
import type { PostRhActionBody, RhActionRequestType } from "@/api/rh-actions.api";
import { getManagerWorkspaceProjects, parseManagerWorkspaceProjectsResponse } from "@/api/workspace-manager.api";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { usePatchRhActionMutation, usePostRhActionMutation, useRhActionsListQuery } from "@/hooks/use-rh-actions-query";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { ApiError } from "@/api/errors";
import { rowsFromRhActionsPayload } from "@/utils/rh-actions-list";
import { cx } from "@/utils/cx";

type RhTab = "all" | "pending" | "accepted" | "refused";

function normalizeStatus(raw: unknown): "pending" | "accepted" | "refused" | "unknown" {
    const s = String(raw ?? "")
        .trim()
        .toLowerCase();
    if (!s) return "unknown";
    if (s.includes("pend") || s.includes("attente") || s === "open" || s === "submitted" || s === "new") return "pending";
    if (s.includes("accept") || s.includes("approved") || s.includes("valid") || s.includes("done") || s.includes("closed"))
        return "accepted";
    if (s.includes("refus") || s.includes("reject") || s.includes("declin") || s.includes("cancel")) return "refused";
    return "unknown";
}

function formatRelativeFr(ts: unknown): string {
    if (ts == null || String(ts).trim() === "") return "—";
    const d = new Date(String(ts));
    if (Number.isNaN(d.getTime())) return "—";
    const diffMs = Date.now() - d.getTime();
    const diffM = Math.floor(diffMs / 60000);
    if (diffM < 1) return "à l’instant";
    if (diffM < 60) return `il y a ${diffM} min`;
    const diffH = Math.floor(diffM / 60);
    if (diffH < 24) return `il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `il y a ${diffD} jour${diffD > 1 ? "s" : ""}`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function projectLabel(row: Record<string, unknown>): string {
    const name = row.project_name ?? row.project_title ?? row.name;
    if (typeof name === "string" && name.trim()) return name.trim();
    const id = row.project_id ?? row.project;
    return String(id ?? "—");
}

function typeLabel(raw: unknown): string {
    const s = String(raw ?? "").trim();
    const map: Record<string, string> = {
        skill_gap: "Skill gap",
        reallocation: "Réaffectation de talent",
        training: "Demander une formation",
        overload: "Signaler une surcharge",
        recruitment: "Recrutement",
    };
    return map[s] || (s || "—");
}

function priorityBadge(raw: unknown): { label: string; color: "error" | "warning" | "gray" } {
    const s = String(raw ?? "")
        .trim()
        .toLowerCase();
    if (s.includes("urgent") || s === "high" || s === "haute") return { label: "Urgent", color: "error" };
    if (s.includes("faible") || s.includes("low") || s === "basse") return { label: "Faible", color: "gray" };
    if (s.includes("normal") || s === "medium" || s === "moyenne") return { label: "Normal", color: "warning" };
    if (!s) return { label: "—", color: "gray" };
    return { label: String(raw), color: "warning" };
}

function statusBadge(st: "pending" | "accepted" | "refused" | "unknown"): { label: string; color: "warning" | "success" | "error" | "gray" } {
    if (st === "pending") return { label: "En attente", color: "warning" };
    if (st === "accepted") return { label: "Acceptée", color: "success" };
    if (st === "refused") return { label: "Refusée", color: "error" };
    return { label: "—", color: "gray" };
}

function resolveRhActionId(row: Record<string, unknown>): string {
    // IDs explicitement métier pour PATCH /api/rh/actions/:id.
    const candidates = [row.id, row.action_id, row.rh_action_id, row.request_id];
    for (const value of candidates) {
        const id = String(value ?? "").trim();
        if (UUID_REGEX.test(id)) return id;
    }
    return "";
}

const REQUEST_TYPES: { value: RhActionRequestType; label: string }[] = [
    { value: "reallocation", label: "Réaffectation de talent" },
    { value: "overload", label: "Signaler une surcharge" },
    { value: "training", label: "Demander une formation" },
    { value: "recruitment", label: "Recrutement" },
    { value: "skill_gap", label: "Skill gap" },
];

const PRIORITIES: { value: PostRhActionBody["priority"]; label: string }[] = [
    { value: "urgent", label: "Urgent" },
    { value: "normal", label: "Normal" },
    { value: "low", label: "Faible" },
];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ManagerRhRequestsPage() {
    const { t } = useTranslation(["common", "nav"]);
    const { user } = useAuth();
    const { push: toast } = useToast();
    useCopilotPage("none", t("nav:managerNavRhRequests"));

    const q = useRhActionsListQuery();
    const postRh = usePostRhActionMutation();
    const patchRh = usePatchRhActionMutation();

    const [tab, setTab] = useState<RhTab>("all");
    const [type, setType] = useState<RhActionRequestType | "">("");
    const [projectId, setProjectId] = useState("");
    const [priority, setPriority] = useState<NonNullable<PostRhActionBody["priority"]> | "">("");
    const [description, setDescription] = useState("");
    const [detailRow, setDetailRow] = useState<(Record<string, unknown> & { id: string }) | null>(null);
    const rows = useMemo(() => rowsFromRhActionsPayload(q.data), [q.data]);
    const enterpriseId = useMemo(
        () => (user?.enterpriseId ?? (import.meta.env.VITE_MANAGER_ENTERPRISE_ID as string | undefined) ?? "").trim(),
        [user?.enterpriseId],
    );
    const managerProjectsQuery = useQuery({
        queryKey: ["manager-projects-select", enterpriseId],
        queryFn: async () => {
            const raw = await getManagerWorkspaceProjects({ enterprise_id: enterpriseId, page: 1, limit: 50 });
            return parseManagerWorkspaceProjectsResponse(raw);
        },
        enabled: Boolean(enterpriseId),
    });
    const projectOptions = useMemo(() => {
        const items = managerProjectsQuery.data?.items ?? [];
        return items
            .map((item, idx) => {
                const id = String(item.id ?? item.project_id ?? "").trim();
                if (!id) return null;
                const name = String(item.name ?? item.project_name ?? `Projet ${idx + 1}`).trim();
                const code = String(item.project_code ?? "").trim();
                return { id, label: `${name} · ${code || id.slice(0, 8)}` };
            })
            .filter((x): x is { id: string; label: string } => x != null);
    }, [managerProjectsQuery.data?.items]);

    const counts = useMemo(() => {
        let pending = 0;
        let accepted = 0;
        let refused = 0;
        for (const row of rows) {
            const st = normalizeStatus(row.status ?? row.state);
            if (st === "pending" || st === "unknown") pending++;
            else if (st === "accepted") accepted++;
            else if (st === "refused") refused++;
        }
        return { all: rows.length, pending, accepted, refused };
    }, [rows]);

    const filtered = useMemo(() => {
        if (tab === "all") return rows;
        return rows.filter((row) => {
            const st = normalizeStatus(row.status ?? row.state);
            if (tab === "pending") return st === "pending" || st === "unknown";
            if (tab === "accepted") return st === "accepted";
            if (tab === "refused") return st === "refused";
            return true;
        });
    }, [rows, tab]);

    const submit = async () => {
        if (!type) {
            toast("Choisissez un type de demande.", "error");
            return;
        }
        if (projectId.trim() && !UUID_REGEX.test(projectId.trim())) {
            toast("Format UUID invalide pour project_id.", "error");
            return;
        }
        if (!priority) {
            toast("Choisissez une priorité.", "error");
            return;
        }
        if (!description.trim()) {
            toast("Ajoutez une description pour le RH.", "error");
            return;
        }
        const body: PostRhActionBody = {
            type,
            message: description.trim(),
            priority,
        };
        if (projectId.trim()) body.project_id = projectId.trim();
        try {
            await postRh.mutateAsync(body);
            setDescription("");
            toast(
                "Demande envoyée. Le RH recevra une notification et pourra accepter ou refuser la demande depuis son workspace. Vous serez informé de la réponse.",
                "success",
                7000,
            );
        } catch (e) {
            toast(e instanceof Error ? e.message : "Échec d’envoi.", "error");
        }
    };

    const cancelRequest = async (request: Record<string, unknown> & { id: string }) => {
        const actionId = String(request.id ?? "").trim();
        if (!UUID_REGEX.test(actionId)) {
            toast("ID de demande invalide pour l'annulation.", "error");
            return;
        }
        const runPatch = async (status: "cancelled" | "done" | "rejected") =>
            patchRh.mutateAsync({
                id: actionId,
                body: { status },
            });
        // Debug temporaire demandé.
        // eslint-disable-next-line no-console
        console.log("PATCH id:", actionId);
        try {
            let response = await runPatch("cancelled");
            let root = response && typeof response === "object" ? (response as Record<string, unknown>) : {};
            let successFlag = String(root.status ?? "").trim().toLowerCase() === "success";

            // Compat immédiate: certains workflows actifs n'acceptent pas "cancelled" et explosent en 500.
            if (!successFlag) {
                response = await runPatch("done");
                root = response && typeof response === "object" ? (response as Record<string, unknown>) : {};
                successFlag = String(root.status ?? "").trim().toLowerCase() === "success";
            }
            if (!successFlag) {
                response = await runPatch("rejected");
                root = response && typeof response === "object" ? (response as Record<string, unknown>) : {};
                successFlag = String(root.status ?? "").trim().toLowerCase() === "success";
            }
            // Debug temporaire demandé.
            // eslint-disable-next-line no-console
            console.log("PATCH response:", response);
            const payload = root.item && typeof root.item === "object" ? (root.item as Record<string, unknown>) : undefined;
            if (!successFlag) {
                throw new Error("Le backend n'a pas confirmé la mise à jour.");
            }
            const nextStatus = String(payload?.status ?? "").trim().toLowerCase();
            await q.refetch();
            if (nextStatus === "done") toast("Demande clôturée.", "success");
            else toast("Demande annulée.", "success");
        } catch (e) {
            const details =
                e instanceof ApiError && e.payload != null ? ` [id=${actionId}] ${JSON.stringify(e.payload)}` : ` [id=${actionId}]`;
            toast(`${e instanceof Error ? e.message : "Annulation impossible."}${details}`, "error");
        }
    };

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow="RH"
            title={t("nav:managerNavRhRequests")}
            description="Création et suivi des demandes — signaler une surcharge, demander une réaffectation, ou une formation."
        >
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Formulaire */}
                <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <Plus className="size-4 text-brand-secondary" aria-hidden />
                        Nouvelle demande
                    </h2>
                    <div className="mt-4 space-y-4">
                        <NativeSelect
                            label="Type de demande"
                            value={type}
                            onChange={(e) => setType(e.target.value as RhActionRequestType | "")}
                            options={[{ label: "— Choisir —", value: "" }, ...REQUEST_TYPES.map((x) => ({ label: x.label, value: x.value }))]}
                        />
                        <NativeSelect
                            label="Projet concerné (optionnel)"
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            options={[
                                { label: "— Aucun projet —", value: "" },
                                ...projectOptions.map((x) => ({ label: x.label, value: x.id })),
                            ]}
                        />
                        <NativeSelect
                            label="Priorité"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as NonNullable<PostRhActionBody["priority"]> | "")}
                            options={[
                                { label: "— Choisir —", value: "" },
                                ...PRIORITIES.map((x) => ({ label: x.label, value: x.value! })),
                            ]}
                        />
                        <label className="block text-sm">
                            <span className="mb-1 block font-medium text-secondary">Description / contexte</span>
                            <textarea
                                className="min-h-[120px] w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-primary outline-none ring-brand-secondary focus:ring-2"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Expliquez la situation, le besoin, ou le problème à résoudre…"
                            />
                        </label>
                        <Button
                            color="secondary"
                            size="md"
                            className="w-full"
                            isLoading={postRh.isPending}
                            onClick={() => void submit()}
                        >
                            Envoyer la demande au RH
                        </Button>
                    </div>
                </section>

                {/* Liste */}
                <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-primary">Mes demandes</h2>
                        <div className="flex flex-wrap items-center gap-2">
                            {counts.pending > 0 ? (
                                <Badge type="pill-color" size="sm" color="warning">
                                    {counts.pending} en attente
                                </Badge>
                            ) : null}
                            <Button color="secondary" size="sm" onClick={() => void q.refetch()} isLoading={q.isFetching}>
                                Actualiser
                            </Button>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1 border-b border-secondary">
                        {(
                            [
                                ["all", "Toutes", counts.all],
                                ["pending", "En attente", counts.pending],
                                ["accepted", "Acceptées", counts.accepted],
                                ["refused", "Refusées", counts.refused],
                            ] as const
                        ).map(([id, label, count]) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setTab(id)}
                                className={cx(
                                    "-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors",
                                    tab === id
                                        ? "border-brand-secondary text-brand-secondary"
                                        : "border-transparent text-tertiary hover:text-secondary",
                                )}
                            >
                                {label}{" "}
                                <span className="tabular-nums text-quaternary">({count})</span>
                            </button>
                        ))}
                    </div>

                    {q.isLoading ? <p className="mt-4 text-sm text-tertiary">Chargement…</p> : null}
                    {q.error ? (
                        <p className="mt-4 text-sm text-error-primary">{q.error instanceof Error ? q.error.message : String(q.error)}</p>
                    ) : null}

                    {!q.isLoading && filtered.length === 0 ? (
                        <p className="mt-4 text-sm text-tertiary">Aucune demande dans cette catégorie.</p>
                    ) : null}

                    {!q.isLoading && filtered.length > 0 ? (
                        <ul className="mt-4 space-y-3">
                            {filtered.map((row) => {
                                const st = normalizeStatus(row.status ?? row.state);
                                const sb = statusBadge(st);
                                const pb = priorityBadge(row.priority);
                                const sentAt = row.created_at ?? row.sent_at ?? row.updated_at ?? row.submitted_at;
                                const pname = projectLabel(row);
                                const actionId = resolveRhActionId(row);
                                return (
                                    <li
                                        key={row.id}
                                        className="rounded-xl border border-secondary bg-secondary/15 p-4 shadow-xs ring-1 ring-secondary/60"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-primary">{pname}</p>
                                                <p className="mt-0.5 text-xs text-tertiary">
                                                    Type : {typeLabel(row.type)}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                <Badge type="pill-color" size="sm" color={pb.color}>
                                                    {pb.label}
                                                </Badge>
                                                <Badge type="pill-color" size="sm" color={sb.color}>
                                                    {sb.label}
                                                </Badge>
                                            </div>
                                        </div>
                                        <p className="mt-2 whitespace-pre-wrap text-sm text-secondary">
                                            {String(row.message ?? row.body ?? row.description ?? "—")}
                                        </p>
                                        <p className="mt-2 text-xs text-tertiary">Envoyée {formatRelativeFr(sentAt)}</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Button color="secondary" size="sm" onClick={() => setDetailRow(row)}>
                                                Détail
                                            </Button>
                                            {st === "pending" ? (
                                                <Button
                                                    color="tertiary"
                                                    size="sm"
                                                    onClick={() => void cancelRequest(row)}
                                                    isLoading={patchRh.isPending}
                                                    isDisabled={!actionId}
                                                >
                                                    Annuler
                                                </Button>
                                            ) : null}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : null}
                </section>
            </div>

            {/* Encadré API */}
            <section className="mt-8 rounded-2xl border border-brand-secondary/40 bg-brand-secondary/10 p-5 shadow-xs ring-1 ring-brand-secondary/20">
                <div className="flex gap-3">
                    <InfoCircle className="mt-0.5 size-5 shrink-0 text-brand-secondary" aria-hidden />
                    <div>
                        <h3 className="text-sm font-semibold text-primary">État de l’API</h3>
                        <p className="mt-2 text-sm text-secondary leading-relaxed">
                            La connexion à l’API RH fonctionne. Les demandes sont envoyées au workflow n8n dédié. Le RH recevra une notification et
                            pourra accepter ou refuser chaque demande depuis son workspace. Vous serez notifié de la réponse.
                        </p>
                    </div>
                </div>
            </section>

            <ModalOverlay isOpen={detailRow != null} onOpenChange={(open) => !open && setDetailRow(null)} isDismissable>
                <Modal>
                    <Dialog className="max-w-lg rounded-2xl border border-secondary bg-primary p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-primary">Détail de la demande</h2>
                        {detailRow ? (
                            <div className="mt-4 space-y-2 text-sm text-secondary">
                                <p>
                                    <span className="font-medium text-primary">Projet :</span> {projectLabel(detailRow)}
                                </p>
                                <p>
                                    <span className="font-medium text-primary">Type :</span> {typeLabel(detailRow.type)}
                                </p>
                                <p>
                                    <span className="font-medium text-primary">Message :</span>
                                </p>
                                <p className="whitespace-pre-wrap rounded-lg bg-secondary/30 p-3 text-primary">
                                    {String(detailRow.message ?? detailRow.body ?? detailRow.description ?? "—")}
                                </p>
                            </div>
                        ) : null}
                        <div className="mt-6 flex justify-end">
                            <Button color="secondary" size="sm" onClick={() => setDetailRow(null)}>
                                Fermer
                            </Button>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </WorkspacePageShell>
    );
}
