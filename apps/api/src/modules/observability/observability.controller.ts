import { Controller, Get } from "@nestjs/common";
import { ObservabilityService } from "./observability.service";

@Controller("api/v1/platform/observability")
export class ObservabilityController {
  constructor(private readonly observabilityService: ObservabilityService) {}

  @Get("performance-budget")
  getPerformanceBudget() {
    return this.observabilityService.getPerformanceBudget();
  }

  @Get("release-gate")
  getReleaseGate() {
    return this.observabilityService.getReleaseGate();
  }
}
