import { AlertCircle } from "@untitledui/icons";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

type ErrorBannerProps = {
    message: string;
    onRetry?: () => void;
    className?: string;
    /** Variante plus discrète sous un formulaire */
    variant?: "section" | "inline";
};

/** Erreur de chargement ou API : message lisible + action « Réessayer ». */
export function ErrorBanner({ message, onRetry, className, variant = "section" }: ErrorBannerProps) {
    const { t } = useTranslation("common");

    return (
        <div
            role="alert"
            className={cx(
                "flex flex-col gap-3 rounded-xl border border-utility-error-200 bg-utility-error-50 p-4 text-utility-error-900 ring-1 ring-utility-error-100 dark:border-utility-error-800 dark:bg-utility-error-950/50 dark:text-utility-error-100 dark:ring-utility-error-900/60",
                variant === "inline" && "border-dashed p-3 text-sm",
                className,
            )}
        >
            <div className="flex gap-3">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-utility-error-600 dark:text-utility-error-300" aria-hidden />
                <p className="min-w-0 flex-1 text-sm leading-relaxed font-medium">{message}</p>
            </div>
            {onRetry ? (
                <div className="flex justify-end">
                    <Button size="sm" color="secondary" onClick={onRetry}>
                        {t("retry")}
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
