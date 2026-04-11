import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useUsers } from "@/hooks/use-users";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/base/badges/badges";
import type { BadgeColors } from "@/components/base/badges/badge-types";

const DIRECTORY_PAGE_SIZE = 500;

function badgeForRole(role: "rh" | "manager" | "talent"): { label: string; color: BadgeColors } {
    switch (role) {
        case "rh":
            return { label: "RH", color: "purple" };
        case "manager":
            return { label: "Manager", color: "blue" };
        case "talent":
        default:
            return { label: "Talent", color: "gray" };
    }
}

export default function AccountSettingsPage() {
    const { t } = useTranslation(["common", "nav"]);
    const navigate = useNavigate();
    const { user } = useAuth();
    const { users, isLoading } = useUsers({ pageSize: DIRECTORY_PAGE_SIZE });

    const pageTitle = t("nav:accountSettings");

    useCopilotPage("account-settings", pageTitle, user?.email, user?.email);

    useEffect(() => {
        if (!user) return;
        if (user.role !== "rh") {
            navigate("/", { replace: true });
        }
    }, [user, navigate]);

    if (!user) return null;
    if (user.role !== "rh") return null;

    return (
        <div className="space-y-8">
            <header className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{t("common:rhUsersPage.eyebrowRh")}</p>
                <h1 className="mt-1 text-display-xs font-semibold text-primary md:text-display-sm">{pageTitle}</h1>
                <p className="mt-2 text-md text-tertiary">{t("common:rhUsersPage.description")}</p>
            </header>

            <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{t("common:rhUsersPage.sectionEyebrow")}</p>
                <h2 className="mt-1 text-lg font-semibold text-primary">{t("common:rhUsersPage.sectionTitle")}</h2>
                <p className="mt-2 text-sm text-tertiary">{t("common:rhUsersPage.count", { count: users.length })}</p>

                {isLoading ? (
                    <p className="mt-6 text-sm text-tertiary">{t("common:rhUsersPage.loading")}</p>
                ) : (
                    <ul className="mt-6 divide-y divide-secondary">
                        {users.map((row) => {
                            const { label, color } = badgeForRole(row.role);
                            return (
                                <li
                                    key={row.id}
                                    className="flex flex-wrap items-center justify-between gap-2 py-4 first:pt-0 last:pb-0"
                                >
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-semibold text-secondary">{`${row.firstName} ${row.lastName}`.trim() || row.email}</span>
                                        <span className="text-sm text-tertiary">{row.email}</span>
                                    </div>
                                    <Badge size="sm" type="pill-color" color={color}>
                                        {label}
                                    </Badge>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {!isLoading && users.length === 0 && (
                    <p className="mt-4 text-sm text-tertiary">{t("common:rhUsersPage.empty")}</p>
                )}
            </section>
        </div>
    );
}
