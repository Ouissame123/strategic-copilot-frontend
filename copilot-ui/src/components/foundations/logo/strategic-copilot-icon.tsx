import type { SVGProps } from "react";
import { Compass } from "lucide-react";
import { cx } from "@/utils/cx";

/**
 * Icône du logo Copilote Stratégique : boussole (lucide Compass) en teal brand.
 */
export const StrategicCopilotIcon = (props: SVGProps<SVGSVGElement>) => {
    const { className, ...rest } = props;

    return (
        <Compass
            aria-hidden
            strokeWidth={2}
            {...rest}
            className={cx("shrink-0 text-[#0F6E56]", className)}
        />
    );
};
