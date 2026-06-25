import { describe, expect, it } from "vitest";
import { classifySource } from "./classifySource";

describe("classifySource", () => {
    it("classe Strategist depuis payload", () => {
        expect(classifySource({ payload: { source: "WF_Strategist" } })).toBe("strategist");
    });

    it("classe Watchdog", () => {
        expect(classifySource({ payload: { source: "rh_risks_watchdog" } })).toBe("watchdog");
    });

    it("fallback Manager si manager_id et pas source", () => {
        expect(classifySource({ manager_id: "uuid", payload: {} })).toBe("manager");
    });
});
