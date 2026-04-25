import { Stars01 } from "@untitledui/icons";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { useCopilot } from "@/providers/copilot-provider";

export function CopilotTriggerButton() {
    const { t } = useTranslation("copilot");
    const { isOpen, setIsOpen } = useCopilot();

    return (
        <Button
            color="primary"
            size="sm"
            iconLeading={Stars01}
            className="shrink-0 shadow-md ring-1 ring-brand-600/25"
            aria-expanded={isOpen}
            aria-controls="ai-copilot-panel"
            onClick={() => setIsOpen(!isOpen)}
        >
            {t("trigger")}
        </Button>
    );
}
