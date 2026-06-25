import { HelpCircle } from "@untitledui/icons";

interface Props {
    quickReplies: string[];
    onSelect: (q: string) => void;
    disabled?: boolean;
}

export function QuickRepliesStrip({ quickReplies, onSelect, disabled }: Props) {
    if (!quickReplies?.length) return null;

    return (
        <div className="mt-3">
            <div className="mb-2 flex items-center gap-1.5">
                <HelpCircle className="size-3.5 text-fg-quaternary" aria-hidden />
                <h4 className="text-[10px] font-semibold uppercase tracking-wide text-fg-quaternary">Relances</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {quickReplies.map((q) => (
                    <button
                        key={q}
                        type="button"
                        onClick={() => onSelect(q)}
                        disabled={disabled}
                        className="rounded-md border border-secondary bg-primary px-2.5 py-1 text-xs transition-colors hover:bg-secondary_subtle disabled:opacity-50"
                    >
                        {q}
                    </button>
                ))}
            </div>
        </div>
    );
}
