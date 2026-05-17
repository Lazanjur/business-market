import { MapShell } from "../map-shell";

export function SupplierMapIntelligence({
  pins,
  clusters,
  coverageRings,
  riskNotes
}: {
  pins: Array<{
    entityId: string;
    entityName: string;
    locationId: string;
    locationType: string;
    city: string;
    countryCode: string;
    lat: number;
    lng: number;
    distanceKm?: number;
    trustScore?: number;
  }>;
  clusters: Array<{
    id: string;
    count: number;
    lat: number;
    lng: number;
    locationTypes: readonly string[];
    countryCodes: readonly string[];
  }>;
  coverageRings: Array<{
    id: string;
    centerLat: number;
    centerLng: number;
    radiusKm: number;
    label: string;
  }>;
  riskNotes: readonly string[];
}) {
  return (
    <div className="stack">
      <div className="card">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Buyer-side discovery</div>
            <h2>Radius search, viewport clustering, and delivery overlays</h2>
          </div>
          <span className="badge badge-teal">Location v4.1</span>
        </div>

        <div className="form-grid compact">
          <label>
            <span>Buyer location</span>
            <input defaultValue="Brussels, BE" />
          </label>
          <label>
            <span>Radius</span>
            <input defaultValue="250 km" />
          </label>
          <label>
            <span>Category</span>
            <input defaultValue="Industrial Components" />
          </label>
          <label>
            <span>Location type</span>
            <select defaultValue="warehouse">
              <option value="warehouse">Warehouse</option>
              <option value="operational_hq">Operational HQ</option>
              <option value="delivery_hub">Delivery hub</option>
              <option value="showroom">Showroom</option>
            </select>
          </label>
        </div>

        <MapShell pins={pins} clusters={clusters} coverageRings={coverageRings} />
      </div>

      <section className="grid-2">
        <div className="card">
          <div className="eyebrow">Distance-sorted shortlist</div>
          <div className="supplier-list">
            {pins.map((pin) => (
              <article className="supplier-card" key={pin.locationId}>
                <div>
                  <strong>{pin.entityName}</strong>
                  <span>
                    {pin.city}, {pin.countryCode} · {pin.locationType.replaceAll("_", " ")}
                  </span>
                </div>
                <div className="supplier-right">
                  <span>{pin.distanceKm} km</span>
                  <span className="badge badge-success">Trust {pin.trustScore}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">Privacy guardrails</div>
          <h3>Geo-search respects disclosure precision</h3>
          <div className="supplier-list">
            {riskNotes.map((note) => (
              <article className="supplier-card" key={note}>
                <strong>{note}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
