import { Injectable } from "@nestjs/common";

@Injectable()
export class ObservabilityService {
  getPerformanceBudget() {
    return {
      apiP95Ms: 300,
      searchP95Ms: 450,
      geoSearchP95Ms: 700,
      chatRealtimeLagMs: 150,
      errorBudgetPercent: 0.5,
      currentStatus: "warning"
    };
  }

  getReleaseGate() {
    return {
      requires: [
        "security posture score >= 80",
        "no critical incident open",
        "SLO error budget not exhausted",
        "migration dry-run successful",
        "dead-letter queue backlog below threshold"
      ]
    };
  }
}
