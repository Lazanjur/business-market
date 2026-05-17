import { Controller, Get } from "@nestjs/common";
import { SecurityService } from "./security.service";

@Controller("api/v1/platform/security")
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get("baseline")
  getBaseline() {
    return this.securityService.getProductionBaseline();
  }

  @Get("incident-readiness")
  getIncidentReadiness() {
    return this.securityService.getIncidentReadiness();
  }
}
