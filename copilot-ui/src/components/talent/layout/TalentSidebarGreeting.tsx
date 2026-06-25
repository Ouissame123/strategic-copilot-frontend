import { useAuth } from "@/providers/auth-provider";

export function TalentSidebarGreeting() {
    const { user } = useAuth();
    const firstName =
        user?.firstName?.trim() ||
        user?.fullName?.trim().split(/\s+/)[0] ||
        user?.email?.split("@")[0] ||
        "Talent";

    return (
        <div className="rounded-lg border border-secondary/70 bg-primary px-3 py-2.5">
            <p className="text-[11px] text-tertiary">Bonjour</p>
            <p className="text-sm font-medium text-primary">{firstName} 👋</p>
            <p className="mt-0.5 text-[10px] text-tertiary">Portail Talent</p>
        </div>
    );
}
