import { Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { CopilotPanel, CopilotTriggerButton } from "@/components/copilot";
import { SidebarNavigationSimple } from "@/components/app/navigation";
import { ThemeToggle } from "@/components/app/theme";
import { LanguageSwitcher } from "@/components/app/i18n";
import { WorkspaceRoleSwitcher } from "@/components/app/workspace-role-switcher";
import { CopilotProvider } from "@/providers/copilot-provider";
import { useAuth } from "@/providers/auth-provider";
import { getNavigationForWorkspaceRole } from "@/layouts/navigation-config";
import { workspaceRoleHeaderStripeClass } from "@/utils/workspace-role-styles";
import { cx } from "@/utils/cx";

export default function AppLayout() {
  const { pathname } = useLocation();
  const { t } = useTranslation(["nav", "common"]);
  const { user, mustChangePassword } = useAuth();
  const role = user?.role ?? "talent";
  const items = getNavigationForWorkspaceRole(role, t);

  return (
    <CopilotProvider>
      <div className="min-h-screen bg-primary lg:flex">
        <SidebarNavigationSimple activeUrl={pathname} items={items} />
        <div className="flex min-h-screen flex-1 flex-col bg-secondary_subtle">
          <header className="flex min-h-14 shrink-0 flex-col items-stretch border-b border-secondary bg-primary shadow-xs md:px-8 md:py-0">
            <div className="flex items-center justify-end gap-3 px-5 py-3.5 md:px-0 md:py-4">
              <WorkspaceRoleSwitcher />
              <CopilotTriggerButton />
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
            <div className={cx("h-0.5 w-full bg-gradient-to-r md:rounded-b-sm", workspaceRoleHeaderStripeClass(role))} aria-hidden />
          </header>
          <main className="flex-1 p-5 md:p-8">
            <div className="mx-auto w-full max-w-container">
              {mustChangePassword && (
                <div
                  role="status"
                  className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-primary"
                >
                  {t("common:auth.mustChangePasswordBanner")}
                </div>
              )}
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <CopilotPanel />
    </CopilotProvider>
  );
}
