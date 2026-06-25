import { describe, expect, it } from "vitest";
import {
    countRecommendationTypes,
    getRecommendationConfig,
    normalizeRecommendationType,
} from "./recommendation-mapping";

describe("recommendation-mapping", () => {
    it("mappe redeploy PDF strict", () => {
        expect(normalizeRecommendationType("redeploy")).toBe("redeploy");
        expect(getRecommendationConfig("redeploy").label).toBe("Redéploiement");
    });

    it("mappe legacy recommended → redeploy", () => {
        expect(normalizeRecommendationType("recommended")).toBe("redeploy");
    });

    it("fallback recruitment si valeur inconnue", () => {
        expect(normalizeRecommendationType("unknown_future")).toBe("recruitment");
    });

    it("compte les 4 types", () => {
        const counts = countRecommendationTypes([
            { recommendation_type: "redeploy" },
            { recommendation_type: "recruitment" },
            { recommendation_type: "recruitment" },
        ]);
        expect(counts.redeploy).toBe(1);
        expect(counts.recruitment).toBe(2);
    });
});
