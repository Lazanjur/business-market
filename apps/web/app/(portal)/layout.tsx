export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      {children}
    </main>
  );
}
