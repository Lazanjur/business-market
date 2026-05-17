export type SecurityControlState = "implemented" | "planned" | "missing";

export function calculateSecurityPostureScore(states: SecurityControlState[]): number {
  if (!states.length) return 0;
  const score = states.reduce((sum, state) => {
    if (state === "implemented") return sum + 100;
    if (state === "planned") return sum + 50;
    return sum;
  }, 0);
  return Math.round(score / states.length);
}

export function requiresProductionBlocker(states: SecurityControlState[]): boolean {
  return states.includes("missing");
}
