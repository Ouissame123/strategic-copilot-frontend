import { HelpCircle } from "@untitledui/icons";
import { useLocation } from "react-router";
import { CopilotTriggerButton } from "@/components/copilot/copilot-trigger-button";
import { ThemeToggle } from "@/components/app/theme";
import { useAuth } from "@/providers/auth-provider";

const TITLES: Record<string, string> = {
    "/workspace/talent/dashboard": "Mon dashboard",
    "/workspace/talent/projects": "Mes projets",
    "/workspace/talent/tasks": "Mes taches",
    "/workspace/talent/workload": "Ma charge",
    "/workspace/talent/skills": "Mes competences",
    "/workspace/talent/trainings": "Mes formations",
    "/workspace/talent/notifications": "Notifications",
    "/workspace/talent/profile": "Mon profil",
};

export function TalentTopbar() {
    const { pathname } = useLocation();
    const { user } = useAuth();
    const title = TITLES[pathname] ?? "Talent";
    const initials = (user?.fullName ?? "T")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((chunk) => chunk[0]?.toUpperCase() ?? "")
        .join("");

    return (
        <header className="flex h-14 items-center gap-2 border-b border-black/10 bg-white px-4 md:px-7">
            <div className="text-[13px] text-[#a09db5]">
                Portfolio <span className="px-1 opacity-50">/</span> <span className="font-medium text-[#18171e]">{title}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
                <button type="button" className="rounded-lg border border-black/10 p-2 text-[#6b6880] transition hover:bg-[#f7f6f3]">
                    <HelpCircle className="size-4" />
                </button>
                <CopilotTriggerButton />
                <ThemeToggle />
                <div className="flex size-8 items-center justify-center rounded-full bg-[#7c6ef5] text-xs font-semibold text-white">{initials || "T"}</div>
            </div>
        </header>
    );
}

