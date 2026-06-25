import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Maximize2, MessageCircle, X } from "lucide-react";
import { RhChatEntry } from "@/components/rh-copilot/RhChatEntry";
import { cx } from "@/utils/cx";

export function RhAssistantFloating() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setOpen((v) => !v);
            }
            if (e.key === "Escape" && open) {
                setOpen(false);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    const handleMaximize = () => {
        setOpen(false);
        void navigate("/workspace/rh/chat");
    };

    return (
        <>
            {!open ? (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Ouvrir l'Assistant RH IA"
                    className={cx(
                        "fixed bottom-6 right-6 z-50",
                        "flex size-14 items-center justify-center rounded-full",
                        "bg-violet-600 text-white shadow-lg",
                        "transition-all hover:scale-105 hover:bg-violet-700 active:scale-95",
                        "focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2",
                    )}
                >
                    <MessageCircle size={24} aria-hidden />
                </button>
            ) : null}

            {open ? (
                <div
                    className={cx(
                        "fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden",
                        "h-[640px] max-h-[calc(100vh-3rem)] w-[420px] max-w-[calc(100vw-2rem)]",
                        "rounded-lg border border-secondary bg-primary shadow-2xl",
                        "duration-200 animate-in fade-in slide-in-from-bottom-4",
                    )}
                    role="dialog"
                    aria-label="Assistant RH IA"
                >
                    <header className="flex shrink-0 items-center justify-between border-b border-secondary bg-secondary_subtle px-4 py-3">
                        <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-full bg-violet-600 text-white">
                                <MessageCircle size={16} aria-hidden />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-primary">Assistant RH IA</p>
                                <p className="text-xs text-tertiary">Helper · powered by IA</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={handleMaximize}
                                className="rounded p-1.5 text-tertiary transition hover:bg-secondary_hover"
                                aria-label="Ouvrir en plein écran"
                                title="Ouvrir en plein écran"
                            >
                                <Maximize2 size={14} aria-hidden />
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="rounded p-1.5 text-tertiary transition hover:bg-secondary_hover"
                                aria-label="Fermer"
                                title="Fermer (Esc)"
                            >
                                <X size={14} aria-hidden />
                            </button>
                        </div>
                    </header>

                    <div className="min-h-0 flex-1 overflow-hidden">
                        <RhChatEntry embedded onClose={() => setOpen(false)} />
                    </div>

                    <footer className="flex shrink-0 items-center justify-between border-t border-secondary px-4 py-2 text-xs text-tertiary">
                        <span>
                            Appuie sur{" "}
                            <kbd className="rounded bg-secondary_subtle px-1 py-0.5 font-mono text-[10px]">Esc</kbd> pour
                            fermer
                        </span>
                        <span>
                            <kbd className="rounded bg-secondary_subtle px-1 py-0.5 font-mono text-[10px]">⌘K</kbd>
                        </span>
                    </footer>
                </div>
            ) : null}
        </>
    );
}
