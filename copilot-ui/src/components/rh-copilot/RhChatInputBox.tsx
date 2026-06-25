import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Send01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

interface Props {
    onSend: (message: string) => void;
    isLoading: boolean;
    placeholder?: string;
    disabled?: boolean;
}

export function RhChatInputBox({ onSend, isLoading, placeholder, disabled }: Props) {
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
        if (!trimmed || isLoading || disabled) return;
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
        <div className="border-t border-secondary bg-primary p-3">
            <div className="flex items-end gap-2">
                <textarea
                    ref={ref}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder ?? "Pose ta question RH…"}
                    disabled={isLoading || disabled}
                    rows={1}
                    maxLength={4000}
                    aria-label="Message pour l'Assistant RH IA"
                    className={cx(
                        "min-h-10 max-h-[7.5rem] flex-1 resize-none rounded-lg bg-primary px-3 py-2 text-sm text-primary shadow-xs ring-1 ring-primary ring-inset placeholder:text-fg-quaternary focus:outline-none focus:ring-2 focus:ring-brand disabled:cursor-not-allowed disabled:opacity-60",
                    )}
                />
                <Button
                    type="button"
                    color="primary"
                    size="md"
                    iconLeading={Send01}
                    isDisabled={!value.trim() || isLoading || disabled}
                    isLoading={isLoading}
                    aria-label={isLoading ? "Envoi en cours" : "Envoyer le message"}
                    onClick={handleSend}
                />
            </div>
            <p className="mt-1.5 text-[10px] text-fg-quaternary">
                Enter = envoyer · Shift+Enter = nouvelle ligne · charge, projets, risques, arbitrages…
            </p>
        </div>
    );
}
