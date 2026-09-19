export default function HomePage() {
  return (
    <main style={{ position: 'fixed', inset: 0, margin: 0, padding: 0, background: '#0f172a' }}>
      <iframe
        src="/calculator.html"
        title="智能公差计算器 v7.2"
        style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
      />
    </main>
  );
}
