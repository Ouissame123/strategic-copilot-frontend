import { LayoutDashboard, Rows3 } from "lucide-react";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { cx } from "@/utils/cx";
import type { TalentProjectsDensity } from "./talent-projects-ui";

type TalentProjectsDensityToggleProps = {
    density: TalentProjectsDensity;
    onToggle: () => void;
};

export function TalentProjectsDensityToggle({ density, onToggle }: TalentProjectsDensityToggleProps) {
    const isCompact = density === "compact";
    return (
        <Tooltip title={isCompact ? "Vue confortable" : "Vue dense"} delay={300}>
            <TooltipTrigger
                type="button"
                onClick={onToggle}
                className={cx(
                    "flex size-9 items-center justify-center rounded-lg border border-secondary bg-primary text-tertiary transition hover:bg-secondary_subtle hover:text-primary",
                )}
                aria-label={isCompact ? "Passer en vue confortable" : "Passer en vue dense"}
            >
                {isCompact ? <LayoutDashboard className="size-4" /> : <Rows3 className="size-4" />}
            </TooltipTrigger>
        </Tooltip>
    );
}
