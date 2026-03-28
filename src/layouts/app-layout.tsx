import { Folder, LayersTwo02, FileCheck02, User01 } from "@untitledui/icons";
import { Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import type { NavItemType } from "@/components/application/app-navigation/config";
import { CopilotPanel, CopilotTriggerButton } from "@/components/copilot";
import { SidebarNavigationSimple } from "@/components/app/navigation";
import { ThemeToggle } from "@/components/app/theme";
import { LanguageSwitcher } from "@/components/app/i18n";
import { CopilotProvider } from "@/providers/copilot-provider";

function getNavigation(t: (key: string) => string): NavItemType[] {
  return [
    { label: t("dashboard"), href: "/", icon: LayersTwo02 },
    { label: t("projects"), href: "/projects", icon: Folder },
    { label: t("portfolio"), href: "/portfolio", icon: LayersTwo02 },
    { label: t("decisionLog"), href: "/decision-log", icon: FileCheck02 },
    { label: t("users"), href: "/users", icon: User01 },
  ];
}

export default function AppLayout() {
  const { pathname } = useLocation();
  const { t } = useTranslation("nav");
  const items = getNavigation(t);

  return (
    <CopilotProvider>
      <div className="min-h-screen bg-primary lg:flex">
        <SidebarNavigationSimple activeUrl={pathname} items={items} />
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center justify-end gap-3 border-b border-secondary bg-primary px-4 py-3 md:px-6">
            <CopilotTriggerButton />
            <LanguageSwitcher />
            <ThemeToggle />
          </header>
          <main className="flex-1 p-4 md:p-6">
            <div className="mx-auto w-full max-w-container">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <CopilotPanel />
    </CopilotProvider>
  );
}
