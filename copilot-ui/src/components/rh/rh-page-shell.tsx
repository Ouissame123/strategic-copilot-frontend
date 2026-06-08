import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Stars01 } from "@untitledui/icons";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { RH_CARD, RH_TEXT_MUTED, RH_TEXT_PRIMARY, WS_MUTED_SURFACE } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

type RhPageShellProps = {
    title: string;
    description?: ReactNode;
    children?: ReactNode;
};

/** Enveloppe premium vide pour les pages RH en reconstruction. */
export function RhPageShell({ title, description, children }: RhPageShellProps) {
    const { t } = useTranslation("common");

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow={t("rhPlaceholder.eyebrow")}
            title={title}
            description={description === undefined ? (children ? undefined : t("rhPlaceholder.description")) : description}
        >
            {children ?? (
                <div
                    className={cx(
                        RH_CARD,
                        "flex min-h-[min(420px,55vh)] flex-col items-center justify-center border-dashed px-6 py-14 text-center",
                    )}
                >
                    <div className={cx("mb-4 flex size-16 items-center justify-center rounded-2xl", WS_MUTED_SURFACE)}>
                        <Stars01 className={cx("size-8", RH_TEXT_MUTED)} aria-hidden />
                    </div>
                    <p className={cx("text-sm font-semibold", RH_TEXT_PRIMARY)}>{t("rhPlaceholder.comingSoon")}</p>
                    <p className={cx("mt-2 max-w-md text-sm leading-relaxed", RH_TEXT_MUTED)}>{t("rhPlaceholder.hint")}</p>
                </div>
            )}
        </WorkspacePageShell>
    );
}
