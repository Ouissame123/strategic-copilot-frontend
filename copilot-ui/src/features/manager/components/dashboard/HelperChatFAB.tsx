import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Stars01, XClose } from "@untitledui/icons";
import { ManagerCopilotPanel } from "@/components/manager-copilot/ManagerCopilotPanel";
import { cx } from "@/utils/cx";

export function HelperChatFAB() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape" && open) setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    return (
        <>
            {!open ? (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Ouvrir Helper Chat"
                    className={cx(
                        "fixed bottom-6 right-6 z-50",
                        "flex size-14 items-center justify-center rounded-full",
                        "bg-purple-600 text-white shadow-lg shadow-purple-500/30",
                        "transition hover:scale-105 hover:bg-purple-700 active:scale-95",
                        "focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2",
                    )}
                >
                    <Stars01 className="size-6" aria-hidden />
                </button>
            ) : null}

            {open ? (
                <div
                    className={cx(
                        "fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden",
                        "h-[640px] max-h-[calc(100vh-3rem)] w-[420px] max-w-[calc(100vw-2rem)]",
                        "rounded-lg border border-gray-200 bg-white shadow-2xl",
                    )}
                    role="dialog"
                    aria-label="Helper Chat"
                >
                    <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-full bg-purple-600 text-white">
                                <Stars01 className="size-4" aria-hidden />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Helper Chat</p>
                                <p className="text-xs text-gray-500">Agent 6 · chat-v2</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    void navigate("/workspace/manager/helper");
                                }}
                                className="rounded p-1.5 text-gray-500 transition hover:bg-gray-200"
                                aria-label="Ouvrir en plein écran"
                                title="Ouvrir en plein écran"
                            >
                                <ArrowRight className="size-3.5" aria-hidden />
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="rounded p-1.5 text-gray-500 transition hover:bg-gray-200"
                                aria-label="Fermer"
                            >
                                <XClose className="size-3.5" aria-hidden />
                            </button>
                        </div>
                    </header>
                    <div className="min-h-0 flex-1">
                        <ManagerCopilotPanel embeddedInDrawer onClose={() => setOpen(false)} />
                    </div>
                </div>
            ) : null}
        </>
    );
}
