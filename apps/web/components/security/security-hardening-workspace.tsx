export function SecurityHardeningWorkspace() {
  const controls = [
    "Rate limiting and abuse controls",
    "Secrets rotation and provider credential hygiene",
    "Dual enforcement for location privacy responses",
    "Immutable audit trails for sensitive actions",
    "Incident response readiness"
  ];

  return (
    <section>
      <h1>Production security hardening</h1>
      <ul>
        {controls.map((control) => (
          <li key={control}>{control}</li>
        ))}
      </ul>
    </section>
  );
}
