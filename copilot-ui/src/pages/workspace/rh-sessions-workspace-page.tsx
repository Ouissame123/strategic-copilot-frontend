import { Button } from "@/components/base/buttons/button";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useRhSessions } from "@/hooks/use-rh-sessions";

function fmt(value: string) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
}

export default function RhSessionsWorkspacePage() {
    const { items, loading, error, refresh } = useRhSessions();
    return (
        <WorkspacePageShell
            role="rh"
            eyebrow="RH"
            title="Suivi des sessions"
            description="Visualiser les sessions actives, expirees ou revoquees (liste fournie par l’API)."
            actions={
                <Button color="secondary" size="sm" onClick={() => void refresh()}>
                    Actualiser
                </Button>
            }
        >
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
                                    <th className="p-2">Role</th>
                                    <th className="p-2">Connexion</th>
                                    <th className="p-2">Derniere activite</th>
                                    <th className="p-2">Expiration</th>
                                    <th className="p-2">Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((row) => (
                                    <tr key={row.id} className="border-b border-secondary/40">
                                        <td className="p-2">{row.userName || "—"}</td>
                                        <td className="p-2">{row.email}</td>
                                        <td className="p-2">{row.role}</td>
                                        <td className="p-2">{fmt(row.loginAt)}</td>
                                        <td className="p-2">{fmt(row.lastActivityAt)}</td>
                                        <td className="p-2">{fmt(row.expiresAt)}</td>
                                        <td className="p-2">
                                            <BadgeWithDot color={row.status === "active" ? "success" : "gray"} type="pill-color" size="sm">
                                                {row.status}
                                            </BadgeWithDot>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </WorkspacePageShell>
    );
}
