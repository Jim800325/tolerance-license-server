export default function AdminPage() {
  return (
    <main className="shell">
      <section className="card">
        <div className="badge">Admin · Phase 1</div>
        <h1>授权管理后台</h1>
        <p>后台基础路由已经部署成功。</p>
        <p className="muted">下一阶段连接 Neon Postgres 后，再加入登录、授权生成、有效期、设备数量、撤销和设备重置。</p>
        <div className="links"><a href="/">返回状态页</a></div>
      </section>
    </main>
  );
}
