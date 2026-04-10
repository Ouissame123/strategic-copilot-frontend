import type { HTMLAttributes } from "react";
import { cx } from "@/utils/cx";
import { StrategicCopilotIcon } from "./strategic-copilot-icon";

const PROJECT_NAME = "Strategic Copilot";

export const ProjectLogo = (props: HTMLAttributes<HTMLDivElement>) => {
    return (
        <div {...props} className={cx("flex h-8 w-max items-center justify-start gap-2 overflow-visible", props.className)}>
            <StrategicCopilotIcon className="size-8" />
            <span className="text-lg font-semibold text-primary">{PROJECT_NAME}</span>
        </div>
    );
};
