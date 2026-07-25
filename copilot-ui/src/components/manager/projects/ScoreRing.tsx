import { clamp, fmtScore } from "./projects-list-ui";



type ScoreRingProps = {

    value: number | null | undefined;

    size?: number;

    /** Couleur anneau + texte (ex. selon décision Copilot). */

    strokeColor?: string;

    trackColor?: string;

};



export function ScoreRing({ value, size = 44, strokeColor, trackColor = "#f1f5f9" }: ScoreRingProps) {

    const color = strokeColor ?? "#94a3b8";

    const r = size / 2 - 5;

    const c = 2 * Math.PI * r;

    const pct = value != null ? clamp(value / 10, 0, 1) : 0;

    const label = fmtScore(value) ?? "—";



    return (

        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0" aria-hidden>

            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={4} />

            <circle

                cx={size / 2}

                cy={size / 2}

                r={r}

                fill="none"

                stroke={color}

                strokeWidth={4}

                strokeDasharray={c}

                strokeDashoffset={c * (1 - pct)}

                strokeLinecap="round"

            />

            <text

                x="50%"

                y="50%"

                dominantBaseline="middle"

                textAnchor="middle"

                transform={`rotate(90 ${size / 2} ${size / 2})`}

                style={{ font: `700 ${size * 0.22}px Inter, sans-serif`, fill: color }}

            >

                {label}

            </text>

        </svg>

    );

}


