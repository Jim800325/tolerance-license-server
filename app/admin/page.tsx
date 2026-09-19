import AdminClient from './AdminClient';

export default function AdminPage() {
  return (
    <main className="shell">
      <section className="card adminCard">
        <div className="badge">v7.0 · Authorization Admin</div>
        <h1>授权管理后台</h1>
        <p className="muted">完整授权码只在创建时返回一次；数据库仅保存 HMAC 哈希和前缀。</p>
        <AdminClient />
        <div className="links"><a href="/">返回状态页</a></div>
      </section>
    </main>
  );
}
