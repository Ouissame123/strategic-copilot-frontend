import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Send01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

type ChatInputBoxProps = {
    onSend: (message: string) => void;
    isLoading: boolean;
    placeholder?: string;
    compact?: boolean;
};

export function ChatInputBox({ onSend, isLoading, placeholder, compact = false }: ChatInputBoxProps) {
    const [value, setValue] = useState("");
    const ref = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }, [value]);

    const handleSend = () => {
        const trimmed = value.trim();
        if (!trimmed || isLoading) return;
        onSend(trimmed);
        setValue("");
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className={cx("flex items-end gap-2 border-t border-secondary/60 bg-primary", compact ? "p-2" : "p-3")}>
            <textarea
                ref={ref}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder ?? "Pose une question sur ce projet…"}
                disabled={isLoading}
                rows={1}
                maxLength={4000}
                aria-label="Message pour le copilot"
                className={cx(
                    "min-h-[2.5rem] max-h-[7.5rem] flex-1 resize-none rounded-lg bg-primary px-3 py-2 text-sm text-primary shadow-xs ring-1 ring-primary ring-inset placeholder:text-fg-quaternary focus:outline-none focus:ring-2 focus:ring-brand disabled:cursor-not-allowed disabled:opacity-60",
                    compact && "text-xs",
                )}
            />
            <Button
                type="button"
                color="primary"
                size={compact ? "sm" : "md"}
                iconLeading={isLoading ? undefined : Send01}
                isDisabled={!value.trim() || isLoading}
                isLoading={isLoading}
                aria-label={isLoading ? "Envoi en cours" : "Envoyer le message"}
                onClick={handleSend}
            />
        </div>
    );
}
