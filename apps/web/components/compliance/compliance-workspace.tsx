
const caseRows = [
  {
    title: "Premium tier upgrade",
    status: "in_review",
    provider: "Creditsafe + Onfido + ComplyAdvantage",
    note: "Director identity and UBO declarations still pending"
  },
  {
    title: "Warehouse reverification",
    status: "pending_user",
    provider: "Manual ops + document review",
    note: "New lease agreement requested after address change"
  },
  {
    title: "Quarterly sanctions refresh",
    status: "approved",
    provider: "ComplyAdvantage",
    note: "No unresolved hits"
  }
];

const owners = [
  { name: "Maja Novak", ownership: "52%", country: "HR", flags: "Control person" },
  { name: "Tom Fischer", ownership: "28%", country: "DE", flags: "Director" },
  { name: "HoldCo Benelux B.V.", ownership: "20%", country: "NL", flags: "Corporate shareholder" }
];

const tasks = [
  { title: "Review UBO declaration", priority: "High", eta: "Today", owner: "Compliance Ops" },
  { title: "Validate director selfie match", priority: "Normal", eta: "Within 24h", owner: "Onfido webhook" },
  { title: "Approve utility bill evidence", priority: "Normal", eta: "Within 24h", owner: "Compliance analyst" }
];

const controls = [
  "Creditsafe for EU entities; Companies House for UK entities.",
  "Onfido used for director or authorised-officer identity checks.",
  "ComplyAdvantage screening on entity, officers, and beneficial owners.",
  "Manual review queue for ambiguous matches, sole traders, and document exceptions.",
  "Reverification scheduling tied to risk level, address change, and ownership changes."
];

export function ComplianceWorkspace() {
  return (
    <div className="page-shell section-stack">
      <div className="page-header">
        <div>
          <h1>Compliance orchestration workspace</h1>
          <p>
            Run KYB and KYC checks, maintain beneficial ownership evidence, resolve sanctions matches,
            and track reverification obligations for verified-only B2B and B2G access.
          </p>
        </div>
        <div className="badge-row">
          <span className="badge">Block 4</span>
          <span className="badge">Creditsafe / Companies House</span>
          <span className="badge">Onfido / ComplyAdvantage</span>
        </div>
      </div>

      <div className="grid cols-3">
        <section className="card">
          <div className="muted">Open compliance cases</div>
          <div className="kpi">5</div>
          <span className="pill warn">2 blocking review tasks</span>
        </section>
        <section className="card">
          <div className="muted">Beneficial owners declared</div>
          <div className="kpi">3</div>
          <span className="pill info">1 director identity check outstanding</span>
        </section>
        <section className="card">
          <div className="muted">Sanctions status</div>
          <div className="kpi">Clear</div>
          <span className="pill good">Last screened 18 minutes ago</span>
        </section>
      </div>

      <div className="grid cols-2">
        <section className="card">
          <h2>Case pipeline</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Case</th>
                <th>Status</th>
                <th>Routing</th>
              </tr>
            </thead>
            <tbody>
              {caseRows.map((row) => (
                <tr key={row.title}>
                  <td>
                    <strong>{row.title}</strong>
                    <div className="muted">{row.note}</div>
                  </td>
                  <td>{row.status}</td>
                  <td>{row.provider}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card">
          <h2>Review queue</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Priority</th>
                <th>ETA</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.title}>
                  <td>
                    <strong>{task.title}</strong>
                    <div className="muted">{task.owner}</div>
                  </td>
                  <td>{task.priority}</td>
                  <td>{task.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <div className="grid cols-2">
        <section className="card">
          <h2>Beneficial ownership register</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Ownership</th>
                <th>Country</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((owner) => (
                <tr key={owner.name}>
                  <td>
                    <strong>{owner.name}</strong>
                    <div className="muted">{owner.flags}</div>
                  </td>
                  <td>{owner.ownership}</td>
                  <td>{owner.country}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card">
          <h2>Control design</h2>
          <ul className="list">
            {controls.map((control) => (
              <li key={control}>{control}</li>
            ))}
          </ul>
          <div className="note" style={{ marginTop: 16 }}>
            Sole traders remain on the strictest privacy path. Their home-linked addresses must never be promoted
            to public street-level visibility by a compliance side effect.
          </div>
        </section>
      </div>
    </div>
  );
}
