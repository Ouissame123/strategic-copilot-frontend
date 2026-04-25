import { HelpCircle, SearchLg, Stars01 } from "@untitledui/icons";
import { useCallback, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { useCopilot } from "@/providers/copilot-provider";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";
import { cx } from "@/utils/cx";

function isMac(): boolean {
    return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
}

/** Ne pas intercepter les raccourcis quand le focus est dans une modale (hors palette locale). */
function isInsideDialog(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('[role="dialog"], [role="alertdialog"]'));
}

export function AppGlobalShortcuts() {
    const { t } = useTranslation("common");
    const paths = useWorkspacePaths();
    const { setIsOpen: setCopilotOpen } = useCopilot();
    const [commandOpen, setCommandOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [query, setQuery] = useState("");

    const mod = isMac() ? "⌘" : "Ctrl+";

    const openCommand = useCallback(() => {
        setQuery("");
        setCommandOpen(true);
    }, []);

    useHotkeys(
        ["mod+k", "ctrl+k"],
        (e) => {
            if (isInsideDialog(e.target)) return;
            e.preventDefault();
            openCommand();
        },
        { enableOnFormTags: false },
        [openCommand],
    );

    useHotkeys(
        ["mod+/", "ctrl+/"],
        (e) => {
            if (isInsideDialog(e.target)) return;
            e.preventDefault();
            setCopilotOpen(true);
        },
        { enableOnFormTags: false },
        [setCopilotOpen],
    );

    const links = useMemo(
        () =>
            [
                { to: paths.home, label: t("shortcuts.linkHome") },
                { to: paths.projects, label: t("shortcuts.linkProjects") },
                { to: paths.decisionLog, label: t("shortcuts.linkDecisionLog") },
                { to: paths.profile, label: t("shortcuts.linkProfile") },
            ].filter((item) => !query.trim() || item.label.toLowerCase().includes(query.trim().toLowerCase())),
        [query, t, paths],
    );

    return (
        <>
            <button
                type="button"
                onClick={() => setHelpOpen(true)}
                title={t("shortcuts.helpTooltip")}
                className={cx(
                    "flex size-9 items-center justify-center rounded-lg text-tertiary outline-hidden transition hover:bg-primary_hover hover:text-secondary focus-visible:ring-2 focus-visible:ring-focus-ring",
                )}
                aria-label={t("shortcuts.helpAria")}
            >
                <HelpCircle className="size-5" />
            </button>

            <ModalOverlay isOpen={helpOpen} onOpenChange={setHelpOpen} isDismissable>
                <Modal>
                    <Dialog className="w-full max-w-md p-4 sm:p-6">
                        <div className="w-full rounded-2xl border border-secondary bg-primary p-6 shadow-xl ring-1 ring-secondary/80">
                            <h2 className="text-lg font-semibold text-primary">{t("shortcuts.title")}</h2>
                            <ul className="mt-4 space-y-3 text-sm text-secondary">
                                <li className="flex justify-between gap-4">
                                    <span>{t("shortcuts.commandMenu")}</span>
                                    <kbd className="rounded border border-secondary bg-secondary_subtle px-2 py-0.5 font-mono text-xs text-primary">
                                        {mod}K
                                    </kbd>
                                </li>
                                <li className="flex justify-between gap-4">
                                    <span>{t("shortcuts.openCopilot")}</span>
                                    <kbd className="rounded border border-secondary bg-secondary_subtle px-2 py-0.5 font-mono text-xs text-primary">
                                        {mod}/
                                    </kbd>
                                </li>
                            </ul>
                            <div className="mt-6 flex justify-end">
                                <Button color="secondary" slot="close">
                                    {t("shortcuts.close")}
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>

            <ModalOverlay isOpen={commandOpen} onOpenChange={setCommandOpen} isDismissable>
                <Modal>
                    <Dialog className="w-full max-w-lg p-4 sm:p-6">
                        <div className="w-full rounded-2xl border border-secondary bg-primary p-5 shadow-xl ring-1 ring-secondary/80">
                            <div className="relative flex items-center gap-2 border-b border-secondary pb-3">
                                <SearchLg className="pointer-events-none absolute left-3 size-5 text-tertiary" aria-hidden />
                                <input
                                    type="search"
                                    autoFocus
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={t("shortcuts.commandPlaceholder")}
                                    className="w-full rounded-lg border border-secondary bg-primary py-2.5 pr-3 pl-10 text-sm text-primary shadow-xs ring-1 ring-primary outline-none ring-inset placeholder:text-placeholder focus-visible:ring-2 focus-visible:ring-brand"
                                    aria-label={t("shortcuts.commandPlaceholder")}
                                />
                            </div>
                            <nav className="mt-3 max-h-72 space-y-1 overflow-y-auto" aria-label={t("shortcuts.commandNav")}>
                                {links.map((item) => (
                                    <Link
                                        key={item.to}
                                        to={item.to}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary_hover"
                                        onClick={() => setCommandOpen(false)}
                                    >
                                        <Stars01 className="size-4 shrink-0 text-quaternary" aria-hidden />
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>
                            <p className="mt-3 text-xs text-tertiary">{t("shortcuts.commandHint")}</p>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </>
    );
}
