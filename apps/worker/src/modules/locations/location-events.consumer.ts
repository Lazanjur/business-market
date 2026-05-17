import { Injectable } from "@nestjs/common";
import { PostcardDispatchWorker } from "./postcard-dispatch.worker";
import { LocationSearchProjectionWorker } from "./location-search-projection.worker";
import { GeocodeReviewWorker } from "./geocode-review.worker";

@Injectable()
export class LocationEventsConsumer {
  constructor(
    private readonly postcardDispatchWorker: PostcardDispatchWorker,
    private readonly locationSearchProjectionWorker: LocationSearchProjectionWorker,
    private readonly geocodeReviewWorker: GeocodeReviewWorker
  ) {}

  async consume(eventName: string, payload: { locationId: string; requestId?: string }) {
    switch (eventName) {
      case "location.created":
      case "location.updated":
      case "location.geocoded":
      case "location.verified":
      case "location.visibility_changed":
        await this.locationSearchProjectionWorker.handle({ locationId: payload.locationId });
        return { processed: true, eventName };
      case "location.verification_requested":
        if (payload.requestId) {
          await this.postcardDispatchWorker.handle({ requestId: payload.requestId });
        }
        return { processed: true, eventName };
      case "location.geocode_failed":
        await this.geocodeReviewWorker.handle({
          locationId: payload.locationId,
          reason: "Location geocoder confidence below threshold"
        });
        return { processed: true, eventName };
      default:
        return { processed: false, eventName };
    }
  }
}
