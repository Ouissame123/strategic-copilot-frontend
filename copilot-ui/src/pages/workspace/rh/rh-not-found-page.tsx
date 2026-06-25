import { Link } from "react-router";
import { Button } from "@/components/base/buttons/button";

export function RhNotFoundPage() {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
            <h1 className="text-2xl font-semibold text-primary">Page introuvable</h1>
            <p className="max-w-md text-sm text-tertiary">
                Cette ressource n&apos;existe pas ou a été déplacée.
            </p>
            <Link to="/workspace/rh/dashboard">
                <Button color="primary" size="md">
                    Retour au tableau de bord
                </Button>
            </Link>
        </div>
    );
}
