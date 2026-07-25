import {
    Label as AriaLabel,
    Slider as AriaSlider,
    SliderOutput as AriaSliderOutput,
    SliderThumb as AriaSliderThumb,
    SliderTrack as AriaSliderTrack,
} from "react-aria-components";
import { cx } from "@/utils/cx";
import {
    SCORE_SLIDER_MAX,
    SCORE_SLIDER_MIN,
    SCORE_SLIDER_STEP,
    SCORE_SLIDER_TICKS,
} from "./talent-opportunities-ui";

type ScoreSliderProps = {
    value: number;
    onChange: (value: number) => void;
    displayedCount: number;
    className?: string;
};

export function ScoreSlider({ value, onChange, displayedCount, className }: ScoreSliderProps) {
    const countLabel =
        displayedCount === 1
            ? "1 opportunité affichée"
            : `${displayedCount} opportunités affichées`;

    return (
        <div className={cx("rounded-lg border border-secondary/60 bg-primary px-3 py-3 shadow-sm dark:border-secondary/60 dark:bg-primary", className)}>
            <AriaSlider
                minValue={SCORE_SLIDER_MIN}
                maxValue={SCORE_SLIDER_MAX}
                step={SCORE_SLIDER_STEP}
                value={value}
                onChange={(v) => onChange(Number(v))}
                className="w-full max-w-md"
                aria-label="Score minimum"
                formatOptions={{ style: "decimal", minimumFractionDigits: 1, maximumFractionDigits: 1 }}
            >
                <AriaLabel className="mb-3 block text-sm font-medium text-primary">
                    Score minimum : {value.toFixed(1)}/10
                </AriaLabel>

                <div className="relative pt-7 pb-1">
                    <AriaSliderTrack className="relative h-6 w-full">
                        {({ state }) => {
                            const pct = state.getThumbPercent(0);
                            return (
                                <>
                                    <span
                                        className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-gray-200 dark:bg-gray-700"
                                        aria-hidden
                                    />
                                    <span
                                        className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-brand-solid"
                                        style={{ left: 0, width: `${pct * 100}%` }}
                                        aria-hidden
                                    />
                                    <AriaSliderThumb
                                        index={0}
                                        className={({ isFocusVisible, isDragging }) =>
                                            cx(
                                                "top-1/2 box-border size-5 cursor-grab rounded-full bg-slider-handle-bg shadow-md ring-2 ring-slider-handle-border ring-inset",
                                                isFocusVisible && "outline-2 outline-offset-2 outline-focus-ring",
                                                isDragging && "cursor-grabbing",
                                            )
                                        }
                                    >
                                        <AriaSliderOutput className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary shadow-md ring-1 ring-secondary dark:bg-primary dark:ring-secondary">
                                            {value.toFixed(1)}
                                        </AriaSliderOutput>
                                    </AriaSliderThumb>
                                </>
                            );
                        }}
                    </AriaSliderTrack>

                    <div className="relative mt-1 h-4 w-full" aria-hidden>
                        {SCORE_SLIDER_TICKS.map((tick) => {
                            const left =
                                ((tick - SCORE_SLIDER_MIN) / (SCORE_SLIDER_MAX - SCORE_SLIDER_MIN)) * 100;
                            return (
                                <span
                                    key={tick}
                                    className="absolute top-0 -translate-x-1/2 text-[10px] tabular-nums text-quaternary"
                                    style={{ left: `${left}%` }}
                                >
                                    {tick}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </AriaSlider>

            <p className="mt-1 text-sm text-tertiary" aria-live="polite">
                {countLabel}
            </p>
        </div>
    );
}
