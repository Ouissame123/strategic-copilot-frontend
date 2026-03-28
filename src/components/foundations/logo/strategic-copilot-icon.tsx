import type { SVGProps } from "react";
import { useId } from "react";
import { cx } from "@/utils/cx";

/**
 * Icône du logo Strategic Copilot : bouclier arrondi avec flèche de direction (stratégie / pilotage).
 * Utilise les couleurs brand du thème (dégradé violet).
 */
export const StrategicCopilotIcon = (props: SVGProps<SVGSVGElement>) => {
    const id = useId();

    return (
        <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
            className={cx("shrink-0", props.className)}
        >
            <defs>
                <linearGradient id={`sc-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#53389E" />
                    <stop offset="100%" stopColor="#6941C6" />
                </linearGradient>
                <filter id={`sc-shadow-${id}`} x="-15%" y="-15%" width="130%" height="130%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.12" />
                </filter>
            </defs>
            {/* Cercle principal (cible / stratégie) */}
            <circle
                cx="16"
                cy="16"
                r="14"
                fill={`url(#sc-gradient-${id})`}
                filter={`url(#sc-shadow-${id})`}
            />
            {/* Flèche vers le haut (pilotage / objectif) */}
            <path
                d="M16 9l4.5 8h-3v6h-3v-6h-3L16 9z"
                fill="white"
                fillOpacity="0.95"
            />
        </svg>
    );
};
