import { BookOpen01, Bell01, Briefcase01, ChartBreakoutCircle, CheckCircle, LayoutAlt02, LogOut01, SearchLg, User01, ZapFast } from "@untitledui/icons";
import type { ComponentType } from "react";
import { useState } from "react";
import { NavLink } from "react-router";
import { useAuth } from "@/providers/auth-provider";
import { cx } from "@/utils/cx";

type NavItem = {
    to: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
};

const mainItems: NavItem[] = [
    { to: "/workspace/talent/dashboard", label: "Mon dashboard", icon: LayoutAlt02 },
    { to: "/workspace/talent/projects", label: "Mes projets", icon: Briefcase01 },
    { to: "/workspace/talent/tasks", label: "Mes taches", icon: CheckCircle },
    { to: "/workspace/talent/workload", label: "Ma charge", icon: ChartBreakoutCircle },
];

const devItems: NavItem[] = [
    { to: "/workspace/talent/skills", label: "Mes competences", icon: ZapFast },
    { to: "/workspace/talent/trainings", label: "Mes formations", icon: BookOpen01 },
];

const otherItems: NavItem[] = [
    { to: "/workspace/talent/notifications", label: "Notifications", icon: Bell01 },
    { to: "/workspace/talent/profile", label: "Mon profil", icon: User01 },
];

function Item({ to, label, icon: Icon }: NavItem) {
    return (
        <NavLink to={to} className="group relative">
            {({ isActive }) => (
                <div
                    className={cx(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-[13.5px] font-normal text-[#c4c2d4] transition",
                        "hover:bg-white/10 hover:text-white",
                        isActive && "bg-[#7c6ef5]/15 font-medium text-white",
                    )}
                >
                    <span className={cx("absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-md bg-[#7c6ef5]", !isActive && "opacity-0")} />
                    <Icon className={cx("size-4 opacity-70", isActive && "opacity-100")} />
                    <span>{label}</span>
                </div>
            )}
        </NavLink>
    );
}

export function TalentSidebar() {
    const { logout } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    return (
        <aside className="hidden w-[230px] shrink-0 bg-[#1a1825] px-2 pb-4 pt-0 lg:flex lg:flex-col">
            <div className="border-b border-white/10 px-3 py-5">
                <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-[#7c6ef5] text-xs font-bold text-white">SC</div>
                    <div>
                        <p className="text-sm font-semibold text-white">Strategic Copilot</p>
                    </div>
                </div>
            </div>

            <div className="mx-2 mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/40">
                <SearchLg className="size-3.5" />
                <span className="flex-1">Recherche</span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">Ctrl+K</span>
            </div>

            <div className="mt-3 space-y-4">
                <section className="space-y-1">
                    <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/30">Principal</p>
                    {mainItems.map((item) => (
                        <Item key={item.to} {...item} />
                    ))}
                </section>

                <section className="space-y-1">
                    <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/30">Developpement</p>
                    {devItems.map((item) => (
                        <Item key={item.to} {...item} />
                    ))}
                </section>

                <section className="space-y-1">
                    <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/30">Autres</p>
                    {otherItems.map((item) => (
                        <Item key={item.to} {...item} />
                    ))}
                </section>
            </div>

            <button
                type="button"
                onClick={() => {
                    setIsLoggingOut(true);
                    void logout();
                }}
                onMouseDown={() => setIsLoggingOut(true)}
                className={cx(
                    "mx-1 mt-auto flex items-center gap-2 rounded-lg border-t border-white/10 px-3 pt-3 text-sm text-white/40 transition hover:text-red-300",
                    isLoggingOut && "bg-[#ef4444]/10 py-2 text-[#ef4444] ring-1 ring-[#ef4444]/25",
                )}
            >
                <LogOut01 className="size-4" />
                Deconnecter
            </button>
        </aside>
    );
}

