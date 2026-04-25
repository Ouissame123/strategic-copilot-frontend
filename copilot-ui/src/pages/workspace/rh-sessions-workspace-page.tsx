import { useMemo } from "react";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useRhSessions } from "@/hooks/use-rh-sessions";
import { cx } from "@/utils/cx";

function fmt(value: string) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
}

function roleTone(role: string): "brand" | "success" | "gray" {
    const r = role.trim().toLowerCase();
    if (r === "rh") return "brand";
    if (r === "manager") return "success";
    return "gray";
}

export default function RhSessionsWorkspacePage() {
    const { items, loading, error, refresh } = useRhSessions();

    const { activeCount, revokedCount } = useMemo(() => {
        let a = 0;
        let r = 0;
        for (const row of items) {
            if (String(row.status).toLowerCase() === "revoked") r += 1;
            else if (String(row.status).toLowerCase() === "active") a += 1;
        }
        return { activeCount: a, revokedCount: r };
    }, [items]);

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow="RH"
            title="Suivi des sessions"
            description="Visualiser les sessions actives, expirées ou révoquées (liste fournie par l’API)."
            actions={
                <Button color="secondary" size="sm" onClick={() => void refresh()}>
                    Actualiser
                </Button>
            }
        >
            <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-success-primary/15 px-3 py-1 text-xs font-semibold text-success-primary ring-1 ring-success-primary/25">
                    {activeCount} active{activeCount !== 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-tertiary ring-1 ring-secondary">
                    {revokedCount} révoquée{revokedCount !== 1 ? "s" : ""}
                </span>
            </div>

            <div className="rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80">
                {loading && <p className="text-sm text-secondary">Chargement des sessions...</p>}
                {error && <p className="text-sm text-error-primary">{error}</p>}
                {!loading && !error && (
                    <div className="overflow-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-secondary">
                                    <th className="p-2">Nom</th>
                                    <th className="p-2">Email</th>
                                    <th className="p-2">Rôle</th>
                                    <th className="p-2">Connexion</th>
                                    <th className="p-2">Expiration</th>
                                    <th className="p-2">Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((row) => {
                                    const revoked = String(row.status).toLowerCase() === "revoked";
                                    return (
                                        <tr
                                            key={row.id}
                                            className={cx(
                                                "border-b border-secondary/40",
                                                revoked && "opacity-50 text-tertiary",
                                            )}
                                        >
                                            <td className="p-2">{row.userName || "—"}</td>
                                            <td className="p-2">{row.email}</td>
                                            <td className="p-2">
                                                <Badge color={roleTone(row.role)} type="pill-color" size="sm">
                                                    {row.role || "—"}
                                                </Badge>
                                            </td>
                                            <td className="p-2">{fmt(row.loginAt)}</td>
                                            <td className="p-2">{fmt(row.expiresAt)}</td>
                                            <td className="p-2">
                                                <span
                                                    className={cx(
                                                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                                        revoked
                                                            ? "bg-secondary text-tertiary"
                                                            : "bg-success-primary/15 text-success-primary",
                                                    )}
                                                >
                                                    {row.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </WorkspacePageShell>
    );
}
