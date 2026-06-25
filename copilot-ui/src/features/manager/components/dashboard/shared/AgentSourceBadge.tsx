import { Stars02 } from "@untitledui/icons";
import { useTranslation } from "react-i18next";

export function AgentSourceBadge({ agent }: { agent: string }) {
    const { t } = useTranslation("common");
    return (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-quaternary">
            <Stars02 className="size-3 shrink-0" aria-hidden />
            <span>
                {t("managerWorkspace.dashboard.sourceFrom")} · {agent}
            </span>
        </p>
    );
}
