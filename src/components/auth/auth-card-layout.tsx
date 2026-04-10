import type { ReactNode } from "react";
import { ProjectLogo } from "@/components/foundations/logo/project-logo";

interface AuthCardLayoutProps {
    title: string;
    subtitle?: string;
    children: ReactNode;
}

export function AuthCardLayout({ title, subtitle, children }: AuthCardLayoutProps) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-secondary px-4 py-12">
            <div className="w-full max-w-sm space-y-8 rounded-xl border border-secondary bg-primary p-6 shadow-sm md:p-8">
                <div className="flex flex-col items-center gap-2">
                    <ProjectLogo className="h-10" />
                    <h1 className="text-xl font-semibold text-primary">{title}</h1>
                    {subtitle && <p className="text-center text-sm text-tertiary">{subtitle}</p>}
                </div>
                {children}
            </div>
        </div>
    );
}
