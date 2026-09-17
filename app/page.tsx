export default function Home() {
  return (
    <main className="shell">
      <section className="card">
        <div className="badge">v7.0 · Phase 1</div>
        <h1>Tolerance License Server</h1>
        <p>智能公差计算器授权服务器骨架已经运行。</p>
        <div className="status"><span /> Server online</div>
        <p className="muted">本阶段尚未连接数据库，也没有修改稳定的 v6.1.7 计算逻辑。</p>
        <div className="links">
          <a href="/admin">Admin</a>
          <a href="/api/health">API Health</a>
        </div>
      </section>
    </main>
  );
}
