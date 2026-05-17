const profileHighlights = [
  { label: "Profile completeness", value: "84%", note: "3 fields still required before public publishing" },
  { label: "Trust score", value: "78", note: "+6 after the latest ISO 9001 renewal" },
  { label: "Verified certifications", value: "4", note: "ISO 9001, ISO 14001, CE, REACH" },
  { label: "Procurement-ready units", value: "3", note: "Rotterdam, Zagreb, London authority desk" }
];

const units = [
  {
    name: "Central Procurement",
    type: "procurement",
    country: "NL",
    owner: "Tom Fischer",
    eligibility: "eligible"
  },
  {
    name: "Benelux Sales",
    type: "sales",
    country: "BE",
    owner: "Amelie Laurent",
    eligibility: "supporting"
  },
  {
    name: "UK Public Sector Desk",
    type: "authority_department",
    country: "GB",
    owner: "Maja Novak",
    eligibility: "eligible"
  }
];

const certifications = [
  {
    name: "ISO 9001",
    status: "verified",
    expires: "2027-02-12",
    issuer: "TUV Rheinland"
  },
  {
    name: "ISO 14001",
    status: "verified",
    expires: "2026-11-01",
    issuer: "SGS"
  },
  {
    name: "Cyber Essentials",
    status: "pending",
    expires: "awaiting review",
    issuer: "IASME"
  }
];

const trustBreakdown = [
  { label: "KYB verified", points: "+25" },
  { label: "Premium verification tier", points: "+12" },
  { label: "Profile completeness", points: "+15" },
  { label: "Verified locations", points: "+6" },
  { label: "Team depth", points: "+4" }
];

export function OrganizationWorkspace() {
  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Block 3 · Entity and organization management</div>
            <h1 className="text-3xl font-semibold text-slate-950">Organization governance workspace</h1>
            <p className="max-w-3xl text-sm text-slate-600">
              Maintain your legal entity profile, assign internal units, govern authority-specific data, and keep the marketplace trust score auditable.
            </p>
          </div>
          <div className="grid gap-2 text-sm text-slate-700">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">Entity type: <strong>private_company</strong></div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">Regulatory regime: <strong>eu</strong></div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">Public profile: <strong>members_only</strong></div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {profileHighlights.map((item) => (
          <article key={item.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{item.value}</div>
            <p className="mt-2 text-sm text-slate-600">{item.note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Entity profile</h2>
              <p className="mt-1 text-sm text-slate-600">Company profile data drives storefront quality, procurement eligibility, and trust score uplift.</p>
            </div>
            <button className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Edit profile</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-950">Display name</div>
              <div>Alpine Components Europe</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-950">Website</div>
              <div>https://alpine-components.eu</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-950">Coverage countries</div>
              <div>NL, BE, DE, FR, SI, HR</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-950">Supported languages</div>
              <div>English, Dutch, German, Croatian</div>
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Trust score breakdown</h2>
          <div className="mt-4 space-y-3">
            {trustBreakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <span>{item.label}</span>
                <strong className="text-slate-950">{item.points}</strong>
              </div>
            ))}
          </div>
          <button className="mt-5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
            Recalculate trust score
          </button>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Organization units</h2>
              <p className="mt-1 text-sm text-slate-600">Model procurement, sales, compliance, and regional teams with procurement eligibility flags.</p>
            </div>
            <button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Add unit</button>
          </div>
          <div className="space-y-4">
            {units.map((unit) => (
              <article key={unit.name} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-950">{unit.name}</h3>
                    <p className="text-sm text-slate-500">Owner: {unit.owner}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{unit.type}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{unit.country}</span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{unit.eligibility}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Certifications and evidence</h2>
              <p className="mt-1 text-sm text-slate-600">Verified certifications improve procurement eligibility and trust score confidence.</p>
            </div>
            <button className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Upload certificate</button>
          </div>
          <div className="space-y-4">
            {certifications.map((certification) => (
              <article key={certification.name} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-950">{certification.name}</h3>
                    <p className="text-sm text-slate-500">Issuer: {certification.issuer}</p>
                    <p className="mt-1 text-sm text-slate-500">Expires: {certification.expires}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                    {certification.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
