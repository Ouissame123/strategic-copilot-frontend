import { Construction } from "lucide-react";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";

type TalentStubPageProps = {
    title: string;
    description: string;
};

export function TalentStubPage({ title, description }: TalentStubPageProps) {
    useWorkspaceTopbarMeta(title, description);

    return (
        <div className="mx-auto max-w-4xl py-12">
            <div className="text-center">
                <Construction className="mx-auto mb-4 size-12 text-tertiary" aria-hidden />
                <p className="mt-4 text-sm text-tertiary">Cette page sera bientôt disponible.</p>
            </div>
        </div>
    );
}
