import { Link } from "react-router";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { Button } from "@/components/base/buttons/button";
import { useAuth } from "@/providers/auth-provider";

export default function PendingApprovalPage() {
    const { logout, user } = useAuth();
    return (
        <AuthCardLayout title="Compte en attente de validation" subtitle="Un RH doit attribuer votre role (manager ou talent).">
            <div className="space-y-4 text-sm text-secondary">
                <p>
                    Compte: <strong>{user?.email}</strong>
                </p>
                <p>Tant que le statut est `pending`, l'acces aux fonctionnalites metier reste bloque.</p>
                <div className="flex gap-3">
                    <Button color="secondary" onClick={() => void logout()}>
                        Se deconnecter
                    </Button>
                    <Button color="primary" href="/login">
                        Reessayer plus tard
                    </Button>
                </div>
                <p>
                    Besoin d'aide? Contactez l'equipe RH ou revenez a la page de{" "}
                    <Link to="/login" className="font-semibold underline">
                        connexion
                    </Link>
                    .
                </p>
            </div>
        </AuthCardLayout>
    );
}
