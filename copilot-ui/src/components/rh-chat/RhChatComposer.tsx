import { Loader2, Send } from "lucide-react";
import { memo, type FormEvent, type KeyboardEvent } from "react";
import { cx } from "@/utils/cx";

type RhChatComposerProps = {
    value: string;
    disabled?: boolean;
    sending?: boolean;
    onChange: (value: string) => void;
    onSend: () => void;
};

export const RhChatComposer = memo(function RhChatComposer({
    value,
    disabled,
    sending,
    onChange,
    onSend,
}: RhChatComposerProps) {
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!value.trim() || disabled || sending) return;
        onSend();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="shrink-0 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95 sm:p-4"
        >
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-200 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-violet-600 dark:focus-within:ring-violet-900/50">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Posez votre question RH…"
                    rows={2}
                    disabled={disabled || sending}
                    className="min-h-[48px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:opacity-60 dark:text-slate-100"
                />
                <button
                    type="submit"
                    disabled={disabled || sending || !value.trim()}
                    className={cx(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition",
                        "bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700",
                        "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
                    )}
                    aria-label="Envoyer"
                >
                    {sending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                        <Send className="size-4" aria-hidden />
                    )}
                </button>
            </div>
            <p className="mt-2 hidden text-[10px] text-slate-400 sm:block">
                Entrée pour envoyer · Maj+Entrée pour un retour à la ligne
            </p>
        </form>
    );
});
