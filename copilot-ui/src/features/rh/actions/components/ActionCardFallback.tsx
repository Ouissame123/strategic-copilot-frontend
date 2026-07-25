type ActionCardFallbackProps = {
    title: string;
    description?: string;
};

export function ActionCardFallback({ title, description }: ActionCardFallbackProps) {
    return (
        <div className="min-w-0 space-y-1">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-primary">{title}</h3>
            {description && description !== title ? (
                <p className="line-clamp-2 text-xs text-tertiary">{description}</p>
            ) : null}
        </div>
    );
}
