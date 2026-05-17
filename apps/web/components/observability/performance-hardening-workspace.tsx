export function PerformanceHardeningWorkspace() {
  const items = [
    "API and geo-search performance budgets",
    "Dead-letter and retry backlog thresholds",
    "Release gates for error budget burn",
    "Queue and provider health monitoring",
    "Capacity planning for procurement, chat, and search"
  ];

  return (
    <section>
      <h1>Performance hardening</h1>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
