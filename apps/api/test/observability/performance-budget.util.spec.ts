import { isBudgetBreached, summarizeBudgetStatus } from "../../src/modules/observability/policies/performance-budget.util";

describe("performance-budget.util", () => {
  it("detects breach", () => {
    expect(isBudgetBreached(350, 300)).toBe(true);
  });

  it("summarizes status", () => {
    expect(summarizeBudgetStatus([{ actual: 100, budget: 300 }, { actual: 500, budget: 300 }])).toBe("failing");
  });
});
