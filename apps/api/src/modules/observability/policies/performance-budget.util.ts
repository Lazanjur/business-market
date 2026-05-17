export function isBudgetBreached(actual: number, budget: number): boolean {
  return actual > budget;
}

export function summarizeBudgetStatus(metrics: Array<{ actual: number; budget: number }>): "healthy" | "warning" | "failing" {
  const breaches = metrics.filter((metric) => isBudgetBreached(metric.actual, metric.budget)).length;
  if (breaches === 0) return "healthy";
  if (breaches < metrics.length / 2) return "warning";
  return "failing";
}
