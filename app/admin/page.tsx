import AdminClient from './AdminClient';

export default function AdminPage() {
  return (
    <main className="shell">
      <section className="card adminCard">
        <div className="badge">v7.2 · Authorization Admin</div>
        <h1>授权管理后台</h1>
        <p className="muted">新授权码会加密保存，管理员登录后可随时查看、暂停、恢复、撤销、重置设备或永久删除。</p>
        <AdminClient />
        <div className="links"><a href="/status">返回状态页</a></div>
      </section>
    </main>
  );
}
