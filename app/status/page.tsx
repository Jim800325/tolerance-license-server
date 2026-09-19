export default function StatusPage() {
  return (
    <main className="shell">
      <section className="card">
        <div className="badge">v7.2 · Authorization Server</div>
        <h1>授权服务状态</h1>
        <p className="muted">智能公差计算器在线授权服务正在运行。</p>
        <div className="status"><span />服务已部署</div>
        <div className="links">
          <a href="/calculator.html">打开智能公差计算器 v7.2</a>
          <a href="/admin">授权管理后台</a>
          <a href="/api/health">API 健康检查</a>
          <a href="/api/db-health">数据库健康检查</a>
        </div>
      </section>
    </main>
  );
}
