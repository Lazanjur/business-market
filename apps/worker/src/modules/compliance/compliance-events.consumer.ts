import { Injectable } from "@nestjs/common";
import { RegistryScreeningWorker } from "./registry-screening.worker";
import { IdentityVerificationWorker } from "./identity-verification.worker";
import { SanctionsScreeningWorker } from "./sanctions-screening.worker";

@Injectable()
export class ComplianceEventsConsumer {
  constructor(
    private readonly registryScreeningWorker: RegistryScreeningWorker,
    private readonly identityVerificationWorker: IdentityVerificationWorker,
    private readonly sanctionsScreeningWorker: SanctionsScreeningWorker
  ) {}

  async consume(eventName: string, payload: { caseId: string }) {
    switch (eventName) {
      case "compliance.case_opened":
      case "compliance.reverification.requested":
        await this.registryScreeningWorker.handle(payload);
        await this.identityVerificationWorker.handle(payload);
        await this.sanctionsScreeningWorker.handle(payload);
        return { processed: true, eventName };
      case "compliance.document_submitted":
      case "compliance.case_reviewed":
        return { processed: true, eventName, deferredToAnalyst: true };
      default:
        return { processed: false, eventName };
    }
  }
}
